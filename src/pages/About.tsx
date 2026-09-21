import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kopf } from '../ui/Chrome'

// About — vorerst leer, der Text kommt von Caro.
export default function About() {
  const navigate = useNavigate()

  // Esc schließt die Seite wieder.
  useEffect(() => {
    document.title = 'About — Carolin Pflüger'
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
          <h2>About</h2>
        </section>
      </div>
    </>
  )
}
