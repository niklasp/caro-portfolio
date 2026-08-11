import { useEffect, useState } from 'react'
import type { Projekt } from '../data/projects'
import { flags } from './flags'
import Lichtkasten from './Lichtkasten'

// Projektdetail im Stil der »Beschreibung«-Spalte des gedruckten Portfolios.
// Bilder öffnen im Lichtkasten (Shader-Übergang), Pfeiltasten wechseln das Projekt.
export default function Overlay({ projekt, onClose }: { projekt?: Projekt | null; onClose: () => void }) {
  const [lichtkasten, setLichtkasten] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flags.lightbox) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Beim Projektwechsel offenen Lichtkasten schließen.
  useEffect(() => setLichtkasten(null), [projekt?.slug])

  if (!projekt) return null

  return (
    <>
      <div className="overlay-rueck" onClick={onClose} />
      <aside className="overlay" aria-label={`Beschreibung ${projekt.titel}`} key={projekt.slug}>
        <div className="ov-kopf">
          <span className="ov-hinweis">← → nächstes Projekt · Bild anklicken: groß</span>
          <button className="schliessen" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="farbbalken ov-anim-1" style={{ background: projekt.farbe }} />
        <h2 className="ov-anim-2">{projekt.titel}</h2>
        <p className="meta ov-anim-2">
          {projekt.rolle} · {projekt.jahr} · {projekt.ort}
        </p>
        <p className="blurb ov-anim-3">{projekt.blurb}</p>
        <div className="credits ov-anim-3">
          {projekt.credits.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        {projekt.links && (
          <div className="links ov-anim-3">
            {projekt.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        )}
        <div className="bilder ov-anim-4">
          {projekt.bilder.map((b, i) => (
            <div key={b.src}>
              <button className="ov-bild" onClick={() => setLichtkasten(i)} aria-label={`Bild ${i + 1} groß zeigen`}>
                <img src={b.src} alt={`${projekt.titel}, Bild ${i + 1}`} loading="lazy" />
              </button>
              <div className="bild-unterschrift" style={{ marginTop: 2 }}>
                <span>{projekt.rolle}</span>
                <span>{projekt.jahr}</span>
                <span>
                  {projekt.titel}, {projekt.ort}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>
      {lichtkasten !== null && (
        <Lichtkasten projekt={projekt} start={lichtkasten} onClose={() => setLichtkasten(null)} />
      )}
    </>
  )
}
