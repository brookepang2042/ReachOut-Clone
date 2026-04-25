import { useState } from 'react'
import './App.css'

type OsmTags = Record<string, string | undefined>

type OsmElement = {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: {
    lat: number
    lon: number
  }
  tags?: OsmTags
}

type Clinic = {
  id: string
  name: string
  website?: string
  distanceMiles: number
  address: string
  phone?: string
  serviceLabel: string
  services: string[]
  hours?: string
  isOpenNow: boolean | null
  osmUrl: string
}

type GeocodeResult = {
  lat: string
  lon: string
  display_name: string
}

type NominatimPlaceResult = GeocodeResult & {
  osm_type: 'node' | 'way' | 'relation'
  osm_id: number
  name?: string
  type?: string
  category?: string
  display_name: string
  address?: Record<string, string | undefined>
  extratags?: OsmTags
}

const fallbackClinic: Clinic = {
  id: 'fallback-bmc-cbhc',
  name: 'Boston Medical Center CBHC',
  website: 'https://www.bmc.org/cbhc',
  distanceMiles: 1.2,
  address: '850 Harrison Avenue, Boston, MA',
  phone: '(617) 414-5470',
  serviceLabel: 'Mental health services',
  services: [
    'Same-day urgent behavioral health assessment',
    'Outpatient mental health and substance use treatment',
    'Individual, family, and group therapy',
    'Care coordination and peer support services',
  ],
  hours: 'Mon-Fri 8 AM - 8 PM; Sat-Sun 9 AM - 5 PM',
  isOpenNow: isOpenFromSimpleHours('Mo-Fr 08:00-20:00; Sa-Su 09:00-17:00'),
  osmUrl: 'https://www.openstreetmap.org/search?query=Boston%20Medical%20Center%20CBHC',
}

const bostonSupplementalClinics: Clinic[] = [
  fallbackClinic,
  {
    id: 'supplemental-lindemann',
    name: 'Erich Lindemann Mental Health Center',
    website: 'https://www.bhchp.org/lindemann-mental-health-center',
    distanceMiles: 0.4,
    address: '25 Staniford Street, Boston, MA 02114',
    serviceLabel: 'Mental health services',
    services: [
      'Mental health clinic services',
      'Downtown Boston location',
      'Website available for program details',
      'Call to confirm services, insurance, and appointment availability',
    ],
    isOpenNow: null,
    osmUrl: 'https://www.openstreetmap.org/node/7814644181',
  },
]

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusMiles = 3958.8
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getElementLatLon(element: OsmElement) {
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null
  }

  return { lat, lon }
}

function getWebsite(tags: OsmTags) {
  const website = tags.website ?? tags['contact:website'] ?? tags.url
  if (!website) {
    return undefined
  }

  return website.startsWith('http') ? website : `https://${website}`
}

function getPhone(tags: OsmTags) {
  return tags.phone ?? tags['contact:phone']
}

function getAddress(tags: OsmTags) {
  const street = tags['addr:street']
  const houseNumber = tags['addr:housenumber']
  const city = tags['addr:city']
  const state = tags['addr:state']

  const lineOne = [houseNumber, street].filter(Boolean).join(' ')
  const lineTwo = [city, state].filter(Boolean).join(', ')
  const address = [lineOne, lineTwo].filter(Boolean).join(', ')

  return address || tags['addr:full'] || 'Address unavailable'
}

function getAddressFromNominatim(place: NominatimPlaceResult) {
  const address = place.address
  if (!address) {
    return place.display_name
  }

  const lineOne = [address.house_number, address.road].filter(Boolean).join(' ')
  const lineTwo = [address.city ?? address.town ?? address.village, address.state, address.postcode]
    .filter(Boolean)
    .join(', ')

  return [lineOne, lineTwo].filter(Boolean).join(', ') || place.display_name
}

function getServiceLabel(tags: OsmTags) {
  const specialty = `${tags['healthcare:speciality'] ?? ''} ${tags.speciality ?? ''}`.toLowerCase()

  if (specialty.includes('psychi')) {
    return 'Psychiatry and mental health services'
  }

  if (specialty.includes('psychotherapy') || specialty.includes('counselling')) {
    return 'Therapy and counseling services'
  }

  if ((tags.name ?? '').toLowerCase().includes('behavioral')) {
    return 'Behavioral health services'
  }

  return 'Mental health services'
}

