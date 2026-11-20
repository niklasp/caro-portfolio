import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'
import { ABOUT, originalVon, type Absatz, type TextTeil } from '../data/projects'
import { feld, imAdmin, tipptImFeld, zeigtAuf } from '../data/bearbeiten'

// Nur im Bearbeitungsmodus gesetzt: EmDashs Marke für den Eintrag (src/data/bearbeiten.ts).
const REF = ABOUT?.ref

// Ein Textstück mit seiner Auszeichnung aus dem Editor: fett, kursiv, unterstrichen, durchgestrichen, Link.
function Teil({ teil }: { teil: TextTeil }) {
  let inhalt: ReactNode = teil.text
  if (teil.code) inhalt = <code>{inhalt}</code>
  if (teil.durch) inhalt = <s>{inhalt}</s>
  if (teil.unter) inhalt = <u>{inhalt}</u>
  if (teil.kursiv) inhalt = <em>{inhalt}</em>
  if (teil.fett) inhalt = <strong>{inhalt}</strong>
  if (teil.link)
    inhalt = (
      <a href={teil.link} {...(teil.neuesFenster ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {inhalt}
      </a>
    )
  return <>{inhalt}</>
}

const ELEMENT = { h: 'h3', p: 'p', zitat: 'blockquote', punkt: 'li', nummer: 'li' } as const

// Der Fließtext: Absätze, Überschriften und Zitate der Reihe nach; aufeinanderfolgende Listenpunkte bilden eine Liste.
// Den Text kann EmDashs Leiste hier nicht bearbeiten — im Bearbeitungsmodus öffnet ein Klick den Admin.
function Fliesstext({ absaetze }: { absaetze: Absatz[] }) {
  const zeile = (a: Absatz, i: number) => {
    const Element = ELEMENT[a.art]
    return (
      <Element key={i} {...imAdmin(REF, 'content')}>
        {a.teile.map((t, j) => (
          <Teil key={j} teil={t} />
        ))}
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

// About — Titel, Bild und Text kommen aus dem CMS (Seiten → about).
export default function About() {
  const navigate = useNavigate()

  // Esc schließt die Seite wieder.
  useEffect(() => {
    document.title = `${ABOUT?.titel ?? 'About'} — Carolin Pflüger`
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

  return (
    <>
      <Kopf />
      <div className="lebenslauf about">
        <section>
          <h2 {...feld(REF, 'title')}>{ABOUT?.titel ?? 'About'}</h2>
          {ABOUT?.bild && (
            <img
              src={ABOUT.bild.src}
              alt=""
              {...feld(REF, 'bild')}
              // Verkleinertes Bild nicht angekommen: einmal das Original versuchen
              onError={(e) => {
                const original = originalVon(e.currentTarget.getAttribute('src') ?? '')
                if (original) e.currentTarget.src = original
              }}
              style={{ maxWidth: '100%', height: 'auto', margin: '0 0 24px' }}
            />
          )}
          {ABOUT && <Fliesstext absaetze={ABOUT.absaetze} />}
          {REF && ABOUT?.absaetze.length === 0 && <p {...imAdmin(REF, 'content')}>Noch kein Text. Hier klicken und im Admin schreiben.</p>}
        </section>
      </div>
    </>
  )
}
