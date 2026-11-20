import { getEmDashCollection, getEmDashEntry, getSiteSettings, getTaxonomyTerms } from 'emdash'
import type { MediaValue, PortableTextBlock } from 'emdash'
import type { Absatz, Bild, Daten, KategorieEintrag, LebenslaufDaten, LlZeile, Projekt, SeitenText, TextTeil } from '../data/projects'
import type { Lebenslauf } from '../../emdash-env'
import { KONTAKT_FEST } from '../data/kontakt'
import {
  ANSICHTEN,
  AUFSTELLUNGEN,
  GRUND_ARTEN,
  GRUND_RICHTUNGEN,
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
const schlicht = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]/g, '')

// EmDashs Bearbeitungsmodus (Schalter in der Leiste unten) findet Inhalte über das Attribut
// `data-emdash-ref`. Die Marke gibt es nur in diesem Modus — Besucher bekommen keine.
function marke(eintrag: { edit: object } | null | undefined): { ref?: string } {
  const ref: unknown = (eintrag?.edit as Record<string, unknown> | undefined)?.['data-emdash-ref']
  return typeof ref === 'string' ? { ref } : {}
}

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
  grundArt: GRUND_ARTEN,
  grundRichtung: GRUND_RICHTUNGEN,
}
// Bilder kommen nicht als Text aus dem Eintrag, sondern als Mediathek-Bild.
const BILDER: Partial<Record<keyof DrehConfig, string>> = { leinwandBild: 'leinwand_bild', grundBild: 'grund_bild' }
const schlange = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

