import { getEmDashCollection, getEmDashEntry, getSiteSettings, getTaxonomyTerms } from 'emdash'
import type { MediaValue, PortableTextBlock } from 'emdash'
import type { Bild, Daten, Projekt, SeitenText } from '../data/projects'
import { KONTAKT_FEST } from '../data/kontakt'
import {
  ANSICHTEN,
  AUFSTELLUNGEN,
  LED_STILE,
  LEINWAENDE,
  LICHTER,
  MOTIVE,
  PASSUNGEN,
  STANDARD,
  type DrehConfig,
} from '../ideas/drehWerte'

// Holt alles aus EmDash und bringt es in die Form, mit der die Drehbühne
// (React, three.js) arbeitet. Läuft bei jedem Seitenaufruf auf dem Server.

// Farben aus dem gedruckten Portfolio: die vollflächigen Rechtecke.
const FARBEN: Record<string, string> = {
  Blau: '#1512eb',
  Orange: '#e0873a',
  Magenta: '#ff00e6',
  Pink: '#ee5fc4',
}

// Fotos aus der Mediathek haben kein `src` — die Adresse ergibt sich aus dem Speicherschlüssel.
function bildAdresse(bild: MediaValue): string | undefined {
  if (bild.src) return bild.src
  if ((bild.provider ?? 'local') !== 'local') return bild.previewUrl
  const schluessel = typeof bild.meta?.storageKey === 'string' ? bild.meta.storageKey : bild.id
  return schluessel ? `/_emdash/api/media/file/${schluessel}` : undefined
}

// Jedes Foto wird auf der Bühne zur WebGL-Textur. Ein Kamera-Original mit 6000 px würde
// Ladezeit und Grafikspeicher sprengen — breitere Uploads liefert deshalb der Bilddienst
// verkleinert. Die Projektansicht zeigt Fotos höchstens 1100 px breit (mal 1,5 Pixeldichte).
const BREITE_MAX = 1600
const MEDIATHEK = '/_emdash/api/media/file/'

function alsBild(wert: unknown): Bild | undefined {
  if (!wert || typeof wert !== 'object') return undefined
  const bild = wert as MediaValue
  const original = bildAdresse(bild)
  if (!original) return undefined
  // Ohne bekannte Maße (sehr alte oder fremde Einträge) gilt ein Querformat 3:2.
  const w = bild.width && bild.width > 0 ? bild.width : 1500
  const h = bild.height && bild.height > 0 ? bild.height : 1000
  // Die Adresse trägt das Original in `href`: fällt der Bilddienst aus, lädt der Browser das (`originalVon`).
  const zuBreit = w > BREITE_MAX && original.startsWith(MEDIATHEK)
  const src = zuBreit ? `/_image?href=${encodeURIComponent(original)}&w=${BREITE_MAX}&f=webp` : original
  return { src, w, h, ar: w / h }
}

const text = (wert: unknown): string => (typeof wert === 'string' ? wert.trim() : '')

// „seit 2021" → 2021; ohne Jahreszahl zählt das Erscheinungsjahr des Eintrags.
function jahrZahl(jahr: string, ersatz: Date | null | undefined): number {
  const treffer = jahr.match(/\d{4}/)
  if (treffer) return Number(treffer[0])
  return (ersatz ?? new Date()).getFullYear()
}

const KARTEN: Partial<Record<keyof DrehConfig, Record<string, string>>> = {
  ansicht: ANSICHTEN,
  leinwand: LEINWAENDE,
  leinwandMotiv: MOTIVE,
  leinwandPassung: PASSUNGEN,
  licht: LICHTER,
  objAufstellung: AUFSTELLUNGEN,
  laufSchrift: LED_STILE,
}
const schlange = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

