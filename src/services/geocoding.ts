// Small wrapper around Google's Geocoding REST API. Used by the MapPicker
// stretch feature to reverse-geocode the pin location into an address that
// the Civic Info API can consume.

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json'

export interface ReverseGeocodeResult {
  formattedAddress: string
  streetAddress: string
  isChicago: boolean
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult | null> {
  if (!apiKey) return null

  const url = new URL(GEOCODE_ENDPOINT)
  url.searchParams.set('latlng', `${lat},${lng}`)
  url.searchParams.set('key', apiKey)
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
    isChicago: city?.toLowerCase() === 'chicago'
  }
}
