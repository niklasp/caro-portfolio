import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'
import { LEBENSLAUF, PROJEKTE, permalink, type LlZeile, type Projekt } from '../data/projects'

// Einträge, zu denen es ein Projekt mit Bildern gibt, finden es über den Titel.
const schlicht = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]/g, '')
const projektZu = (titel: string): Projekt | undefined => PROJEKTE.find((p) => schlicht(p.titel) === schlicht(titel))

// Der Lebenslauf kommt aus dem CMS (Sammlung „Lebenslauf"). Fehlt der Eintrag, bleibt die Seite leer.
const LL = LEBENSLAUF

// Eine Zeile der Werkliste. Gibt es das Projekt auf der Seite, führt sie dorthin —
// und beim Überfahren wächst das Hauptbild an der Maus auf.
function Werk({
  jahr,
  titel,
  text,
  onZeigen,
}: {
  jahr: string
  titel: string
  text: string
  onZeigen: (p: Projekt | null) => void
}) {
  const projekt = projektZu(titel)
  const inhalt = (
    <>
      <span className="jahr">{jahr}</span>
      <span>
        <em>{titel}.</em> {text}
      </span>
    </>
  )
  if (!projekt) return <div className="ll-zeile">{inhalt}</div>
  return (
    <Link
      className="ll-zeile ll-projekt"
      to={`/drehbuehne/${permalink(projekt)}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onZeigen(projekt)}
      onPointerLeave={() => onZeigen(null)}
    >
      {inhalt}
    </Link>
  )
}

// Ein Abschnitt mit Überschrift. Zeilen mit Titel sind Werke; ohne Zeilen entfällt der Abschnitt.
function Abschnitt({ titel, zeilen, onZeigen }: { titel: string; zeilen?: LlZeile[]; onZeigen?: (p: Projekt | null) => void }) {
  if (!zeilen?.length) return null
  return (
    <>
      <h3>{titel}</h3>
      {zeilen.map((z, i) =>
        z.titel && onZeigen ? (
          <Werk key={i} jahr={z.jahr} titel={z.titel} text={z.text} onZeigen={onZeigen} />
        ) : (
          <div className="ll-zeile" key={i}>
            <span className="jahr">{z.jahr}</span>
            <span>{z.titel ? `${z.titel}. ${z.text}` : z.text}</span>
          </div>
        )
      )}
    </>
  )
}

export default function Lebenslauf() {
  const navigate = useNavigate()

  // Vorschau: das Hauptbild folgt der Maus mit etwas Nachlauf, wächst beim Betreten
  // einer Zeile auf und schrumpft beim Verlassen wieder weg.
  const [gezeigt, setGezeigt] = useState<Projekt | null>(null) // bleibt stehen, während das Bild schrumpft
  const [offen, setOffen] = useState(false)
  const bild = useRef<HTMLImageElement>(null)
  const zeiger = useRef({ x: 0, y: 0, ix: 0, iy: 0, ruht: true })
  const zeige = (p: Projekt | null) => {
    if (p) {
      setGezeigt(p)
      if (zeiger.current.ruht) Object.assign(zeiger.current, { ix: zeiger.current.x, iy: zeiger.current.y })
    }
    zeiger.current.ruht = !p
    setOffen(!!p)
  }
  // Hauptbilder vorab laden, damit die Vorschau sofort da ist.
  useEffect(() => {
    ;[...(LL?.arbeiten ?? []), ...(LL?.ausstellungen ?? [])].forEach(({ titel }) => {
      const p = titel ? projektZu(titel) : undefined
      if (p) new Image().src = p.bilder[0].src
    })
  }, [])
  useEffect(() => {
    const onMove = (e: PointerEvent) => Object.assign(zeiger.current, { x: e.clientX, y: e.clientY })
    window.addEventListener('pointermove', onMove)
    let bildlauf = 0
    let zuletzt = performance.now()
    const lauf = (jetzt: number) => {
      const z = zeiger.current
      const k = 1 - Math.exp(-14 * Math.min((jetzt - zuletzt) / 1000, 1 / 30))
      zuletzt = jetzt
      z.ix += (z.x - z.ix) * k
      z.iy += (z.y - z.iy) * k
      const el = bild.current
      if (el) {
        // Rechts im Fenster hängt das Bild links von der Maus — so bleibt es im Blick.
        const links = z.ix > window.innerWidth * 0.55
        const y = Math.min(z.iy + 18, window.innerHeight - el.offsetHeight - 12)
        el.style.translate = `${links ? z.ix - el.offsetWidth - 18 : z.ix + 18}px ${Math.max(12, y)}px`
        el.style.transformOrigin = links ? 'top right' : 'top left'
      }
      bildlauf = requestAnimationFrame(lauf)
    }
    bildlauf = requestAnimationFrame(lauf)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(bildlauf)
    }
  }, [])

  // Esc schließt den Lebenslauf wieder.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.history.length > 1) navigate(-1)
        else navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <>
      <Kopf />
      <div className="lebenslauf">
        <section>
          <h2 className="ll-kopf">
            {LL?.titel ?? 'Lebenslauf'}
            {LL && (
              <a href={LL.pdf} download>
                ↓ als PDF
              </a>
            )}
          </h2>
          {LL && LL.einleitung.length > 0 && (
            <p>
              {LL.einleitung.map((zeile, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {zeile}
                </Fragment>
              ))}
            </p>
          )}

          <Abschnitt titel="Ausbildung" zeilen={LL?.ausbildung} />
          <Abschnitt titel="Beruflicher Werdegang" zeilen={LL?.werdegang} />

          {LL?.skills.map((s, i) => (
            <Fragment key={i}>
              <h3>{s.titel}</h3>
              <p>{s.text}</p>
            </Fragment>
          ))}
        </section>

        {LL && LL.arbeiten.length + LL.ausstellungen.length + LL.auszeichnungen.length > 0 && (
          <section className="werke">
            <h2>künstlerische Arbeiten</h2>
            <Abschnitt titel="Bühne und Kostüm" zeilen={LL.arbeiten} onZeigen={zeige} />
            <Abschnitt titel="Ausstellungen" zeilen={LL.ausstellungen} onZeigen={zeige} />
            <Abschnitt titel="Auszeichnungen" zeilen={LL.auszeichnungen} />
          </section>
        )}
      </div>
      {/* immer im Dokument — sonst gäbe es beim ersten Überfahren nichts, woraus das Bild wachsen kann */}
      <img ref={bild} className={offen ? 'll-vorschau offen' : 'll-vorschau'} src={gezeigt?.bilder[0].src} alt="" aria-hidden />
    </>
  )
}