// Der Eintrag „Bühne" trägt dieselben Werte wie das Stellwerk, nur mit
// lesbaren Auswahltexten. Was fehlt oder nicht passt, bleibt beim Standard.
function alsBuehne(daten: object | undefined): Partial<DrehConfig> {
  if (!daten) return {}
  const eintrag = daten as Record<string, unknown>
  const aus: Record<string, unknown> = {}
  for (const [schluessel, standard] of Object.entries(STANDARD) as [keyof DrehConfig, unknown][]) {
    if (schluessel === 'leinwandBild') continue
    const roh = eintrag[schlange(schluessel)]
    if (roh === undefined || roh === null) continue
    const karte = KARTEN[schluessel]
    if (karte) {
      if (typeof roh === 'string' && roh in karte) aus[schluessel] = karte[roh]
    } else if (typeof standard === 'number') {
      if (typeof roh === 'number' && Number.isFinite(roh)) aus[schluessel] = roh
    } else if (typeof standard === 'boolean') {
      aus[schluessel] = Boolean(roh)
    } else if (typeof roh === 'string') {
      const istFarbe = /^#[0-9a-f]{6}$/i.test(String(standard))
      if (!istFarbe || /^#[0-9a-f]{6}$/i.test(roh.trim())) aus[schluessel] = roh.trim()
    }
  }
  const eigenes = alsBild(eintrag.leinwand_bild)
  if (eigenes) aus.leinwandBild = eigenes.src
  return aus as Partial<DrehConfig>
}

function alsSeite(titel: string, bloecke: PortableTextBlock[] | undefined, bild: unknown): SeitenText {
  const absaetze: SeitenText['absaetze'] = []
  for (const block of bloecke ?? []) {
    if (block._type !== 'block') continue
    const kinder = (block as { children?: { text?: string }[] }).children ?? []
    const inhalt = kinder.map((k) => k.text ?? '').join('').trim()
    if (!inhalt) continue
    const stil = String((block as { style?: string }).style ?? 'normal')
    absaetze.push({ art: /^h[1-6]$/.test(stil) ? 'h' : 'p', text: inhalt })
  }
  return { titel, bild: alsBild(bild), absaetze }
}

export async function ladeDaten(angemeldet: boolean): Promise<Daten> {
  const [projekte, begriffe, einstellungen, buehne, about] = await Promise.all([
    getEmDashCollection('projekte', { limit: 500 }),
    getTaxonomyTerms('category'),
    getSiteSettings(),
    getEmDashEntry('buehne', 'drehbuehne'),
    getEmDashEntry('seiten', 'about'),
  ])

  const alleKategorien = begriffe.map((b) => ({ id: b.slug, name: b.label }))
  const letzte = alleKategorien.at(-1)?.id ?? ''

  // Reihenfolge auf der Bühne: kleine Zahl vorn. Ohne Zahl steht ein Projekt
  // ganz vorn — so landet ein neues Projekt von selbst an erster Stelle.
  const platz = (wert: number | undefined) => (typeof wert === 'number' && Number.isFinite(wert) ? wert : -Infinity)
  const geordnet = [...(projekte.entries ?? [])].sort((a, b) => platz(a.data.position) - platz(b.data.position))

  const liste: Projekt[] = []
  for (const eintrag of geordnet) {
    const d = eintrag.data
    const bilder = (d.bilder ?? []).map((z) => alsBild(z?.bild)).filter((b): b is Bild => Boolean(b))
    // Ohne Foto gibt es nichts, was auf der Bühne stehen könnte.
    if (bilder.length === 0) continue

    // Genau eine Seite der Bühne: die erste gewählte Kategorie, sonst die letzte der Liste.
    const gewaehlt = (d.terms?.category ?? []).map((t) => t.slug)
    const kategorie = alleKategorien.find((k) => gewaehlt.includes(k.id))?.id ?? letzte

    const jahr = text(d.jahr)
    const links = (d.links ?? [])
      .map((l) => ({ label: text(l?.label), url: text(l?.url) }))
      .filter((l) => l.label && l.url)

    liste.push({
      slug: eintrag.id,
      titel: text(d.title) || eintrag.id,
      rolle: text(d.rolle),
      jahr,
      jahrNum: jahrZahl(jahr, d.publishedAt),
      ort: text(d.ort),
      kategorie,
      farbe: FARBEN[text(d.farbe)] ?? FARBEN.Blau,
      blurb: text(d.beschreibung),
      credits: text(d.credits)
        .split('\n')
        .map((z) => z.trim())
        .filter(Boolean),
      ...(links.length ? { links } : {}),
      ...(text(d.video) ? { video: text(d.video) } : {}),
      ...(text(d.video_datei) ? { videoDatei: text(d.video_datei) } : {}),
      bilder,
    })
  }

  // Nur Kategorien mit Projekten bekommen eine Seite der Bühne.
  const kategorien = alleKategorien.filter((k) => liste.some((p) => p.kategorie === k.id))

  const aboutDaten = about.entry?.data

  return {
    kategorien,
    projekte: liste,
    kontakt: {
      name: einstellungen.title?.trim() || 'Carolin Pflüger',
      untertitel: einstellungen.tagline?.trim() ?? '',
      ...KONTAKT_FEST,
    },
    buehne: alsBuehne(buehne.entry?.data),
    angemeldet,
    about: aboutDaten ? alsSeite(aboutDaten.title?.trim() || 'About', aboutDaten.content, aboutDaten.bild) : null,
  }
}
