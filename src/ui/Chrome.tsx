import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { KONTAKT, type Projekt } from '../data/projects'

// Kopfzeile: links nur der Name (Carolins Wunsch — der Untertitel doppelte die Kategorien), Navigation rechts.
export function Kopf({ hell = false }: { hell?: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const zurueck = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <header className={hell ? 'kopf hell' : 'kopf'}>
      <Link to="/" className="name">
        {KONTAKT.name}
      </Link>
      <nav>
        {(pathname === '/lebenslauf' || pathname === '/about') && (
          <button onClick={zurueck} aria-label="Zurück" style={{ fontSize: 15, lineHeight: 1 }}>
            ←
          </button>
        )}
        <NavLink to="/about" className={({ isActive }) => (isActive ? 'aktiv' : '')}>
          About
        </NavLink>
        <NavLink to="/lebenslauf" className={({ isActive }) => (isActive ? 'aktiv' : '')}>
          Lebenslauf
        </NavLink>
        <a href={KONTAKT.instagram} target="_blank" rel="noreferrer">
          insta <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  )
}

// Fußzeile im Stil der Bildunterschriften: Rolle — Jahr — Produktion, Haus.
export function Fuss({
  projekt,
  hell = false,
  fallback,
}: {
  projekt?: Projekt | null
  hell?: boolean
  fallback?: [string, string, string]
}) {
  return (
    <footer className={hell ? 'fuss hell' : 'fuss'}>
      <span>{projekt ? projekt.rolle : (fallback?.[0] ?? '')}</span>
      <span>{projekt ? projekt.jahr : (fallback?.[1] ?? '')}</span>
      <span>{projekt ? `${projekt.titel}, ${projekt.ort}` : (fallback?.[2] ?? '')}</span>
    </footer>
  )
}
