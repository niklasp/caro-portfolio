import { useEffect, useState } from 'react'
import { GUI } from 'dat.gui'
import { LED_STILE } from './ledSchrift'

// Stellwerk der Drehbühne: ein dat.gui-Panel zum Ausprobieren von Leinwand,
// Farben, Licht und Laufschrift. `cfg` ist der lebende Stand für die
// Frame-Schleife, der Hook liefert denselben Stand als React-State.

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

export interface DrehConfig {
  leinwand: Leinwand
  leinwandPassung: Passung
  leinwandReihen: number // Kacheln: so viele Bildreihen übereinander
  leinwandHell: number
  leinwandBild: string // hochgeladenes Bild (Objekt-URL) — überstimmt das Projektmotiv
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
  leinwand: 'rundhorizont',
  leinwandPassung: 'ausschnitt',
  leinwandReihen: 1,
  leinwandHell: 1,
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

const SPEICHER = 'drehbuehne-stellwerk'

const lade = (): DrehConfig => {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) ?? '{}')
    return { ...STANDARD, ...roh, leinwandBild: '' } // Objekt-URLs überleben kein Neuladen
  } catch {
    return { ...STANDARD }
  }
}

export const cfg: DrehConfig = lade()

export function useDrehConfig(): DrehConfig {
  const [stand, setStand] = useState<DrehConfig>(() => ({ ...cfg }))

  useEffect(() => {
    const melde = () => {
      setStand({ ...cfg })
      try {
        localStorage.setItem(SPEICHER, JSON.stringify({ ...cfg, leinwandBild: '' }))
      } catch {
        /* privates Fenster — dann eben ohne Merken */
      }
    }

    const Texte = GUI as unknown as { TEXT_OPEN: string; TEXT_CLOSED: string }
    // dat.gui benennt die Texte nach der Aktion: TEXT_OPEN steht auf dem zugeklappten Panel
    Texte.TEXT_OPEN = 'Stellwerk öffnen'
    Texte.TEXT_CLOSED = 'Stellwerk schließen'
    const gui = new GUI({ autoPlace: false, width: 300 })
    gui.domElement.classList.add('db-stellwerk')
    document.body.appendChild(gui.domElement)

    // Bild-Upload: dat.gui kennt nur Knöpfe — der Knopf öffnet einen versteckten Datei-Dialog.
    const datei = document.createElement('input')
    datei.type = 'file'
    datei.accept = 'image/*'
    datei.onchange = () => {
      const f = datei.files?.[0]
      if (!f) return
      if (cfg.leinwandBild) URL.revokeObjectURL(cfg.leinwandBild)
      cfg.leinwandBild = URL.createObjectURL(f)
      datei.value = ''
      melde()
    }
    const aktionen = {
      hochladen: () => datei.click(),
      bildWeg: () => {
        if (cfg.leinwandBild) URL.revokeObjectURL(cfg.leinwandBild)
        cfg.leinwandBild = ''
        melde()
      },
      zuruecksetzen: () => {
        Object.assign(cfg, STANDARD, { leinwandBild: cfg.leinwandBild })
        gui.updateDisplay()
        Object.values(gui.__folders).forEach((o) => o.updateDisplay())
        melde()
      },
    }

    // Jeder Ordner bekommt am Ende seinen eigenen Knopf, der nur seine Werte zurückstellt.
    const mitStandard = (ordner: GUI, schluessel: (keyof DrehConfig)[], danach?: () => void) =>
      ordner
        .add(
          {
            standard: () => {
              schluessel.forEach((k) => ((cfg as unknown as Record<string, unknown>)[k] = STANDARD[k]))
              danach?.()
              ordner.updateDisplay()
              melde()
            },
          },
          'standard'
        )
        .name('↺ Standard')

    const leinwand = gui.addFolder('Leinwand')
    leinwand.add(cfg, 'leinwand', LEINWAENDE).name('Art').onChange(melde)
    leinwand.add(cfg, 'leinwandPassung', PASSUNGEN).name('Motiv').onChange(melde)
    leinwand.add(cfg, 'leinwandReihen', 1, 4, 1).name('Kachel-Reihen').onChange(melde)
    leinwand.add(cfg, 'leinwandHell', 0.2, 3, 0.05).name('Helligkeit').onChange(melde)
    leinwand.add(aktionen, 'hochladen').name('Bild hochladen …')
    leinwand.add(aktionen, 'bildWeg').name('wieder Projektmotiv')
    mitStandard(leinwand, ['leinwand', 'leinwandPassung', 'leinwandReihen', 'leinwandHell'], aktionen.bildWeg)
    leinwand.open()

    const farben = gui.addFolder('Farben')
    farben.addColor(cfg, 'grund').name('Hintergrund').onChange(melde)
    farben.addColor(cfg, 'text').name('Text').onChange(melde)
    farben.addColor(cfg, 'scheibe').name('Scheibe').onChange(melde)
    mitStandard(farben, ['grund', 'text', 'scheibe'])
    farben.open()

    const licht = gui.addFolder('Licht')
    licht.add(cfg, 'licht', LICHTER).name('Stimmung').onChange(melde)
    licht.add(cfg, 'lichtStaerke', 0.2, 2.5, 0.05).name('Stärke').onChange(melde)
    licht.add(cfg, 'schatten').name('Schatten').onChange(melde)
    mitStandard(licht, ['licht', 'lichtStaerke', 'schatten'])
    licht.open()

    const kulissen = gui.addFolder('Kulissen')
    kulissen.add(cfg, 'objAufstellung', AUFSTELLUNGEN).name('Aufstellung').onChange(melde)
    kulissen.add(cfg, 'objGroesse', 0.4, 2.2, 0.01).name('Größe').onChange(melde)
    kulissen.add(cfg, 'objDicke', 0.02, 3, 0.01).name('Dicke der Blöcke').onChange(melde)
    kulissen.add(cfg, 'objRadius', 4, 12.6, 0.1).name('Abstand zur Mitte').onChange(melde)
    kulissen.add(cfg, 'objStreuung', 0, 3, 0.01).name('Streuung').onChange(melde)
    kulissen.add(cfg, 'objVerdrehung', 0, 8, 0.05).name('Verdrehung').onChange(melde)
    kulissen.add(cfg, 'objNeigung', -0.6, 0.6, 0.01).name('Neigung nach hinten').onChange(melde)
    kulissen.add(cfg, 'objSchweben', 0, 5, 0.05).name('Schweben').onChange(melde)
    kulissen.add(cfg, 'objAtmen', 0, 1, 0.01).name('Atmen (auf und ab)').onChange(melde)
    kulissen.add(cfg, 'objZurKamera', 0, 1, 0.01).name('Blick zum Publikum').onChange(melde)
    kulissen.add(cfg, 'objSchwung', 0, 1.5, 0.01).name('Schwung beim Drehen').onChange(melde)
    kulissen.add(cfg, 'objStapel', 0, 1, 0.01).name('Stapeln zum Turm').onChange(melde)
    kulissen.add(cfg, 'objAnzahl', 1, 3, 1).name('Fotos pro Projekt').onChange(melde)
    kulissen.add(cfg, 'objRueckseite').name('Rückseiten in Projektfarbe').onChange(melde)
    mitStandard(kulissen, [
      'objAufstellung',
      'objGroesse',
      'objDicke',
      'objRadius',
      'objStreuung',
      'objVerdrehung',
      'objNeigung',
      'objSchweben',
      'objAtmen',
      'objZurKamera',
      'objSchwung',
      'objStapel',
      'objAnzahl',
      'objRueckseite',
    ])

    const lauf = gui.addFolder('Laufschrift')
    lauf.add(cfg, 'laufschrift').name('an').onChange(melde)
    lauf.add(cfg, 'laufSchrift', LED_STILE).name('Schrift').onChange(melde)
    lauf.addColor(cfg, 'laufFarbe').name('Farbe').onChange(melde)
    lauf.add(cfg, 'laufText').name('Text (leer = Kategorie)').onFinishChange(melde)
    lauf.add(cfg, 'laufTempo', 0, 60, 1).name('Tempo').onChange(melde)
    lauf.add(cfg, 'laufZeilen', 7, 21, 1).name('Dioden-Zeilen').onFinishChange(melde)
    mitStandard(lauf, ['laufschrift', 'laufSchrift', 'laufFarbe', 'laufText', 'laufTempo', 'laufZeilen'])
    lauf.open()

    const bewegung = gui.addFolder('Bewegung')
    bewegung.add(cfg, 'wendeTempo', 1, 8, 0.1).name('Wenden').onChange(melde)
    bewegung.add(cfg, 'zoomDauer', 0.3, 2.5, 0.05).name('Ins Projekt (Sek.)').onChange(melde)
    mitStandard(bewegung, ['wendeTempo', 'zoomDauer'])

    gui.add(aktionen, 'zuruecksetzen').name('alles zurücksetzen')
    gui.close() // startet zugeklappt — der Balken oben rechts öffnet es

    return () => {
      gui.destroy()
      gui.domElement.remove()
    }
  }, [])

  return stand
}
