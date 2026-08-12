import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PROJEKTE, findByPermalink, permalink, type Projekt } from '../data/projects'

// Liest das Projekt aus der URL und hält Titel + URL synchron.
export function useProjektAusUrl(): Projekt | undefined {
  const { projekt: link } = useParams()
  return findByPermalink(link)
}

export function useProjektUrlSync(basis: string, projekt: Projekt | null | undefined) {
  const navigate = useNavigate()
  useEffect(() => {
    if (projekt) {
      document.title = `${projekt.titel} (${projekt.jahr}) — Carolin Pflüger`
      navigate(`${basis}/${permalink(projekt)}`, { replace: true })
    } else {
      document.title = 'Carolin Pflüger — Bühne und Kostüm'
    }
  }, [basis, navigate, projekt])
}

export const startIndexAusUrl = (link: string | undefined): number => {
  const pr = findByPermalink(link)
  return pr ? PROJEKTE.indexOf(pr) : 0
}
