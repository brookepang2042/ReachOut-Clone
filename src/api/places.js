/**
 * api/places.js
 * Wrapper around Google Places API (via fetch to our proxy or direct)
 * Uses the Places API Text Search + Place Details endpoints
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Provider type → Google Places search query mapping
export const PROVIDER_TYPES = {
  all: 'mental health therapist psychiatrist counselor',
  therapist: 'therapist psychologist counselor',
  psychiatrist: 'psychiatrist mental health clinic',
  crisis: 'crisis center mental health emergency',
  support_group: 'mental health support group community',
  rehab: 'rehabilitation center substance abuse treatment',
}

/**
 * Search for mental health providers near a lat/lng
 * @param {number} lat
 * @param {number} lng
 * @param {string} type - key from PROVIDER_TYPES
 * @param {number} radiusMeters - default 16km (~10 miles)
 * @returns {Promise<Place[]>}
 */
export async function searchProviders(lat, lng, type = 'all', radiusMeters = 16000) {
  const query = PROVIDER_TYPES[type] || PROVIDER_TYPES.all

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radiusMeters)
  url.searchParams.set('type', 'health')
  url.searchParams.set('key', GOOGLE_API_KEY)

  // NOTE: Direct browser calls to Places API require the key to have no HTTP referrer
  // restrictions, OR you use a backend proxy. For hackathon, direct call is fine.
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Places API error: ${res.status}`)
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API: ${data.status} — ${data.error_message || ''}`)
  }

  return (data.results || []).map(normalizePlace)
}

/**
 * Get detailed info for a single place (phone, website, opening hours, etc.)
 * @param {string} placeId
 * @returns {Promise<PlaceDetails>}
 */
export async function getPlaceDetails(placeId) {
  const fields = [
    'name', 'formatted_address', 'formatted_phone_number',
    'website', 'opening_hours', 'rating', 'user_ratings_total',
    'photos', 'price_level', 'reviews', 'url'
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

/**
 * Geocode a US address/zip/city string to lat/lng
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number, formatted: string}>}
 */
export async function geocodeAddress(address) {
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

/**
 * Get user's current location via browser Geolocation API
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error('Could not get your location. Please enter it manually.'))
    )
  })
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizePlace(raw) {
  return {
    id: raw.place_id,
    name: raw.name,
    address: raw.formatted_address || raw.vicinity,
    lat: raw.geometry?.location?.lat,
    lng: raw.geometry?.location?.lng,
    rating: raw.rating || null,
    reviewCount: raw.user_ratings_total || 0,
    openNow: raw.opening_hours?.open_now ?? null,
    priceLevel: raw.price_level ?? null, // 0–4, null = unknown
    photoRef: raw.photos?.[0]?.photo_reference || null,
    types: raw.types || [],
  }
}

function normalizeDetails(raw) {
  return {
    phone: raw.formatted_phone_number || null,
    website: raw.website || null,
    googleUrl: raw.url || null,
    hours: raw.opening_hours?.weekday_text || null,
    isOpenNow: raw.opening_hours?.open_now ?? null,
    rating: raw.rating || null,
    reviewCount: raw.user_ratings_total || 0,
    priceLevel: raw.price_level ?? null,
    reviews: (raw.reviews || []).slice(0, 3).map(r => ({
      author: r.author_name,
      text: r.text,
      rating: r.rating,
      time: r.relative_time_description,
    })),
  }
}

/**
 * Build a Google Places photo URL from a photo reference
 * @param {string} photoRef
 * @param {number} maxWidth
 */
export function getPhotoUrl(photoRef, maxWidth = 400) {
  if (!photoRef) return null
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`
}

/**
 * Convert Google price_level (0–4) to a human-readable label
 */
export function formatPriceLevel(level) {
  const labels = {
    0: 'Free',
    1: 'Low cost ($)',
    2: 'Moderate ($$)',
    3: 'Higher cost ($$$)',
    4: 'Premium ($$$$)',
  }
  return labels[level] ?? 'Cost unknown'
}
