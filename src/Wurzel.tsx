import { BrowserRouter } from 'react-router-dom'
import App from './App'

// Einstieg der React-Insel: Astro liefert die Seite und die Daten, ab hier
// übernimmt der Router im Browser (Wechsel zwischen Projekten ohne Neuladen).
export default function Wurzel() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
