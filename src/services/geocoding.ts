// Wrappers around the geocoding proxy Worker.
// reverseGeocode: used by MapPicker to turn a dragged pin into a street address.
// forwardGeocode: used by civicApi to resolve a typed address to lat/lng.

import { CivicApiError } from '../types'

const WORKER_URL = import.meta.env.VITE_WORKER_URL

export interface ReverseGeocodeResult {
  formattedAddress: string
  streetAddress: string
  isChicago: boolean
}

export interface ForwardGeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult | null> {
  if (!WORKER_URL) return null

  const url = new URL(`${WORKER_URL}/geocode`)
  url.searchParams.set('latlng', `${lat},${lng}`)
  url.searchParams.set('result_type', 'street_address')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) return null
  const data = await res.json()
  const top = data.results?.[0]
  if (!top) return null

  const components: Array<{ long_name: string; types: string[] }> =
    top.address_components ?? []
  const streetNumber = components.find((c) => c.types.includes('street_number'))?.long_name
  const route = components.find((c) => c.types.includes('route'))?.long_name
  const city = components.find((c) => c.types.includes('locality'))?.long_name

  const streetAddress = [streetNumber, route].filter(Boolean).join(' ')

  return {
    formattedAddress: top.formatted_address,
    streetAddress: streetAddress || top.formatted_address,
    isChicago: city?.toLowerCase() === 'chicago',
  }
}

export async function forwardGeocode(
  address: string,
  signal?: AbortSignal
): Promise<ForwardGeocodeResult> {
  const url = new URL(`${WORKER_URL}/geocode`)
  url.searchParams.set('address', address)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new CivicApiError(
      'Network error during address lookup.',
      undefined,
      'Check your internet connection and try again.'
    )
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok || data.status === 'REQUEST_DENIED') {
    const googleMsg: string = data.error_message ?? data.status ?? ''
    throw new CivicApiError(
      googleMsg ? `Google Maps API: ${googleMsg}` : 'Google Maps API error.',
      res.status,
      'Ensure the Geocoding API is enabled for your Google project.'
    )
  }

  if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
    throw new CivicApiError(
      'Address not found.',
      undefined,
      'Try adding a zip code or double-checking the street name.'
    )
  }

  const top = data.results[0]
  const loc = top.geometry?.location
  if (!loc) throw new CivicApiError('Could not determine coordinates for that address.')

  return { lat: loc.lat, lng: loc.lng, formattedAddress: top.formatted_address }
}