// Der Eintrag „Bühne" trägt dieselben Werte wie das Stellwerk, nur mit
// lesbaren Auswahltexten. Was fehlt oder nicht passt, bleibt beim Standard.
function alsBuehne(daten: object | undefined): Partial<DrehConfig> {
  if (!daten) return {}
  const eintrag = daten as Record<string, unknown>
  const aus: Record<string, unknown> = {}
  for (const [schluessel, standard] of Object.entries(STANDARD) as [keyof DrehConfig, unknown][]) {
    if (schluessel in BILDER) continue
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
  for (const [schluessel, feld] of Object.entries(BILDER)) {
    const bild = alsBild(eintrag[feld])
    if (bild) aus[schluessel] = bild.src
  }
  return aus as Partial<DrehConfig>
}

// Auszeichnungen aus dem Editor (Portable Text) → Schalter am Textstück.
const MARKEN: Record<string, keyof TextTeil> = { strong: 'fett', em: 'kursiv', underline: 'unter', 'strike-through': 'durch', code: 'code' }
// Nur Adressen, die ein Link sein dürfen: Web, Mail, Telefon, Seiten dieser Website.
const LINK_ERLAUBT = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i

type Block = {
  style?: string
  listItem?: string
  children?: { text?: string; marks?: string[] }[]
  markDefs?: { _key?: string; _type?: string; href?: string; blank?: boolean }[]
}

// Der Fließtext einer Seite: Überschriften, Absätze, Zitate und Listen, mit fett, kursiv und Links.
// Andere Blöcke des Editors (Bilder, Einbettungen) zeigt die Seite nicht.
function alsSeite(titel: string, bloecke: PortableTextBlock[] | undefined, bild: unknown): SeitenText {
  const absaetze: Absatz[] = []
  for (const roh of bloecke ?? []) {
    if (roh._type !== 'block') continue
    const block = roh as Block
    const links = new Map((block.markDefs ?? []).filter((m) => m._type === 'link' && m._key).map((m) => [m._key as string, m]))
    const teile: TextTeil[] = []
    for (const kind of block.children ?? []) {
      if (!kind.text) continue
      const teil: TextTeil = { text: kind.text }
      for (const marke of kind.marks ?? []) {
        const schalter = MARKEN[marke]
        if (schalter) (teil as unknown as Record<string, unknown>)[schalter] = true
        const link = links.get(marke)
        const adresse = link?.href?.trim() ?? ''
        if (LINK_ERLAUBT.test(adresse)) {
          teil.link = adresse
          if (link?.blank || /^https?:/i.test(adresse)) teil.neuesFenster = true
        }
      }
      teile.push(teil)
    }
    const inhalt = teile.map((t) => t.text).join('').trim()
    if (!inhalt) continue
    const stil = String(block.style ?? 'normal')
    const art: Absatz['art'] =
      block.listItem === 'number' ? 'nummer' : block.listItem ? 'punkt' : /^h[1-6]$/.test(stil) ? 'h' : stil === 'blockquote' ? 'zitat' : 'p'
    absaetze.push({ art, text: inhalt, teile })
  }
  return { titel, bild: alsBild(bild), absaetze }
}

// Die PDF, die schon vor dem CMS da war — sie gilt, solange im Admin keine hochgeladen ist.
const PDF_FEST = '/lebenslauf-carolin-pflueger.pdf'

const llZeilen = (liste: { jahr?: string | null; titel?: string | null; text?: string | null }[] | undefined): LlZeile[] =>
  (liste ?? [])
    .map((z) => ({ jahr: text(z?.jahr), ...(text(z?.titel) ? { titel: text(z?.titel) } : {}), text: text(z?.text) }))
    .filter((z) => z.jahr || z.titel || z.text)

function alsLebenslauf(d: Lebenslauf): LebenslaufDaten {
  return {
    titel: text(d.title) || 'Lebenslauf',
    einleitung: text(d.einleitung)
      .split('\n')
      .map((z) => z.trim())
      .filter(Boolean),
    pdf: (d.pdf && (d.pdf.url || bildAdresse(d.pdf))) || PDF_FEST,
    ausbildung: llZeilen(d.ausbildung),
    werdegang: llZeilen(d.werdegang),
    skills: (d.skills ?? []).map((z) => ({ titel: text(z?.titel), text: text(z?.text) })).filter((z) => z.titel || z.text),
    arbeiten: llZeilen(d.arbeiten),
    ausstellungen: llZeilen(d.ausstellungen),
    auszeichnungen: llZeilen(d.auszeichnungen),
  }
}

export async function ladeDaten(angemeldet: boolean): Promise<Daten> {
  const [projekte, begriffe, einstellungen, buehne, about, lebenslauf] = await Promise.all([
    getEmDashCollection('projekte', { limit: 500 }),
    getTaxonomyTerms('category'),
    getSiteSettings(),
    getEmDashEntry('buehne', 'drehbuehne'),
    getEmDashEntry('seiten', 'about'),
    getEmDashEntry('lebenslauf', 'lebenslauf'),
  ])

  const alleKategorien: KategorieEintrag[] = begriffe.map((b) => ({ id: b.slug, name: b.label }))
  // Leinwandbild je Kategorie: die Zeile nennt die Kategorie beim Namen — Groß-/Kleinschreibung
  // und Satzzeichen zählen nicht. Passt eine Zeile zu keiner Kategorie, bleibt sie ohne Wirkung.
  const gleich = (a: string, b: string) => schlicht(a) !== '' && schlicht(a) === schlicht(b)
  for (const zeile of buehne.entry?.data.leinwand_kategorien ?? []) {
    const kategorie = alleKategorien.find((k) => gleich(k.name, text(zeile?.kategorie)) || gleich(k.id, text(zeile?.kategorie)))
    const bild = alsBild(zeile?.bild)
    if (kategorie && bild && !kategorie.leinwand) kategorie.leinwand = bild.src
  }
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
      ...marke(eintrag),
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
    about: aboutDaten
      ? { ...alsSeite(aboutDaten.title?.trim() || 'About', aboutDaten.content, aboutDaten.bild), ...marke(about.entry) }
      : null,
    lebenslauf: lebenslauf.entry ? { ...alsLebenslauf(lebenslauf.entry.data), ...marke(lebenslauf.entry) } : null,
  }
}
