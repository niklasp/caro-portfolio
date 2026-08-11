import { Link } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'
import GooglyEyes from '../ui/GooglyEyes'
import { FARBEN, KONTAKT } from '../data/projects'

const ENTWUERFE = [
  {
    pfad: '/boden',
    nr: 'Entwurf 1',
    name: 'Der Boden',
    farbe: FARBEN.blau,
    text: 'Alle Arbeiten liegen als farbige Markierungen auf einem Bühnenboden, gesehen von oben. Ziehen verschiebt den Blick, Scrollen zoomt — je näher man kommt, desto mehr Fotos tauchen um die Flächen auf.',
  },
  {
    pfad: '/drehbuehne',
    nr: 'Entwurf 2',
    name: 'Die Drehbühne',
    farbe: FARBEN.orange,
    text: 'Ein schwarzer Bühnenraum mit einer Drehbühne. Jede Arbeit steht als Kulisse auf der Scheibe: Farbfläche als Prospekt, Fotos als Stellwände. Ziehen dreht die Bühne, das vorderste Projekt steht im Licht.',
  },
  {
    pfad: '/schnuerboden',
    nr: 'Entwurf 3',
    name: 'Der Schnürboden',
    farbe: FARBEN.magenta,
    text: 'Die Projekte hängen an Zügen wie Prospekte im Schnürboden. Scrollen fährt ein Bühnenbild nach dem anderen ein und aus — auch die Beschreibung hängt mit, als scrollbare Karte am eigenen Zug.',
  },
  {
    pfad: '/spielplan',
    nr: 'Entwurf 4',
    name: 'Der Spielplan',
    farbe: FARBEN.pink,
    text: 'Flach wie das gedruckte Portfolio: eine Liste. Hoch und runter wechselt das Projekt, links und rechts blättert durch Fotos und Beschreibung — die Farbfläche fährt hinter den Titel.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <Kopf />
      <div className="intro">
        <p style={{ color: 'var(--tinte)' }}>
          Vier Entwürfe für ein räumliches Portfolio — gebaut aus den farbigen
          Flächen, den Fotos und der Typografie des gedruckten Portfolios.
        </p>
        <p>
          {KONTAKT.adresse.join(', ')} · <a style={{ borderBottom: '1px solid' }} href={`mailto:${KONTAKT.email}`}>{KONTAKT.email}</a>
        </p>
      </div>

      <div className="entwurf-liste">
        {ENTWUERFE.map((e) => (
          <Link key={e.pfad} to={e.pfad} className="entwurf-eintrag">
            <div className="farbflaeche" style={{ background: e.farbe }} />
            <span className="nummer">{e.nr}</span>
            <h2>{e.name}</h2>
            <p className="beschreibung">{e.text}</p>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--grau)' }}>
          Bühne · Kostüm · Intervention — 2021 bis 2026
        </span>
        <GooglyEyes />
      </div>
    </div>
  )
}
