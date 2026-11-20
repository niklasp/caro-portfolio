import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { permalink, type Projekt } from '../data/projects'

// `anhang` (z. B. '#projekt') bleibt beim Synchronisieren an der URL hängen.
export function useProjektUrlSync(basis: string, projekt: Projekt | null | undefined, anhang = '') {
  const navigate = useNavigate()
  useEffect(() => {
    if (projekt) {
      document.title = `${projekt.titel} (${projekt.jahr}) — Carolin Pflüger`
      navigate(`${basis}/${permalink(projekt)}${anhang}`, { replace: true })
    } else {
      document.title = 'Carolin Pflüger — Bühne und Kostüm'
    }
  }, [basis, navigate, projekt, anhang])
}
