import { Routes, Route } from 'react-router-dom'
import Lebenslauf from './ansichten/Lebenslauf'
import About from './ansichten/About'
import Drehbuehne from './ideas/Drehbuehne'

// Die Drehbühne ist die Startseite. Ein Pfadmuster für `/`, `/drehbuehne` und
// `/drehbuehne/<projekt>`, damit die Bühne beim Wechsel der Adresse stehen bleibt.
export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/drehbuehne?/:projekt?" element={<Drehbuehne />} />
        <Route path="/lebenslauf" element={<Lebenslauf />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  )
}
