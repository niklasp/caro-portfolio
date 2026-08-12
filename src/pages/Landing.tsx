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
    text: 'Alle Arbeiten liegen als Fotohaufen auf einem Bühnenboden, gesehen von oben. Ziehen verschiebt den Blick, Scrollen zoomt. Ein Klick rastet auf ein Projekt ein: Die Fotos treten auseinander, die Beschreibung liegt in der Mitte.',
  },
  {
    pfad: '/drehbuehne',
    nr: 'Entwurf 2',
    name: 'Die Drehbühne',
    farbe: FARBEN.orange,
    text: 'Ein dunkler Bühnenraum mit Drehscheibe: Die Fotos stehen als Blöcke auf der Bühne, die Maus führt den Verfolger, und auf dem Rundhorizont erscheint das Motiv des vordersten Projekts — bei Heavy Matters läuft dort das Video.',
  },
  {
    pfad: '/schnuerboden',
    nr: 'Entwurf 3',
    name: 'Der Schnürboden',
    farbe: FARBEN.magenta,
    text: 'Die Projekte schweben herein wie Prospekte aus dem Schnürboden — je nach Blätterrichtung von oben oder unten. Jedes Element antwortet eigenständig auf die Maus, die Beschreibung steht frei zwischen den Fotos.',
  },
  {
    pfad: '/spielplan',
    nr: 'Entwurf 4',
    name: 'Der Spielplan',
    farbe: FARBEN.pink,
    text: 'Flach wie das gedruckte Portfolio: eine Liste. Hoch und runter wechselt das Projekt, links und rechts blättert durch die Fotos — ein Farbquadrat läuft der Maus hinterher und wächst über dem, was es berührt.',
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