function getServices(tags: OsmTags) {
  const services = new Set<string>()
  const specialty = `${tags['healthcare:speciality'] ?? ''} ${tags.speciality ?? ''}`.toLowerCase()
  const name = (tags.name ?? '').toLowerCase()

  if (specialty.includes('psychi')) {
    services.add('Psychiatry or medication support')
  }

  if (specialty.includes('psychotherapy') || specialty.includes('counselling') || name.includes('counsel')) {
    services.add('Therapy or counseling')
  }

  if (name.includes('behavioral')) {
    services.add('Behavioral health support')
  }

  if (tags.healthcare === 'clinic' || tags.amenity === 'clinic') {
    services.add('Outpatient clinic services')
  }

  services.add('Call to confirm services, insurance, and appointment availability')

  return [...services].slice(0, 4)
}

function parseTime(time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return Number(hour) + Number(minute) / 60
}

function getDayIndexes(dayToken: string) {
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const [start, end] = dayToken.split('-')
  const startIndex = days.indexOf(start)
  const endIndex = days.indexOf(end ?? start)

  if (startIndex === -1 || endIndex === -1) {
    return []
  }

  if (startIndex <= endIndex) {
    return days.map((_, index) => index).filter((index) => index >= startIndex && index <= endIndex)
  }

  return days.map((_, index) => index).filter((index) => index >= startIndex || index <= endIndex)
}

function isOpenFromSimpleHours(hours?: string) {
  if (!hours) {
    return null
  }

  const normalized = hours.replaceAll(',', ';')
  const now = new Date()
  const today = now.getDay()
  const currentHour = now.getHours() + now.getMinutes() / 60

  for (const part of normalized.split(';')) {
    const match = part.trim().match(/^([A-Z][a-z](?:-[A-Z][a-z])?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)

    if (!match) {
      continue
    }

    const [, days, open, close] = match
    if (getDayIndexes(days).includes(today)) {
      return currentHour >= parseTime(open) && currentHour < parseTime(close)
    }
  }

  return null
}

function buildOverpassQuery(lat: number, lon: number, radiusMeters: number) {
  const near = `(around:${radiusMeters},${lat},${lon})`

  return `
    [out:json][timeout:25];
    (
      nwr${near}["healthcare"~"clinic|doctor|psychotherapist|counsellor|hospital",i];
      nwr${near}["amenity"~"clinic|doctors|hospital|social_facility",i];
      nwr${near}["healthcare:speciality"~"psychiatry|psychotherapy|mental|counselling|behavioral",i];
      nwr${near}["name"~"mental|behavioral|behavioural|therapy|therapist|counsel|counselling|psychiatry|psychology",i];
      nwr${near}["office"~"therapist|psychotherapist|counsellor",i];
    );
    out center tags 25;
  `
}

function getAbortSignal(timeoutMs: number) {
  const controller = new AbortController()
  window.setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

function toClinic(element: OsmElement, originLat: number, originLon: number): Clinic | null {
  const tags = element.tags ?? {}
  const name = tags.name
  const coordinates = getElementLatLon(element)

  if (!name || !coordinates) {
    return null
  }

  const hours = tags.opening_hours
  const distanceMiles = getDistanceMiles(originLat, originLon, coordinates.lat, coordinates.lon)
  const osmType = element.type === 'node' ? 'node' : element.type

  return {
    id: `${element.type}-${element.id}`,
    name,
    website: getWebsite(tags),
    distanceMiles,
    address: getAddress(tags),
    phone: getPhone(tags),
    serviceLabel: getServiceLabel(tags),
    services: getServices(tags),
    hours,
    isOpenNow: isOpenFromSimpleHours(hours),
    osmUrl: `https://www.openstreetmap.org/${osmType}/${element.id}`,
  }
}

function toClinicFromNominatim(place: NominatimPlaceResult, originLat: number, originLon: number): Clinic | null {
  const lat = Number(place.lat)
  const lon = Number(place.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }

  const tags = place.extratags ?? {}
  const name = place.name ?? place.address?.amenity ?? place.display_name.split(',')[0]
  const hours = tags.opening_hours
  const osmType = place.osm_type === 'node' ? 'node' : place.osm_type

  return {
    id: `${place.osm_type}-${place.osm_id}`,
    name,
    website: getWebsite(tags),
    distanceMiles: getDistanceMiles(originLat, originLon, lat, lon),
    address: getAddressFromNominatim(place),
    phone: getPhone(tags),
    serviceLabel: getServiceLabel({ ...tags, name }),
    services: getServices({ ...tags, name, healthcare: tags.healthcare ?? place.type }),
    hours,
    isOpenNow: isOpenFromSimpleHours(hours),
    osmUrl: `https://www.openstreetmap.org/${osmType}/${place.osm_id}`,
  }
}

async function geocodeLocation(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'us',
  })
  const response = await fetch(`/api/nominatim/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal: getAbortSignal(8000),
  })

  if (!response.ok) {
    throw new Error('Location search failed. Please try again.')
  }

  const results = (await response.json()) as GeocodeResult[]
  const [result] = results

  if (!result) {
    throw new Error('We could not find that location. Try a city, ZIP, or full address.')
  }

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    label: result.display_name,
  }
}

async function searchNominatimPlaces(query: string, originLat: number, originLon: number, distanceMiles: number) {
  const params = new URLSearchParams({
    q: `mental health clinic ${query}`,
    format: 'jsonv2',
    limit: '30',
    countrycodes: 'us',
    addressdetails: '1',
    extratags: '1',
  })
  const response = await fetch(`/api/nominatim/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal: getAbortSignal(8000),
  })

  if (!response.ok) {
    throw new Error('Clinic search failed. Please try again in a moment.')
  }

  const places = (await response.json()) as NominatimPlaceResult[]

  return places
    .map((place) => toClinicFromNominatim(place, originLat, originLon))
    .filter((clinic): clinic is Clinic => Boolean(clinic))
    .filter((clinic) => clinic.distanceMiles <= distanceMiles)
}

