import type { LookupResult, RepCategory, RepGroup, Representative } from '../types'
import { CivicApiError } from '../types'
import { forwardGeocode } from './geocoding'

// ─── Endpoints ───────────────────────────────────────────────────────────────

const WORKER_URL = import.meta.env.VITE_WORKER_URL
const CHICAGO_WARDS_ENDPOINT = 'https://data.cityofchicago.org/resource/p293-wvbd.json'
const CHICAGO_ALDERMEN_ENDPOINT = 'https://data.cityofchicago.org/resource/htai-wnw4.json'

export { CivicApiError }

// ─── OpenStates types ─────────────────────────────────────────────────────────

interface OSCurrentRole {
  title: string
  org_classification: 'upper' | 'lower' | 'legislature' | 'executive' | 'government'
  district: string | number
  division_id: string
}

interface OSOffice {
  classification: string
  voice?: string
  fax?: string
  address?: string
  email?: string
}

interface OSLink {
  url: string
  note?: string
}

interface OSPerson {
  id: string
  name: string
  party: string
  image?: string
  email?: string
  current_role?: OSCurrentRole
  jurisdiction: {
    id: string
    name: string
    classification: string
  }
  offices?: OSOffice[]
  links?: OSLink[]
}

// ─── Chicago Data Portal types ────────────────────────────────────────────────

interface ChicagoWard {
  ward: string
}

