import { useEffect, useState } from 'react'
import type { GUI as Panel } from 'dat.gui'
import {
  ANSICHTEN,
  AUFSTELLUNGEN,
  LEINWAENDE,
  LED_STILE,
  LICHTER,
  MOTIVE,
  PASSUNGEN,
  STANDARD as WERK_STANDARD,
  type DrehConfig,
} from './drehWerte'
import { ANGEMELDET, BUEHNE } from '../data/projects'

export * from './drehWerte'

// Stellwerk der Drehbühne: ein dat.gui-Panel zum Ausprobieren von Leinwand,
// Farben, Licht und Laufschrift. `cfg` ist der lebende Stand für die
// Frame-Schleife, der Hook liefert denselben Stand als React-State.

// Standard = Werkseinstellung, überschrieben vom CMS-Eintrag „Bühne" — das ist
// der Stand, den alle Besucher sehen.
export const STANDARD: DrehConfig = { ...WERK_STANDARD, ...BUEHNE }

const SPEICHER = 'drehbuehne-stellwerk'

// Eigene Versuche im Stellwerk bleiben im Browser — aber nur, solange der
// CMS-Stand derselbe ist, auf dem sie entstanden sind. Ändert sich der Eintrag
// „Bühne" im Admin, gilt wieder er.
const BASIS = JSON.stringify(STANDARD)

const lade = (): DrehConfig => {
  // Besucher sehen immer den CMS-Stand — eigene Versuche gibt es nur mit Stellwerk.
  if (!ANGEMELDET) return { ...STANDARD }
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) ?? '{}')
    if (roh.basis !== BASIS) return { ...STANDARD }
    return { ...STANDARD, ...roh.werte, leinwandBild: STANDARD.leinwandBild } // Objekt-URLs überleben kein Neuladen
  } catch {
    return { ...STANDARD }
  }
}

export const cfg: DrehConfig = lade()

export function useDrehConfig(): DrehConfig {
  const [stand, setStand] = useState<DrehConfig>(() => ({ ...cfg }))

  useEffect(() => {
    // Das Panel ist ein Werkzeug für Angemeldete, kein Teil der Seite.
    if (!ANGEMELDET) return
    const melde = () => {
      setStand({ ...cfg })
      try {
        localStorage.setItem(SPEICHER, JSON.stringify({ basis: BASIS, werte: { ...cfg, leinwandBild: '' } }))
      } catch {
        /* privates Fenster — dann eben ohne Merken */
      }
    }

    // dat.gui lädt erst hier und nur für Angemeldete — Besucher bekommen das Paket nie.
    let raeume: (() => void) | undefined
    let weg = false
    void import('dat.gui').then(({ GUI }) => {
      if (weg) return
      raeume = baue(GUI, melde)
    })
    return () => {
      weg = true
      raeume?.()
    }
  }, [])

  return stand
}

// Baut das Panel auf und gibt zurück, wie man es wieder abräumt.
function baue(GUI: typeof Panel, melde: () => void): () => void {
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
  const mitStandard = (ordner: Panel, schluessel: (keyof DrehConfig)[], danach?: () => void) =>
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

  const ansicht = gui.addFolder('Projektansicht')
  ansicht.add(cfg, 'ansicht', ANSICHTEN).name('Aufbau').onChange(melde)
  mitStandard(ansicht, ['ansicht'])
  ansicht.open()

  const leinwand = gui.addFolder('Leinwand')
  leinwand.add(cfg, 'leinwand', LEINWAENDE).name('Art').onChange(melde)
  leinwand.add(cfg, 'leinwandMotiv', MOTIVE).name('Bild').onChange(melde)
  leinwand.add(cfg, 'leinwandPassung', PASSUNGEN).name('Motiv').onChange(melde)
  leinwand.add(cfg, 'leinwandReihen', 1, 4, 1).name('Kachel-Reihen').onChange(melde)
  leinwand.add(cfg, 'leinwandHell', 0.2, 3, 0.05).name('Helligkeit').onChange(melde)
  leinwand.add(aktionen, 'hochladen').name('Bild hochladen …')
  leinwand.add(aktionen, 'bildWeg').name('wieder Projektmotiv')
  mitStandard(leinwand, ['leinwand', 'leinwandMotiv', 'leinwandPassung', 'leinwandReihen', 'leinwandHell'], aktionen.bildWeg)
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
}
