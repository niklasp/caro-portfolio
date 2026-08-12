import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Lebenslauf from './pages/Lebenslauf'
import Boden from './ideas/Boden'
import Drehbuehne from './ideas/Drehbuehne'
import Schnuerboden from './ideas/Schnuerboden'
import Spielplan from './ideas/Spielplan'

const TASTEN: Record<string, string> = {
  '1': '/boden',
  '2': '/drehbuehne',
  '3': '/schnuerboden',
  '4': '/spielplan',
}

export default function App() {
  const navigate = useNavigate()

  // Tasten 1–4 springen direkt zum jeweiligen Entwurf.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const ziel = TASTEN[e.key]
      if (ziel) navigate(ziel)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lebenslauf" element={<Lebenslauf />} />
        <Route path="/boden/:projekt?" element={<Boden />} />
        <Route path="/drehbuehne/:projekt?" element={<Drehbuehne />} />
        <Route path="/schnuerboden/:projekt?" element={<Schnuerboden />} />
        <Route path="/spielplan/:projekt?" element={<Spielplan />} />
      </Routes>
    </div>
  )
}
