import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Lebenslauf from './pages/Lebenslauf'
import Boden from './ideas/Boden'
import Drehbuehne from './ideas/Drehbuehne'
import Schnuerboden from './ideas/Schnuerboden'
import Spielplan from './ideas/Spielplan'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lebenslauf" element={<Lebenslauf />} />
        <Route path="/boden" element={<Boden />} />
        <Route path="/drehbuehne" element={<Drehbuehne />} />
        <Route path="/schnuerboden" element={<Schnuerboden />} />
        <Route path="/spielplan" element={<Spielplan />} />
      </Routes>
    </div>
  )
}