async function searchClinics(lat: number, lon: number, distanceMiles: number) {
  const radiusMeters = Math.min(distanceMiles, 50) * 1609.344
  const response = await fetch('/api/overpass/interpreter', {
    method: 'POST',
    body: new URLSearchParams({
      data: buildOverpassQuery(lat, lon, radiusMeters),
    }),
    signal: getAbortSignal(10000),
  })

  if (!response.ok) {
    throw new Error('Clinic search failed. Please try again in a moment.')
  }

  const data = (await response.json()) as { elements: OsmElement[] }
  const seen = new Set<string>()

  return data.elements
    .map((element) => toClinic(element, lat, lon))
    .filter((clinic): clinic is Clinic => {
      if (!clinic || seen.has(clinic.id)) {
        return false
      }

      seen.add(clinic.id)
      return true
    })
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 10)
}

function getBostonSupplementalResults(lat: number, lon: number, distanceMiles: number) {
  const bostonLat = 42.3588336
  const bostonLon = -71.0578303
  const isBostonArea = getDistanceMiles(lat, lon, bostonLat, bostonLon) <= Math.max(distanceMiles, 10)

  if (!isBostonArea) {
    return []
  }

  return bostonSupplementalClinics.filter((clinic) => clinic.distanceMiles <= distanceMiles)
}

