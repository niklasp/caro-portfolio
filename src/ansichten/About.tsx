import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'
import { ABOUT, PROJEKTE, originalVon, type Absatz, type Projekt, type TextTeil } from '../data/projects'
import { feld, imAdmin, tipptImFeld, zeigtAuf } from '../data/bearbeiten'

// About — eine Seite aus einem CMS-Eintrag (Seiten → about): oben Porträt und Kurzvorstellung
// nebeneinander, darunter der Lebenslauf. Beides ist Rich Text; Tabellen im Lebenslauf stehen
// als Zeilen mit fester Jahresspalte.

// Nur im Bearbeitungsmodus gesetzt: EmDashs Marke für den Eintrag (src/data/bearbeiten.ts).
const REF = ABOUT.ref

// Links auf ein Projekt der Seite: beim Überfahren wächst dessen Hauptbild an der Maus auf.
const projektZu = (adresse: string): Projekt | undefined => {
  const treffer = /^\/drehbuehne\/([^/?#]+)/.exec(adresse)
  return treffer ? PROJEKTE.find((p) => p.slug === decodeURIComponent(treffer[1])) : undefined
}
const Vorschau = createContext<(p: Projekt | null) => void>(() => {})

// Seiten dieser Website öffnen ohne Neuladen; Projekte zeigen dabei ihr Bild.
function SeitenLink({ ziel, children }: { ziel: string; children: ReactNode }) {
  const zeige = useContext(Vorschau)
  const projekt = projektZu(ziel)
  return (
    <Link
      to={ziel}
      className={projekt ? 'll-projekt' : undefined}
      onPointerEnter={(e) => projekt && e.pointerType === 'mouse' && zeige(projekt)}
      onPointerLeave={() => projekt && zeige(null)}
    >
      {children}
    </Link>
  )
}

// Ein Textstück mit seiner Auszeichnung aus dem Editor: fett, kursiv, unterstrichen, durchgestrichen, Link.
function Teil({ teil }: { teil: TextTeil }) {
  let inhalt: ReactNode = teil.text
  if (teil.code) inhalt = <code>{inhalt}</code>
  if (teil.durch) inhalt = <s>{inhalt}</s>
  if (teil.unter) inhalt = <u>{inhalt}</u>
  if (teil.kursiv) inhalt = <em>{inhalt}</em>
  if (teil.fett) inhalt = <strong>{inhalt}</strong>
  if (teil.link)
    inhalt = /^\/(?!\/)/.test(teil.link) ? (
      <SeitenLink ziel={teil.link}>{inhalt}</SeitenLink>
    ) : (
      <a href={teil.link} {...(teil.neuesFenster ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {inhalt}
      </a>
    )
  return <>{inhalt}</>
}

const Teile = ({ teile }: { teile: TextTeil[] }) => (
  <>
    {teile.map((t, i) => (
      <Teil key={i} teil={t} />
    ))}
  </>
)

// Der Rich Text der Reihe nach; aufeinanderfolgende Listenpunkte bilden eine Liste.
// Eine Tabellenzeile steht wie im alten Lebenslauf: links das Jahr in fester Breite, rechts der Text.
// Den Text kann EmDashs Leiste nicht bearbeiten — im Bearbeitungsmodus öffnet ein Klick das Feld im Admin.
function Fliesstext({ absaetze, feldName }: { absaetze: Absatz[]; feldName: string }) {
  const marke = imAdmin(REF, feldName)
  const zeile = (a: Absatz, i: number): ReactNode => {
    if (a.art === 'tabelle')
      return (
        <div className="ll-tabelle" key={i} {...marke}>
          {(a.zeilen ?? []).map((zellen, j) => (
            <div
              className="ll-zeile"
              key={j}
              style={zellen.length > 2 ? { gridTemplateColumns: `84px repeat(${zellen.length - 1}, minmax(0, 1fr))` } : undefined}
            >
              {zellen.map((teile, k) => (
                <span key={k} className={k === 0 ? 'jahr' : undefined}>
                  <Teile teile={teile} />
                </span>
              ))}
            </div>
          ))}
        </div>
      )
    const Element = a.art === 'h' ? (a.stufe === 2 ? 'h2' : 'h3') : a.art === 'zitat' ? 'blockquote' : a.art === 'p' ? 'p' : 'li'
    return (
      <Element key={i} {...marke}>
        <Teile teile={a.teile} />
      </Element>
    )
  }
  const aus: ReactNode[] = []
  for (let i = 0; i < absaetze.length; i++) {
    const art = absaetze[i].art
    if (art !== 'punkt' && art !== 'nummer') {
      aus.push(zeile(absaetze[i], i))
      continue
    }
    const start = i
    while (absaetze[i + 1]?.art === art) i++
    const Liste = art === 'nummer' ? 'ol' : 'ul'
    aus.push(<Liste key={start}>{absaetze.slice(start, i + 1).map((a, j) => zeile(a, start + j))}</Liste>)
  }
  return <>{aus}</>
}

// Bildvorschau für Projekt-Links: folgt der Maus mit etwas Nachlauf, wächst beim Betreten
// eines Links auf und schrumpft beim Verlassen wieder weg.
function useVorschau() {
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
  useEffect(() => {
    const onMove = (e: PointerEvent) => Object.assign(zeiger.current, { x: e.clientX, y: e.clientY })
    window.addEventListener('pointermove', onMove)
    let lauf = 0
    let zuletzt = performance.now()
    const schritt = (jetzt: number) => {
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
      lauf = requestAnimationFrame(schritt)
    }
    lauf = requestAnimationFrame(schritt)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(lauf)
    }
  }, [])
  // Hauptbilder der verlinkten Projekte vorab laden, damit die Vorschau sofort da ist.
  useEffect(() => {
    for (const a of ABOUT.lebenslauf)
      for (const teile of [a.teile, ...(a.zeilen ?? []).flat()])
        for (const t of teile) {
          const p = t.link ? projektZu(t.link) : undefined
          if (p) new Image().src = p.bilder[0].src
        }
  }, [])
  // immer im Dokument — sonst gäbe es beim ersten Überfahren nichts, woraus das Bild wachsen kann
  const element = <img ref={bild} className={offen ? 'll-vorschau offen' : 'll-vorschau'} src={gezeigt?.bilder[0].src} alt="" aria-hidden />
  return { zeige, element }
}

// Verkleinertes Bild nicht angekommen: einmal das Original versuchen.
const original = (e: { currentTarget: HTMLImageElement }) => {
  const adresse = originalVon(e.currentTarget.getAttribute('src') ?? '')
  if (adresse) e.currentTarget.src = adresse
}

export default function About() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const vorschau = useVorschau()

  // Esc schließt die Seite wieder.
  useEffect(() => {
    document.title = `${ABOUT.titel} — Carolin Pflüger`
    zeigtAuf(REF)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !tipptImFeld()) {
        if (window.history.length > 1) navigate(-1)
        else navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  // /lebenslauf führt hierher (#lebenslauf): die Seite entsteht erst im Browser, der Sprung also auch.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])

  const mitBild = Boolean(ABOUT.bild || REF)
  return (
    <Vorschau.Provider value={vorschau.zeige}>
      <Kopf />
      <div className="about-seite">
        <h2 className="ll-kopf">
          <span {...feld(REF, 'title')}>{ABOUT.titel}</span>
        </h2>
        <section className={mitBild ? 'about-intro mit-bild' : 'about-intro'}>
          {ABOUT.bild ? (
            <img
              className="about-portraet"
              src={ABOUT.bild.src}
              width={ABOUT.bild.w}
              height={ABOUT.bild.h}
              alt="Carolin Pflüger"
              {...feld(REF, 'bild')}
              onError={original}
            />
          ) : (
            REF && (
              <div className="about-portraet leer" {...imAdmin(REF, 'bild')}>
                Porträt: hier klicken und im Admin hochladen
              </div>
            )
          )}
          <div className="about-text">
            <Fliesstext absaetze={ABOUT.absaetze} feldName="content" />
            {REF && ABOUT.absaetze.length === 0 && <p {...imAdmin(REF, 'content')}>Noch keine Kurzvorstellung. Hier klicken und im Admin schreiben.</p>}
          </div>
        </section>

        {(ABOUT.lebenslauf.length > 0 || REF) && (
          <section className="about-ll" id="lebenslauf">
            <h2 className="ll-kopf">
              <span>Lebenslauf</span>
              <a href={ABOUT.pdf} download>
                ↓ als PDF
              </a>
            </h2>
            <Fliesstext absaetze={ABOUT.lebenslauf} feldName="lebenslauf" />
            {REF && ABOUT.lebenslauf.length === 0 && <p {...imAdmin(REF, 'lebenslauf')}>Noch kein Lebenslauf. Hier klicken und im Admin schreiben.</p>}
          </section>
        )}
      </div>
      {vorschau.element}
    </Vorschau.Provider>
  )
}