interface ChicagoAlderman {
  ward: string
  alderman: string
  ward_phone?: string
  email?: string
  website?: string
  photo_link?: string
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Look up representatives for a Chicago street address.
 *
 * Combines three data sources (all API keys stay server-side in the Worker):
 *   - Geocoding proxy  → address → lat/lng
 *   - OpenStates proxy → state (IL) + federal legislators
 *   - Chicago Data Portal (public) → ward number + alderman contact info
 *
 * Returns groups in order: Alderman → IL Senate → IL House → US Senate → US House.
 * Groups with no results are omitted.
 */
export async function lookupRepresentatives(
  streetAddress: string,
  signal?: AbortSignal
): Promise<LookupResult> {
  const trimmed = streetAddress.trim()
  if (!trimmed) throw new CivicApiError('Please enter an address.')

  if (!WORKER_URL) {
    throw new CivicApiError(
      'Worker URL is not configured.',
      undefined,
      'Set VITE_WORKER_URL in .env.local and restart the dev server.'
    )
  }

  // Step 1: Resolve address to coordinates.
  const { lat, lng, formattedAddress } = await forwardGeocode(appendChicago(trimmed), signal)

  // Step 2: Fetch state/federal legislators and ward number in parallel.
  const [osPersons, wardNumber] = await Promise.all([
    fetchOpenStates(lat, lng, signal),
    fetchWardNumber(lat, lng, signal),
  ])

  // Step 3: Fetch alderman by ward (sequential — depends on ward number).
  const alderman = wardNumber ? await fetchAlderman(wardNumber, signal) : null

  return {
    normalizedAddress: formattedAddress,
    groups: buildGroups(osPersons, alderman, wardNumber),
  }
}

// ─── OpenStates (via Worker proxy) ───────────────────────────────────────────

async function fetchOpenStates(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<OSPerson[]> {
  const url = new URL(`${WORKER_URL}/openstates`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lng', String(lng))
  // Repeated `include` params per the OpenStates spec.
  url.searchParams.append('include', 'offices')
  url.searchParams.append('include', 'links')

  let res: Response
  try {
    res = await fetch(url.toString(), { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new CivicApiError(
      'Network error contacting OpenStates.',
      undefined,
      'Check your internet connection and try again.'
    )
  }

  const data = (await res.json().catch(() => ({}))) as { results?: OSPerson[]; detail?: string }

  if (!res.ok) {
    const msg = data.detail || `OpenStates API error (${res.status}).`
    const hint =
      res.status === 401 || res.status === 403
        ? 'Check the OPENSTATES_KEY Worker secret at dash.cloudflare.com.'
        : undefined
    throw new CivicApiError(msg, res.status, hint)
  }

  return data.results ?? []
}

// ─── Chicago Data Portal (public, no proxy needed) ───────────────────────────

async function fetchWardNumber(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  const url = new URL(CHICAGO_WARDS_ENDPOINT)
  // Socrata WKT: longitude comes first in POINT(lng lat).
  url.searchParams.set('$where', `intersects(the_geom, 'POINT (${lng} ${lat})')`)
  url.searchParams.set('$select', 'ward')
  url.searchParams.set('$limit', '1')

  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null
    const data: ChicagoWard[] = await res.json().catch(() => [])
    return data[0]?.ward ?? null
  } catch {
    return null
  }
}

async function fetchAlderman(
  ward: string,
  signal?: AbortSignal
): Promise<ChicagoAlderman | null> {
  const url = new URL(CHICAGO_ALDERMEN_ENDPOINT)
  url.searchParams.set('ward', ward)
  url.searchParams.set('$limit', '1')

  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null
    const data: ChicagoAlderman[] = await res.json().catch(() => [])
    return data[0] ?? null
  } catch {
    return null
  }
}

// ─── Categorization & mapping ─────────────────────────────────────────────────

function classifyPerson(person: OSPerson): RepCategory | null {
  const role = person.current_role
  if (!role) return null

  const jId = person.jurisdiction.id
  const isIllinois = jId.includes('/state:il/')
  // Federal: OCD ID has no /state:XX/ segment.
  const isFederal = !jId.includes('/state:')

  if (isIllinois) {
    if (role.org_classification === 'upper') return 'stateSenate'
    if (role.org_classification === 'lower') return 'stateHouse'
    return null
  }

  if (isFederal) {
    if (role.org_classification === 'upper') return 'usSenate'
    if (role.org_classification === 'lower') return 'usHouse'
    return null
  }

  return null
}

function personToRep(person: OSPerson): Representative {
  const phone = person.offices?.find((o) => o.voice)?.voice
  const email = person.email || person.offices?.find((o) => o.email)?.email
  const website = person.links?.[0]?.url

  const district = person.current_role?.district
  const title = person.current_role?.title ?? ''
  const officeName = district ? `${title} — District ${district}` : title

  return {
    id: person.id,
    name: person.name,
    officeName,
    party: person.party || undefined,
    phone,
    email,
    website,
    photoUrl: person.image || undefined,
    socials: [],
  }
}

function aldermanToRep(a: ChicagoAlderman, ward: string): Representative {
  // Dataset stores name as "LastName, FirstName" — normalize to "First Last".
  const name = a.alderman.includes(',')
    ? a.alderman.split(',').map((s) => s.trim()).reverse().join(' ')
    : a.alderman

  return {
    id: `chicago-ward-${ward}`,
    name,
    officeName: `Ward ${ward} Alderperson`,
    phone: a.ward_phone,
    email: a.email,
    website: a.website,
    photoUrl: a.photo_link,
    socials: [],
  }
}

function buildGroups(
  osPersons: OSPerson[],
  alderman: ChicagoAlderman | null,
  wardNumber: string | null
): RepGroup[] {
  const buckets: Record<RepCategory, Representative[]> = {
    alderman: [],
    stateSenate: [],
    stateHouse: [],
    usSenate: [],
    usHouse: [],
  }

  if (alderman && wardNumber) {
    buckets.alderman.push(aldermanToRep(alderman, wardNumber))
  }

  for (const person of osPersons) {
    const category = classifyPerson(person)
    if (category) buckets[category].push(personToRep(person))
  }

  const order: Array<{ category: RepCategory; title: string; subtitle?: string }> = [
    { category: 'alderman', title: 'Ward Alderperson', subtitle: wardNumber ? `Ward ${wardNumber}` : undefined },
    { category: 'stateSenate', title: 'Illinois State Senate' },
    { category: 'stateHouse', title: 'Illinois State House' },
    { category: 'usSenate', title: 'U.S. Senate' },
    { category: 'usHouse', title: 'U.S. House of Representatives' },
  ]

  return order
    .map(({ category, title, subtitle }) => ({
      category,
      title,
      subtitle,
      reps: buckets[category],
    }))
    .filter((g) => g.reps.length > 0)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendChicago(address: string): string {
  const lower = address.toLowerCase()
  const hasChicago = lower.includes('chicago')
  const hasState = /\bil\b|illinois/.test(lower)
  if (hasChicago && hasState) return address
  if (hasChicago) return `${address}, IL`
  return `${address}, Chicago, IL`
}
