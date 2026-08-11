import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { KONTAKT, type Projekt } from '../data/projects'

const ENTWUERFE = [
  { pfad: '/boden', nr: '1', name: 'Der Boden' },
  { pfad: '/drehbuehne', nr: '2', name: 'Die Drehbühne' },
  { pfad: '/schnuerboden', nr: '3', name: 'Der Schnürboden' },
  { pfad: '/spielplan', nr: '4', name: 'Der Spielplan' },
]

// Kopfzeile wie im gedruckten Portfolio: Name links, Navigation rechts.
export function Kopf({ hell = false }: { hell?: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const zurueck = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <header className={hell ? 'kopf hell' : 'kopf'}>
      <Link to="/" className="name">
        {KONTAKT.name}
        <span className="unter">{KONTAKT.untertitel}</span>
      </Link>
      <nav>
        {pathname === '/lebenslauf' && (
          <button onClick={zurueck} aria-label="Zurück" style={{ fontSize: 15, lineHeight: 1 }}>
            ←
          </button>
        )}
        <NavLink to="/lebenslauf" className={({ isActive }) => (isActive ? 'aktiv' : '')}>
          Lebenslauf
        </NavLink>
        <a href={KONTAKT.instagram} target="_blank" rel="noreferrer">
          insta
        </a>
      </nav>
    </header>
  )
}

// Schalter zwischen den drei Entwürfen, nur auf den Entwurfsseiten sichtbar.
export function EntwurfSchalter({ hell = false }: { hell?: boolean }) {
  const { pathname } = useLocation()
  return (
    <div className={hell ? 'entwurf-schalter hell' : 'entwurf-schalter'}>
      <span>Entwurf</span>
      {ENTWUERFE.map((e) => (
        <Link key={e.pfad} to={e.pfad} className={pathname === e.pfad ? 'aktiv' : ''} title={e.name}>
          {e.nr}
        </Link>
      ))}
    </div>
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
