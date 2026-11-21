import { Routes, Route, Navigate } from 'react-router-dom'
import About from './ansichten/About'
import Drehbuehne from './ideas/Drehbuehne'

// Die Drehbühne ist die Startseite. Ein Pfadmuster für `/`, `/drehbuehne` und
// `/drehbuehne/<projekt>`, damit die Bühne beim Wechsel der Adresse stehen bleibt.
export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/drehbuehne?/:projekt?" element={<Drehbuehne />} />
        {/* Der Lebenslauf steht jetzt auf About. */}
        <Route path="/lebenslauf" element={<Navigate to={{ pathname: '/about', hash: '#lebenslauf' }} replace />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  )
}
