// Der Lebenslauf als Rich Text: aus den Zeilen der alten Sammlung „Lebenslauf" (Jahr, Titel, Text je Abschnitt)
// wird Portable Text für das Feld `lebenslauf` des About-Eintrags — Überschriften, Absätze und je Abschnitt
// eine Tabelle mit zwei Spalten (Jahr | Text), die Carolin im Editor weiterschreibt.
//
// Ohne Abhängigkeiten, damit es überall läuft: auf der Website (solange live noch die alte Sammlung gilt,
// src/cms/daten.ts), beim Umbau des Seeds und im Umzugsskript (~/code/caro-sicherung/lebenslauf-umziehen.mjs).

export interface AlterLebenslauf {
  einleitung?: string | null
  ausbildung?: AlteZeile[] | null
  werdegang?: AlteZeile[] | null
  skills?: { titel?: string | null; text?: string | null }[] | null
  arbeiten?: AlteZeile[] | null
  ausstellungen?: AlteZeile[] | null
  auszeichnungen?: AlteZeile[] | null
}
type AlteZeile = { jahr?: string | null; titel?: string | null; text?: string | null }

type Span = { _type: 'span'; _key: string; text: string; marks: string[] }
type LinkDef = { _type: 'link'; _key: string; href: string }
export type PtBlock =
  | { _type: 'block'; _key: string; style: string; markDefs: LinkDef[]; children: Span[] }
  | {
      _type: 'table'
      _key: string
      rows: { _type: 'tableRow'; _key: string; cells: { _type: 'tableCell'; _key: string; content: Span[]; markDefs?: LinkDef[] }[] }[]
    }

// Projekttitel vergleichen wie die alte Seite: ohne Groß-/Kleinschreibung und Satzzeichen.
const schlicht = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]/g, '')
const rein = (t: string | null | undefined) => (t ?? '').trim()

export function lebenslaufAlsText(alt: AlterLebenslauf, projekte: { titel: string; slug: string }[]): PtBlock[] {
  let n = 0
  const key = () => `ll${(n++).toString(36)}`
  const span = (text: string, marks: string[] = []): Span => ({ _type: 'span', _key: key(), text, marks })
  const block = (style: string, text: string): PtBlock => ({ _type: 'block', _key: key(), style, markDefs: [], children: [span(text)] })
  const aus: PtBlock[] = []

  // Eine Zeile: links das Jahr, rechts der Text. Werke tragen vorn ihren Titel (fett kursiv) —
  // gibt es das Projekt auf der Seite, ist der Titel ein Link dorthin.
  const tabelle = (zeilen: AlteZeile[] | null | undefined) => {
    const rows = (zeilen ?? [])
      .map((z) => ({ jahr: rein(z.jahr), titel: rein(z.titel), text: rein(z.text) }))
      .filter((z) => z.jahr || z.titel || z.text)
      .map((z) => {
        const markDefs: LinkDef[] = []
        const inhalt: Span[] = []
        if (z.titel) {
          const projekt = projekte.find((p) => schlicht(p.titel) === schlicht(z.titel))
          const marks = ['strong', 'em']
          if (projekt) {
            const link: LinkDef = { _type: 'link', _key: key(), href: `/drehbuehne/${projekt.slug}` }
            markDefs.push(link)
            marks.push(link._key)
          }
          inhalt.push(span(`${z.titel}.`, marks))
          if (z.text) inhalt.push(span(` ${z.text}`))
        } else inhalt.push(span(z.text))
        return {
          _type: 'tableRow' as const,
          _key: key(),
          cells: [
            { _type: 'tableCell' as const, _key: key(), content: [span(z.jahr)] },
            { _type: 'tableCell' as const, _key: key(), content: inhalt, ...(markDefs.length ? { markDefs } : {}) },
          ],
        }
      })
    return rows.length ? [{ _type: 'table' as const, _key: key(), rows }] : []
  }
  const abschnitt = (titel: string, zeilen: AlteZeile[] | null | undefined) => {
    const t = tabelle(zeilen)
    if (t.length) aus.push(block('h3', titel), ...t)
  }

  const einleitung = rein(alt.einleitung)
  if (einleitung) aus.push(block('normal', einleitung))
  abschnitt('Ausbildung', alt.ausbildung)
  abschnitt('Beruflicher Werdegang', alt.werdegang)
  for (const s of alt.skills ?? []) {
    if (rein(s.titel)) aus.push(block('h3', rein(s.titel)))
    if (rein(s.text)) aus.push(block('normal', rein(s.text)))
  }
  const werke = [alt.arbeiten, alt.ausstellungen, alt.auszeichnungen].some((l) => (l ?? []).length > 0)
  if (werke) aus.push(block('h2', 'künstlerische Arbeiten'))
  abschnitt('Bühne und Kostüm', alt.arbeiten)
  abschnitt('Ausstellungen', alt.ausstellungen)
  abschnitt('Auszeichnungen', alt.auszeichnungen)
  return aus
}