function mergeClinics(...clinicGroups: Clinic[][]) {
  const seen = new Set<string>()

  return clinicGroups
    .flat()
    .filter((clinic) => {
      const key = clinic.website ?? clinic.name.toLowerCase()
      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

function OpenStatus({ clinic }: { clinic: Clinic }) {
  if (clinic.isOpenNow === null) {
    return (
      <div className="open-now is-unknown">
        <span className="pulse" aria-hidden="true"></span>
        <span>Hours need confirmation</span>
      </div>
    )
  }

  return (
    <div className={clinic.isOpenNow ? 'open-now' : 'open-now is-closed'}>
      <span className="pulse" aria-hidden="true"></span>
      <span>{clinic.isOpenNow ? 'Open now' : 'Closed now'}</span>
    </div>
  )
}

function ClinicCard({ clinic }: { clinic: Clinic }) {
  return (
    <article className="clinic-card">
      <div className="clinic-main">
        <div className="clinic-heading">
          <h2>
            {clinic.website ? (
              <a href={clinic.website} target="_blank" rel="noreferrer">
                {clinic.name}
              </a>
            ) : (
              <span>{clinic.name}</span>
            )}
          </h2>
          <p className="clinic-meta">{clinic.distanceMiles.toFixed(1)} miles away</p>
          <p className="clinic-type">{clinic.serviceLabel}</p>
        </div>

        <ul className="service-list">
          {clinic.services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>

        <div className="clinic-actions">
          {clinic.phone ? (
            <p className="phone-number">
              <span>Phone number:</span> <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
            </p>
          ) : (
            <p className="phone-number">Phone number: Call or check website to confirm</p>
          )}
          <a className="osm-link" href={clinic.osmUrl} target="_blank" rel="noreferrer">
            View source
          </a>
        </div>
      </div>

      <div className="clinic-hours">
        <OpenStatus clinic={clinic} />
        <p className="hours-label">Hours</p>
        <p className="hours-text">{clinic.hours ?? 'Hours unavailable. Call to confirm.'}</p>
        <p className="address-text">{clinic.address}</p>
      </div>
    </article>
  )
}

function App() {
  const resultsPerPage = 10
  const [location, setLocation] = useState('')
  const [distance, setDistance] = useState(5)
  const [status, setStatus] = useState('Search a city, ZIP, or address to find nearby support options')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [clinics, setClinics] = useState<Clinic[]>([fallbackClinic])
  const [currentPage, setCurrentPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const place = location.trim()
    if (!place) {
      setError('Enter a city, ZIP, or address first.')
      return
    }

    setError('')
    setIsSearching(true)
    setStatus(`Searching within ${distance} miles of ${place}...`)

    try {
      const geocoded = await geocodeLocation(place)
      const primaryResults = await searchNominatimPlaces(place, geocoded.lat, geocoded.lon, distance)
      const supplementalResults = getBostonSupplementalResults(geocoded.lat, geocoded.lon, distance)
      let results = mergeClinics(primaryResults, supplementalResults)

      if (!results.length) {
        try {
          results = mergeClinics(await searchClinics(geocoded.lat, geocoded.lon, distance))
        } catch {
          results = []
        }
      }

      setClinics(results)
      setCurrentPage(1)
      setStatus(
        results.length
          ? `Showing ${results.length} support option${results.length === 1 ? '' : 's'} within ${distance} miles`
          : `No OpenStreetMap results found within ${distance} miles`,
      )
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Something went wrong. Please try again.')
      setStatus('Search paused')
    } finally {
      setIsSearching(false)
    }
  }

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  const totalPages = Math.max(1, Math.ceil(clinics.length / resultsPerPage))
  const pageStart = (currentPage - 1) * resultsPerPage
  const visibleClinics = clinics.slice(pageStart, pageStart + resultsPerPage)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className="page-shell">
      <header className="site-header" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="Reach Out home">
          <span className="brand-mark" aria-hidden="true">
            RO
          </span>
          <span>Reach Out</span>
        </a>
        <a className="lifeline-link" href="tel:988" aria-label="Call the 988 Lifeline">
          988 Lifeline
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Local mental health support</p>
          <h1 id="hero-title">Need Support Nearby?</h1>
        </section>

        <section className="crisis-banner" aria-label="Immediate crisis support">
          <div>
            <p className="crisis-title">Need immediate help?</p>
            <p>
              Call or text <strong>988</strong> for free, confidential crisis support available 24/7.
            </p>
          </div>
          <a href="tel:988" className="crisis-button">
            Call 988
          </a>
        </section>

        <section className="search-panel" aria-label="Find nearby care">
          <form className="search-form" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="locationInput">
              Enter city, ZIP, or address
            </label>
            <input
              id="locationInput"
              type="search"
              placeholder="Enter city, ZIP, or address"
              autoComplete="off"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="results-layout">
            <aside className="filters" aria-label="Filters">
              <button
                className="filter-toggle"
                type="button"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <span>Filters</span>
                <span aria-hidden="true">v</span>
              </button>

              {filtersOpen && (
                <div className="filter-menu">
                  <fieldset>
                    <legend>Distance</legend>
                    <label className="distance-control" htmlFor="distanceInput">
                      <span>Within</span>
                      <input
                        id="distanceInput"
                        type="number"
                        min="1"
                        max="50"
                        value={distance}
                        onChange={(event) => {
                          const nextDistance = Math.max(1, Number(event.target.value) || 1)
                          setDistance(nextDistance)
                          setCurrentPage(1)
                          setStatus(`Ready to search within ${nextDistance} miles`)
                        }}
                      />
                      <span>miles</span>
                    </label>
                  </fieldset>

                  <fieldset>
                    <legend>Resources</legend>
                    <label>
                      <input type="checkbox" defaultChecked /> Therapy
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked /> Psychiatry
                    </label>
                    <label>
                      <input type="checkbox" /> Telehealth
                    </label>
                  </fieldset>
                </div>
              )}
            </aside>

            <section className="results" aria-live="polite">
              <p className="status-line">{status}</p>
              {error && <p className="error-line">{error}</p>}

              <div className="clinic-list">
                {visibleClinics.length ? (
                  visibleClinics.map((clinic) => <ClinicCard clinic={clinic} key={clinic.id} />)
                ) : (
                  <div className="empty-state">
                    Try a larger distance or a broader location, like your city or ZIP code.
                  </div>
                )}
              </div>

              {clinics.length > 0 && (
                <nav className="pagination" aria-label="Results pages">
                  <button
                    className="page-arrow"
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>

                  <div className="page-buttons">
                    {pageNumbers.map((page) => (
                      <button
                        className={page === currentPage ? 'page-button is-active' : 'page-button'}
                        type="button"
                        key={page}
                        onClick={() => goToPage(page)}
                        aria-current={page === currentPage ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className="page-arrow"
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    &gt;
                  </button>
                </nav>
              )}

              <p className="attribution">
                Search data from OpenStreetMap contributors via Nominatim and Overpass. Call providers to confirm
                services, hours, insurance, and availability.
              </p>
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
