import { useEffect, useRef, useState } from 'react'
import { PROJEKTE } from '../data/projects'
import { useParams } from 'react-router-dom'
import { startIndexAusUrl, useProjektUrlSync } from '../ui/permalink'
import { Kopf, Fuss, EntwurfSchalter } from '../ui/Chrome'
import Lichtkasten from '../ui/Lichtkasten'
import { flags } from '../ui/flags'

// Entwurf 4 — Der Spielplan.
// Flach wie das gedruckte Portfolio, navigiert wie ein Register:
// hoch/runter wechselt das Projekt, links/rechts blättert durch
// Fotos und Beschreibung. Die Farbfläche fährt hinter den Titel —
// das Hover aus der Übersicht als Navigationsprinzip.

const N = PROJEKTE.length
const mod = (a: number, n: number) => ((a % n) + n) % n

export default function Spielplan() {
  const { projekt: linkParam } = useParams()
  const [pi, setPi] = useState(() => startIndexAusUrl(linkParam))
  useProjektUrlSync('/spielplan', PROJEKTE[pi])
  const [si, setSi] = useState(0)
  const [lichtkasten, setLichtkasten] = useState<number | null>(null)
  const radAcc = useRef({ x: 0, y: 0, t: 0 })
  const wrap = useRef<HTMLDivElement>(null)
  const inline = useRef<HTMLDivElement>(null)
  const balken = useRef<HTMLDivElement>(null)

  // Ein kleines Farbquadrat läuft der Maus hinterher (multiply) —
  // über markierten Elementen wächst es auf ungefähr deren Größe.
  useEffect(() => {
    let raf = 0
    const pos = { x: window.innerWidth * 0.4, y: window.innerHeight * 0.5 }
    const ziel = { ...pos }
    const groesse = { w: 22, h: 22 }
    const zielGroesse = { w: 22, h: 22 }
    const onMove = (e: PointerEvent) => {
      ziel.x = e.clientX
      ziel.y = e.clientY
      const t = (e.target as Element | null)?.closest?.('[data-balken-ziel]')
      if (t) {
        const r = t.getBoundingClientRect()
        zielGroesse.w = r.width
        zielGroesse.h = r.height
      } else {
        zielGroesse.w = 22
        zielGroesse.h = 22
      }
    }
    const tick = () => {
      pos.x += (ziel.x - pos.x) * 0.6
      pos.y += (ziel.y - pos.y) * 0.6
      groesse.w += (zielGroesse.w - groesse.w) * 0.28
      groesse.h += (zielGroesse.h - groesse.h) * 0.28
      const el = balken.current
      if (el) {
        el.style.width = `${groesse.w}px`
        el.style.height = `${groesse.h}px`
        el.style.transform = `translate(${pos.x - groesse.w / 2}px, ${pos.y - groesse.h / 2}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  // Auf großen Bildschirmen steht die Beschreibung im Leerraum unter dem Titel —
  // das Karussell blättert dann nur durch die Fotos.
  const [breit, setBreit] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1100px)')
    const on = () => setBreit(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Die Beschreibung reagiert leicht auf die Maus.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = inline.current
      if (!el) return
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      el.style.transform = `translate(${nx * -6}px, ${ny * -4}px)`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const projekt = PROJEKTE[pi]
  const anzahlSlides = projekt.bilder.length + (breit ? 0 : 1) // klein: Fotos + Beschreibung
  const siC = Math.min(si, anzahlSlides - 1)
  const istText = !breit && siC === projekt.bilder.length

  const geheProjekt = (delta: number) => {
    setPi((p) => mod(p + delta, N))
    setSi(0)
    setLichtkasten(null)
  }
  const geheSlide = (delta: number) => setSi((s) => mod(s + delta, anzahlSlides))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flags.lightbox) return
      if (e.key === 'ArrowDown') geheProjekt(1)
      if (e.key === 'ArrowUp') geheProjekt(-1)
      if (e.key === 'ArrowRight') geheSlide(1)
      if (e.key === 'ArrowLeft') geheSlide(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (flags.lightbox) return
      const r = radAcc.current
      const jetzt = performance.now()
      if (jetzt - r.t < 450) return
      r.x += e.deltaX
      r.y += e.deltaY
      if (Math.abs(r.y) > 70 && Math.abs(r.y) > Math.abs(r.x)) {
        geheProjekt(Math.sign(r.y))
        r.x = 0; r.y = 0; r.t = jetzt
      } else if (Math.abs(r.x) > 70) {
        geheSlide(Math.sign(r.x))
        r.x = 0; r.y = 0; r.t = jetzt
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const vorher = PROJEKTE[mod(pi - 1, N)]
  const nachher = PROJEKTE[mod(pi + 1, N)]
  const bild = istText ? null : projekt.bilder[siC]

  return (
    <div className="spielplan" ref={wrap}>
      <Kopf />
      <EntwurfSchalter />

      <div className="sp-spalten">
        <div className="sp-links">
          <button className="sp-nachbar" data-balken-ziel onClick={() => geheProjekt(-1)} aria-label="Vorheriges Projekt">
            <span className="farbflaeche" style={{ background: vorher.farbe }} />
            <span className="sp-nachbar-text">↑ {vorher.titel}</span>
          </button>

          <div className="sp-aktiv" key={projekt.slug}>
            <span className="sp-eyebrow">
              {String(pi + 1).padStart(2, '0')} / {String(N).padStart(2, '0')} · {projekt.jahr} · {projekt.ort}
            </span>
            <h2 data-balken-ziel>
              <span className="sp-rect" style={{ background: projekt.farbe }} />
              <span className="sp-titel-text">{projekt.titel}</span>
            </h2>
            <span className="sp-rolle">{projekt.rolle}</span>
            {breit && (
              <>
                <div className="sp-inline" ref={inline} data-balken-ziel>
                  <p className="blurb ov-anim-3">{projekt.blurb}</p>
                  <div className="credits ov-anim-3">
                    {projekt.credits.map((c) => (
                      <div key={c}>{c}</div>
                    ))}
                  </div>
                  {projekt.links && (
                    <div className="sp-inline-links ov-anim-3" style={{ marginTop: 10 }}>
                      {projekt.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button className="sp-nachbar" data-balken-ziel onClick={() => geheProjekt(1)} aria-label="Nächstes Projekt">
            <span className="farbflaeche" style={{ background: nachher.farbe }} />
            <span className="sp-nachbar-text">↓ {nachher.titel}</span>
          </button>
        </div>

        <div className="sp-rechts">
          <div className="sp-slide" key={`${projekt.slug}-${siC}`}>
            {bild ? (
              <figure data-balken-ziel onClick={() => setLichtkasten(siC)} style={{ cursor: 'zoom-in' }}>
                {projekt.videoDatei && siC === 0 ? (
                  <video src={projekt.videoDatei} autoPlay muted loop playsInline />
                ) : (
                  <img src={bild.src} alt={`${projekt.titel}, Bild ${siC + 1}`} />
                )}
              </figure>
            ) : (
              <div className="sp-beschreibung">
                <div className="farbbalken" style={{ background: projekt.farbe }} />
                <p className="blurb">{projekt.blurb}</p>
                <div className="credits">
                  {projekt.credits.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
                {projekt.links && (
                  <div className="links" style={{ marginTop: 14 }}>
                    {projekt.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ borderBottom: '1px solid', marginRight: 14 }}>
                        {l.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sp-zaehler">
            <button onClick={() => geheSlide(-1)} aria-label="Zurück">←</button>
            <span>
              {istText ? 'Beschreibung' : `Bild ${String(siC + 1).padStart(2, '0')} / ${String(projekt.bilder.length).padStart(2, '0')}`}
            </span>
            <button onClick={() => geheSlide(1)} aria-label="Weiter">→</button>
          </div>
        </div>
      </div>

      <div className="hinweis">↑ ↓ Projekt · ← → Bilder · Bild anklicken: groß</div>
      {breit && <div className="sp-balken-maus" ref={balken} style={{ background: projekt.farbe }} />}
      <Fuss projekt={projekt} />
      {lichtkasten !== null && (
        <Lichtkasten
          projekt={projekt}
          start={Math.min(lichtkasten, projekt.bilder.length - 1)}
          onClose={() => setLichtkasten(null)}
        />
      )}
    </div>
  )
}
