import { useEffect, useState } from 'react'
import './App.css'

const activeClinic = {
  name: 'Boston Medical Center CBHC',
  website: 'https://www.bmc.org/cbhc',
  distance: '1.2 miles away',
  phone: '(617) 414-5470',
  phoneHref: 'tel:+16174145470',
}

const clinicHours = [
  { day: 'Sun', label: '9 AM - 5 PM', open: 9, close: 17 },
  { day: 'Mon', label: '8 AM - 8 PM', open: 8, close: 20 },
  { day: 'Tue', label: '8 AM - 8 PM', open: 8, close: 20 },
  { day: 'Wed', label: '8 AM - 8 PM', open: 8, close: 20 },
  { day: 'Thu', label: '8 AM - 8 PM', open: 8, close: 20 },
  { day: 'Fri', label: '8 AM - 8 PM', open: 8, close: 20 },
  { day: 'Sat', label: '9 AM - 5 PM', open: 9, close: 17 },
]

function App() {
  const [location, setLocation] = useState('')
  const [distance, setDistance] = useState(5)
  const [status, setStatus] = useState('Showing nearby support options')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [isOpenNow, setIsOpenNow] = useState(false)

  useEffect(() => {
    const now = new Date()
    const todayHours = clinicHours[now.getDay()]
    const currentHour = now.getHours() + now.getMinutes() / 60
    setIsOpenNow(currentHour >= todayHours.open && currentHour < todayHours.close)
  }, [])

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const place = location.trim() || 'your area'
    setStatus(`Searching within ${distance} miles of ${place}...`)

    window.setTimeout(() => {
      setStatus(`Showing support options within ${distance} miles of ${place}`)
    }, 850)
  }

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
            <button type="submit">Search</button>
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
                          setStatus(`Showing support options within ${nextDistance} miles`)
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
                      <input type="checkbox" /> Psychiatry
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

              <article className="clinic-card">
                <div className="clinic-main">
                  <div className="clinic-heading">
                    <h2>
                      <a href={activeClinic.website} target="_blank" rel="noreferrer">
                        {activeClinic.name}
                      </a>
                    </h2>
                    <p className="clinic-meta">{activeClinic.distance}</p>
                    <p className="clinic-type">Mental health services</p>
                  </div>

                  <ul className="service-list">
                    <li>Same-day urgent behavioral health assessment</li>
                    <li>Outpatient mental health and substance use treatment</li>
                    <li>Individual, family, and group therapy</li>
                    <li>Care coordination and peer support services</li>
                  </ul>

                  <p className="phone-number">
                    <span>Phone number:</span>{' '}
                    <a href={activeClinic.phoneHref}>{activeClinic.phone}</a>
                  </p>
                </div>

                <div className="clinic-hours">
                  <div className={isOpenNow ? 'open-now' : 'open-now is-closed'}>
                    <span className="pulse" aria-hidden="true"></span>
                    <span>{isOpenNow ? 'Open now' : 'Closed now'}</span>
                  </div>

                  <dl>
                    {clinicHours.slice(1).map((hours) => (
                      <div key={hours.day}>
                        <dt>{hours.day}</dt>
                        <dd>{hours.label}</dd>
                      </div>
                    ))}
                    <div>
                      <dt>Sun</dt>
                      <dd>{clinicHours[0].label}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
