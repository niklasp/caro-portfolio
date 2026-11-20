import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'
import { ABOUT, originalVon } from '../data/projects'

// About — Titel, Bild und Text kommen aus dem CMS (Seiten → about).
export default function About() {
  const navigate = useNavigate()

  // Esc schließt die Seite wieder.
  useEffect(() => {
    document.title = `${ABOUT?.titel ?? 'About'} — Carolin Pflüger`
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
          <h2>{ABOUT?.titel ?? 'About'}</h2>
          {ABOUT?.bild && (
            <img
              src={ABOUT.bild.src}
              alt=""
              // Verkleinertes Bild nicht angekommen: einmal das Original versuchen
              onError={(e) => {
                const original = originalVon(e.currentTarget.getAttribute('src') ?? '')
                if (original) e.currentTarget.src = original
              }}
              style={{ maxWidth: 'min(100%, 520px)', height: 'auto', margin: '0 0 24px' }}
            />
          )}
          {ABOUT?.absaetze.map((a, i) => (a.art === 'h' ? <h3 key={i}>{a.text}</h3> : <p key={i}>{a.text}</p>))}
        </section>
      </div>
    </>
  )
}
