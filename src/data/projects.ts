import type { DrehConfig } from '../ideas/drehWerte'

export interface Bild {
  src: string
  w: number
  h: number
  ar: number
}

// Verkleinerte Fotos laufen über den Bilddienst (`/_image?href=<Original>`).
// Antwortet er nicht, hilft das Original aus `href`.
export const originalVon = (src: string): string | null =>
  src.startsWith('/_image?') ? new URLSearchParams(src.slice(src.indexOf('?'))).get('href') : null

export interface ProjektLink {
  label: string
  url: string
}

// Die Seiten der Drehbühne — jede zeigt eine Kategorie (im Admin: „Kategorien", EmDashs eingebaute Taxonomie `category`).
export interface KategorieEintrag {
  id: string
  name: string
}
export type Kategorie = string

export interface Projekt {
  slug: string // zugleich der Permalink, z. B. lost-2025
  titel: string
  rolle: string
  jahr: string
  jahrNum: number
  ort: string
  kategorie: Kategorie
  farbe: string
  blurb: string
  credits: string[]
  links?: ProjektLink[]
  video?: string
  videoDatei?: string
  bilder: Bild[]
}

export interface Kontakt {
  name: string
  untertitel: string
  adresse: string[]
  email: string
  telefon: string
  instagram: string
}

export interface SeitenText {
  titel: string
  bild?: Bild
  absaetze: { art: 'h' | 'p'; text: string }[]
}

// Eine Zeile im Lebenslauf: Jahr und Text, bei künstlerischen Arbeiten mit Titel.
export interface LlZeile {
  jahr: string
  titel?: string
  text: string
}

// Der Lebenslauf aus dem CMS (Sammlung „Lebenslauf", Eintrag `lebenslauf`).
// Die Reihenfolge der Zeilen ist die im Admin.
export interface LebenslaufDaten {
  titel: string
  einleitung: string[]
  pdf: string
  ausbildung: LlZeile[]
  werdegang: LlZeile[]
  skills: { titel: string; text: string }[]
  arbeiten: LlZeile[]
  ausstellungen: LlZeile[]
  auszeichnungen: LlZeile[]
}

// Alles, was die Seite aus dem CMS braucht. Der Server (src/cms/daten.ts) baut
// es aus EmDash und legt es als JSON in die Seite (src/layouts/Seite.astro).
export interface Daten {
  kategorien: KategorieEintrag[]
  projekte: Projekt[]
  kontakt: Kontakt
  buehne: Partial<DrehConfig>
  about: SeitenText | null
  lebenslauf: LebenslaufDaten | null
  // Im Admin angemeldet: nur dann erscheint das Stellwerk auf der Bühne.
  angemeldet: boolean
}

// Die Drehbühne baut ihre Listen schon beim Laden des Moduls — deshalb liest
// dieses Modul das JSON synchron, bevor React überhaupt startet.
const lies = (): Daten => JSON.parse(document.getElementById('caro-daten')!.textContent!)

const DATEN = lies()

export const KATEGORIEN: KategorieEintrag[] = DATEN.kategorien
export const PROJEKTE: Projekt[] = DATEN.projekte
export const KONTAKT: Kontakt = DATEN.kontakt
export const BUEHNE: Partial<DrehConfig> = DATEN.buehne
export const LEBENSLAUF: LebenslaufDaten | null = DATEN.lebenslauf
export const ABOUT: SeitenText | null = DATEN.about
export const ANGEMELDET: boolean = DATEN.angemeldet

export const permalink = (p: Projekt): string => p.slug
export const findByPermalink = (link: string | null | undefined): Projekt | undefined =>
  PROJEKTE.find((p) => p.slug === link)

export const byKategorie = (k: Kategorie): Projekt[] => PROJEKTE.filter((p) => p.kategorie === k)
