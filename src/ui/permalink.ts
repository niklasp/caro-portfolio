import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PROJEKTE, findByPermalink, permalink, type Projekt } from '../data/projects'

// Liest das Projekt aus der URL und hält Titel + URL synchron.
export function useProjektAusUrl(): Projekt | undefined {
  const { projekt: link } = useParams()
  return findByPermalink(link)
}

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

export const startIndexAusUrl = (link: string | undefined): number => {
  const pr = findByPermalink(link)
  return pr ? PROJEKTE.indexOf(pr) : 0
}
