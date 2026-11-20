import { LED_STILE } from './ledSchrift'

// Die Werte des Stellwerks ohne Browser-Abhängigkeiten: Auswahllisten, Typ und
// Standard. Der Server (src/cms/daten.ts) übersetzt damit den CMS-Eintrag
// „Bühne" in eine DrehConfig, das Stellwerk baut daraus sein Panel.

export const LEINWAENDE = {
  Rundhorizont: 'rundhorizont',
  'Vollbild (ganze Seite)': 'vollbild',
  'Oberer Bildschirmteil': 'oben',
  'Rundum-Panorama': 'rundum',
  Bodenprojektion: 'boden',
  'Schwebende Leinwand': 'leinwand',
  'Keine Leinwand': 'aus',
} as const
export type Leinwand = (typeof LEINWAENDE)[keyof typeof LEINWAENDE]

// Wie das Motiv auf die Leinwand kommt: beschnitten (füllend) oder ganz zu sehen.
export const PASSUNGEN = {
  'Ausschnitt, Maus führt': 'ausschnitt',
  'Ausschnitt, fest': 'fest',
  'Ganzes Bild': 'ganz',
  'Ganzes Bild, Rand gefüllt': 'ganzRand',
  'Gekachelt, gespiegelt': 'kacheln',
  'Gekachelt, gerade': 'kachelnGerade',
} as const
export type Passung = (typeof PASSUNGEN)[keyof typeof PASSUNGEN]

// Feste Motive für die Leinwand (von Carolin) — leer heißt: das Foto des vordersten Projekts.
export const MOTIVE = {
  'Projektmotiv (wechselt)': '',
  'Matratze im Grün': '/images/leinwand/matratze.webp',
  'Containerhof mit Kränen': '/images/leinwand/kraene.webp',
  'Container in Reihe': '/images/leinwand/container.webp',
} as const
export type Motiv = (typeof MOTIVE)[keyof typeof MOTIVE]

export const LICHTER = {
  'Verfolger (Maus)': 'verfolger',
  'Fokus aufs Hauptprojekt': 'fokus',
  Arbeitslicht: 'arbeitslicht',
  Gegenlicht: 'gegenlicht',
  'Farbwechsler (drei Farben)': 'farben',
  Suchscheinwerfer: 'sucher',
} as const
export type Licht = (typeof LICHTER)[keyof typeof LICHTER]

// Wie die drei Fotos eines Projekts auf der Scheibe stehen.
export const AUFSTELLUNGEN = {
  'Frei gestellt': 'frei',
  'Hauptbild hinten, zwei kleine davor': 'hauptbild',
  Nebeneinander: 'reihe',
  Fächer: 'faecher',
  'Treppe nach vorn': 'treppe',
} as const
export type Aufstellung = (typeof AUFSTELLUNGEN)[keyof typeof AUFSTELLUNGEN]

// Wie die Projektansicht (breites Fenster) die Fotos und den Text setzt. Schmale
// Fenster scrollen immer: Fotos in voller Breite, Text darunter.
export const ANSICHTEN = {
  'Große Bilder untereinander, Text haftet seitlich': 'stapel',
  'Jedes Bild in voller Spaltenbreite, Text haftet seitlich': 'spalte',
  'Bildraster neben dem Text (ohne Scrollen)': 'raster',
  'Bildraster in voller Breite, Text darunter': 'breit',
} as const
export type Ansicht = (typeof ANSICHTEN)[keyof typeof ANSICHTEN]

export interface DrehConfig {
  ansicht: Ansicht
  leinwand: Leinwand
  leinwandPassung: Passung
  leinwandReihen: number // Kacheln: so viele Bildreihen übereinander
  leinwandHell: number
  leinwandMotiv: Motiv // festes Motiv statt des Projektfotos
  leinwandBild: string // hochgeladenes Bild (Objekt-URL) — überstimmt beides
  grund: string
  text: string
  scheibe: string
  licht: Licht
  lichtStaerke: number
  schatten: boolean
  laufschrift: boolean
  laufText: string // leer = Name der Kategorie
  laufSchrift: string
  laufFarbe: string
  laufTempo: number
  laufZeilen: number
  wendeTempo: number
  zoomDauer: number
  // Kulissen: die Foto-Blöcke auf der Scheibe
  objAufstellung: Aufstellung
  objGroesse: number
  objDicke: number
  objRadius: number
  objStreuung: number
  objVerdrehung: number
  objNeigung: number
  objSchweben: number
  objAtmen: number
  objZurKamera: number
  objSchwung: number
  objStapel: number
  objAnzahl: number
  objRueckseite: boolean
}

export const STANDARD: DrehConfig = {
  ansicht: 'spalte',
  leinwand: 'rundhorizont',
  leinwandPassung: 'ausschnitt',
  leinwandReihen: 1,
  leinwandHell: 1,
  leinwandMotiv: '',
  leinwandBild: '',
  grund: '#0c0c0c',
  text: '#ffffff',
  scheibe: '#4a4a4a',
  licht: 'verfolger',
  lichtStaerke: 1,
  schatten: true,
  laufschrift: true,
  laufText: '',
  laufSchrift: 'dioden',
  laufFarbe: '#ff1c0d',
  laufTempo: 16,
  laufZeilen: 16,
  wendeTempo: 3.4,
  zoomDauer: 0.95,
  objAufstellung: 'frei',
  objGroesse: 1,
  objDicke: 0.5,
  objRadius: 11.2,
  objStreuung: 1,
  objVerdrehung: 1,
  objNeigung: 0,
  objSchweben: 0,
  objAtmen: 0,
  objZurKamera: 0,
  objSchwung: 0,
  objStapel: 0,
  objAnzahl: 3,
  objRueckseite: false,
}

// Was das Licht mit der vordersten Kulisse und ihren Nachbarn macht.
export const LICHT_WIRKUNG: Record<Licht, { vornSkala: number; rest: number }> = {
  verfolger: { vornSkala: 1, rest: 0.55 },
  fokus: { vornSkala: 1.18, rest: 0.4 },
  arbeitslicht: { vornSkala: 1, rest: 1 },
  gegenlicht: { vornSkala: 1, rest: 0.7 },
  farben: { vornSkala: 1, rest: 0.8 },
  sucher: { vornSkala: 1, rest: 0.75 },
}

export { LED_STILE }
