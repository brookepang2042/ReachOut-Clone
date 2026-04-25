/**
 * src/api/places.ts
 * Google Places API wrapper — Text Search + Place Details + Geocoding.
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

if (!GOOGLE_API_KEY) {
  console.warn(
    'Missing VITE_GOOGLE_MAPS_API_KEY. Add it to .env.local and restart `npm run dev`.',
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProviderType = 'all' | 'therapist' | 'psychiatrist' | 'crisis' | 'support_group' | 'rehab'

export interface Place {
  id: string
  name: string
  address: string
  lat: number | undefined
  lng: number | undefined
  rating: number | null
  reviewCount: number
  openNow: boolean | null
  priceLevel: number | null
  photoRef: string | null
  types: string[]
}

export interface PlaceDetails {
  phone: string | null
  website: string | null
  googleUrl: string | null
  hours: string[] | null
  isOpenNow: boolean | null
  rating: number | null
  reviewCount: number
  priceLevel: number | null
  reviews: Array<{
    author: string
    text: string
    rating: number
    time: string
  }>
}

export interface GeocodeResult {
  lat: number
  lng: number
  formatted: string
}

// ─── Search query mapping ────────────────────────────────────────────────────

export const PROVIDER_TYPES: Record<ProviderType, string> = {
  all: 'mental health therapist psychiatrist counselor',
  therapist: 'therapist psychologist counselor',
  psychiatrist: 'psychiatrist mental health clinic',
  crisis: 'crisis center mental health emergency',
  support_group: 'mental health support group community',
  rehab: 'rehabilitation center substance abuse treatment',
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function searchProviders(
  lat: number,
  lng: number,
  type: ProviderType = 'all',
  radiusMeters = 16000,
): Promise<Place[]> {
  const query = PROVIDER_TYPES[type] || PROVIDER_TYPES.all

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radiusMeters))
  url.searchParams.set('type', 'health')
  url.searchParams.set('key', GOOGLE_API_KEY)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Places API error: ${res.status}`)
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API: ${data.status} — ${data.error_message || ''}`)
  }

  return (data.results || []).map(normalizePlace)
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const fields = [
    'name', 'formatted_address', 'formatted_phone_number',
    'website', 'opening_hours', 'rating', 'user_ratings_total',
    'photos', 'price_level', 'reviews', 'url',
  ].join(',')

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', fields)
  url.searchParams.set('key', GOOGLE_API_KEY)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Place Details API error: ${res.status}`)
  const data = await res.json()

  return normalizeDetails(data.result || {})
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address + ', USA')
  url.searchParams.set('components', 'country:US')
  url.searchParams.set('key', GOOGLE_API_KEY)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results.length) {
    throw new Error('Location not found. Try a city name, address, or ZIP code.')
  }

  const result = data.results[0]
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formatted: result.formatted_address,
  }
}

export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Could not get your location. Please enter it manually.')),
    )
  })
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizePlace(raw: any): Place {
  return {
    id: raw.place_id,
    name: raw.name,
    address: raw.formatted_address || raw.vicinity,
    lat: raw.geometry?.location?.lat,
    lng: raw.geometry?.location?.lng,
    rating: raw.rating || null,
    reviewCount: raw.user_ratings_total || 0,
    openNow: raw.opening_hours?.open_now ?? null,
    priceLevel: raw.price_level ?? null,
    photoRef: raw.photos?.[0]?.photo_reference || null,
    types: raw.types || [],
  }
}

function normalizeDetails(raw: any): PlaceDetails {
  return {
    phone: raw.formatted_phone_number || null,
    website: raw.website || null,
    googleUrl: raw.url || null,
    hours: raw.opening_hours?.weekday_text || null,
    isOpenNow: raw.opening_hours?.open_now ?? null,
    rating: raw.rating || null,
    reviewCount: raw.user_ratings_total || 0,
    priceLevel: raw.price_level ?? null,
    reviews: (raw.reviews || []).slice(0, 3).map((r: any) => ({
      author: r.author_name,
      text: r.text,
      rating: r.rating,
      time: r.relative_time_description,
    })),
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function getPhotoUrl(photoRef: string | null, maxWidth = 400): string | null {
  if (!photoRef) return null
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`
}

export function formatPriceLevel(level: number | null): string {
  const labels: Record<number, string> = {
    0: 'Free',
    1: 'Low cost ($)',
    2: 'Moderate ($$)',
    3: 'Higher cost ($$$)',
    4: 'Premium ($$$$)',
  }
  return level !== null && level in labels ? labels[level] : 'Cost unknown'
}

/** Haversine distance in miles between two coordinates. */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}