import { useSyncExternalStore } from 'react'
import { ABOUT, PROJEKTE } from './projects'

// EmDashs Bearbeitungsmodus: der Schalter in der Leiste unten, die Angemeldete auf der Seite
// sehen. Die Leiste macht anklickbar, was das Attribut `data-emdash-ref` trägt — einzeilige
// Texte lassen sich dann an Ort und Stelle ändern, alles andere öffnet den Eintrag im Admin.
// Die Marken liefert der Server nur in diesem Modus (src/cms/daten.ts); für Besucher ist
// hier alles leer und nichts wird angemeldet.

type Marke = { 'data-emdash-ref'?: string }
type Ref = { collection: string; id: string; field?: string }

const lies = (ref: string): Ref | null => {
  try {
    return JSON.parse(ref)
  } catch {
    return null
  }
}

// Marke für ein Feld eines Eintrags, zum Aufspreizen auf das Element, das genau dieses Feld zeigt.
export const feld = (ref: string | undefined, name: string): Marke =>
  ref ? { 'data-emdash-ref': JSON.stringify({ ...lies(ref), field: name }) } : {}

// Marke für den Eintrag als Ganzes: ein Klick öffnet ihn im Admin. Für Inhalte, die die
// Leiste nicht selbst bearbeiten kann (der Text der About-Seite).
export const imAdmin = (ref: string | undefined, name?: string): Marke & { onClick?: (e: { preventDefault: () => void }) => void } => {
  const r = ref ? lies(ref) : null
  if (!ref || !r) return {}
  const ziel = `/_emdash/admin/content/${encodeURIComponent(r.collection)}/${encodeURIComponent(r.id)}`
  return {
    'data-emdash-ref': ref,
    // Ein Link im Text soll dabei nicht auch noch aufgehen.
    onClick: (e) => (e.preventDefault(), void window.open(name ? `${ziel}?field=${encodeURIComponent(name)}` : ziel, fenster(r))),
  }
}

const fenster = (r: Ref) => `emdash-admin-${encodeURIComponent(r.collection)}/${encodeURIComponent(r.id)}`

// Der Pfeil „Im Admin öffnen" in der Leiste. Sie setzt ihn einmal beim Laden; wechselt das
// Projekt ohne Neuladen, zeigt er sonst weiter auf das alte.
export function zeigtAuf(ref: string | undefined) {
  const r = ref ? lies(ref) : null
  const link = document.getElementById('emdash-tb-admin') as HTMLAnchorElement | null
  if (!r || !link) return
  link.href = `/_emdash/admin/content/${encodeURIComponent(r.collection)}/${encodeURIComponent(r.id)}`
  link.target = fenster(r)
  link.style.display = ''
}

const AN = Boolean(ABOUT.ref || PROJEKTE.some((p) => p.ref))

// Wird gerade in einem Feld getippt? Dann gehören Pfeiltasten und Esc dem Feld, nicht der
// Bühne. Die Leiste beendet das Bearbeiten bei Esc selbst, bevor die Taste bei den Seiten
// ankommt — deshalb merkt sich das hier schon der erste Halt des Ereignisses.
let imFeld = false
export const tipptImFeld = (): boolean => imFeld

// Geänderte Texte landen auch in den Daten im Browser: sonst stünde nach dem Weiterdrehen
// und Zurückkommen wieder der alte Text da, obwohl der neue gespeichert ist.
const TEXTE: Record<string, Record<string, string>> = {
  projekte: { title: 'titel', rolle: 'rolle', jahr: 'jahr', ort: 'ort', beschreibung: 'blurb' },
  seiten: { title: 'titel' },
}

let stand = 0
const hoerer = new Set<() => void>()
const abonniere = (h: () => void) => {
  hoerer.add(h)
  return () => hoerer.delete(h)
}

// Zeichnet die Ansicht neu, sobald ein Text an Ort und Stelle geändert wurde.
export const useBearbeitet = (): number => useSyncExternalStore(abonniere, () => stand)

if (AN) {
  window.addEventListener('keydown', (e) => (imFeld = (e.target as HTMLElement | null)?.isContentEditable === true), true)

  document.addEventListener('focusout', (e) => {
    const el = e.target as HTMLElement | null
    const r = lies(el?.getAttribute?.('data-emdash-ref') ?? '')
    const schluessel = r?.field && TEXTE[r.collection]?.[r.field]
    if (!el || !r || !schluessel) return
    const eintrag = [...PROJEKTE, ABOUT].find((e) => e?.ref && lies(e.ref)?.id === r.id) as
      | Record<string, unknown>
      | undefined
    const neu = el.innerText.trim()
    if (!eintrag || eintrag[schluessel] === neu) return
    eintrag[schluessel] = neu
    stand++
    hoerer.forEach((h) => h())
  })
}
