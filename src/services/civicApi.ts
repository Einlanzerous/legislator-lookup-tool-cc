import type {
  CivicApiOffice,
  CivicApiOfficial,
  CivicApiResponse,
  LookupResult,
  RepCategory,
  RepGroup,
  Representative
} from '../types'

const CIVIC_ENDPOINT =
  'https://www.googleapis.com/civicinfo/v2/representatives'

// Channel type -> URL builder for the three networks the API commonly returns.
const SOCIAL_URL: Record<string, (id: string) => string> = {
  Facebook: (id) => `https://facebook.com/${id}`,
  Twitter: (id) => `https://twitter.com/${id}`,
  YouTube: (id) => `https://youtube.com/${id}`
}

export class CivicApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly hint?: string
  ) {
    super(message)
    this.name = 'CivicApiError'
  }
}

/**
 * Fetch representatives for a Chicago street address.
 *
 * The user only types a street address; we append ", Chicago, IL" before
 * hitting Google. Results are categorized into the five display groups
 * (Alderman → State Senate → State House → US Senate → US House) and
 * returned in that order. The US President and other executive roles are
 * filtered out — this tool is specifically about legislators + aldermen.
 */
export async function lookupRepresentatives(
  streetAddress: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<LookupResult> {
  const trimmed = streetAddress.trim()
  if (!trimmed) {
    throw new CivicApiError('Please enter an address.')
  }
  if (!apiKey) {
    throw new CivicApiError(
      'Civic API key is not configured.',
      undefined,
      'Set VITE_GOOGLE_CIVIC_API_KEY in .env.local and restart the dev server.'
    )
  }

  const fullAddress = appendChicago(trimmed)
  const url = new URL(CIVIC_ENDPOINT)
  url.searchParams.set('address', fullAddress)
  url.searchParams.set('key', apiKey)
  // Don't pass roles/levels — we want the full set and will filter locally,
  // because the Chicago Alderman doesn't always match a single role cleanly.

  let res: Response
  try {
    res = await fetch(url.toString(), { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new CivicApiError(
      'Network error contacting the Civic Information API.',
      undefined,
      'Check your internet connection and try again.'
    )
  }

  const data = (await res.json().catch(() => ({}))) as CivicApiResponse

  if (!res.ok || data.error) {
    const msg = data.error?.message || `Request failed (${res.status}).`
    let hint: string | undefined
    if (res.status === 400) hint = 'The address might not be recognized. Try adding a unit number or check for typos.'
    if (res.status === 403) hint = 'The Civic API key is missing, invalid, or restricted.'
    if (res.status === 404) hint = 'No representatives were found for that address.'
    throw new CivicApiError(msg, res.status, hint)
  }

  const groups = categorize(data.offices ?? [], data.officials ?? [])
  const normalizedAddress = formatNormalized(data) || fullAddress

  return { normalizedAddress, groups }
}

function appendChicago(address: string): string {
  const lower = address.toLowerCase()
  const hasChicago = lower.includes('chicago')
  const hasState = /\bil\b|illinois/.test(lower)
  if (hasChicago && hasState) return address
  if (hasChicago) return `${address}, IL`
  return `${address}, Chicago, IL`
}

function formatNormalized(data: CivicApiResponse): string {
  const n = data.normalizedInput
  if (!n) return ''
  return [n.line1, n.city, [n.state, n.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
}

function categorize(
  offices: CivicApiOffice[],
  officials: CivicApiOfficial[]
): RepGroup[] {
  const buckets: Record<RepCategory, Representative[]> = {
    alderman: [],
    stateSenate: [],
    stateHouse: [],
    usSenate: [],
    usHouse: []
  }
  // Keep a subtitle for the Alderman group since it encodes the ward number.
  let aldermanSubtitle: string | undefined

  for (const office of offices) {
    const category = classifyOffice(office)
    if (!category) continue

    if (category === 'alderman') {
      const ward = extractWard(office.name, office.divisionId)
      if (ward) aldermanSubtitle = `Ward ${ward}`
    }

    for (const idx of office.officialIndices) {
      const official = officials[idx]
      if (!official) continue
      buckets[category].push(toRepresentative(official, office))
    }
  }

  const order: Array<{ category: RepCategory; title: string; subtitle?: string }> = [
    { category: 'alderman', title: 'Ward Alderman', subtitle: aldermanSubtitle },
    { category: 'stateSenate', title: 'Illinois State Senate' },
    { category: 'stateHouse', title: 'Illinois State House' },
    { category: 'usSenate', title: 'U.S. Senate' },
    { category: 'usHouse', title: 'U.S. House of Representatives' }
  ]

  return order
    .map(({ category, title, subtitle }) => ({
      category,
      title,
      subtitle,
      reps: buckets[category]
    }))
    .filter((group) => group.reps.length > 0)
}

function classifyOffice(office: CivicApiOffice): RepCategory | null {
  const levels = new Set(office.levels ?? [])
  const roles = new Set(office.roles ?? [])
  const name = office.name.toLowerCase()

  // Ward Alderman — matches by name since Chicago's city council sits under
  // a locality level but also occasionally under administrativeArea2.
  const isAlderman =
    /\balder(man|woman|person)\b/.test(name) ||
    /\bcity council\b/.test(name) ||
    /ward \d+/.test(name)
  if (isAlderman && (levels.has('locality') || levels.has('administrativeArea2') || levels.size === 0)) {
    return 'alderman'
  }

  // Federal legislators — exclude the President/VP and any executive role.
  if (levels.has('country')) {
    if (roles.has('headOfGovernment') || roles.has('headOfState') || roles.has('deputyHeadOfGovernment')) {
      return null
    }
    if (roles.has('legislatorUpperBody')) return 'usSenate'
    if (roles.has('legislatorLowerBody')) return 'usHouse'
    return null
  }

  // State legislators (Illinois).
  if (levels.has('administrativeArea1')) {
    if (roles.has('legislatorUpperBody')) return 'stateSenate'
    if (roles.has('legislatorLowerBody')) return 'stateHouse'
    return null
  }

  return null
}

function extractWard(officeName: string, divisionId: string): string | null {
  const m1 = officeName.match(/ward\s*(\d+)/i)
  if (m1) return m1[1]
  const m2 = divisionId.match(/ward:(\d+)/i)
  if (m2) return m2[1]
  return null
}

function toRepresentative(
  o: CivicApiOfficial,
  office: CivicApiOffice
): Representative {
  const socials = (o.channels ?? [])
    .map((c) => {
      const build = SOCIAL_URL[c.type]
      if (!build) return null
      return { type: c.type, id: c.id, url: build(c.id) }
    })
    .filter((x): x is { type: string; id: string; url: string } => x !== null)

  return {
    id: `${office.divisionId}::${o.name}`,
    name: o.name,
    officeName: office.name,
    party: o.party,
    phone: o.phones?.[0],
    email: o.emails?.[0],
    website: o.urls?.[0],
    photoUrl: o.photoUrl,
    socials
  }
}
