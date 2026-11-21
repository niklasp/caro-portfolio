import type { Bild } from '../data/projects'

// Ein Foto als Bild für Link-Vorschauen (og:image). Facebook, LinkedIn & Co. wollen ein JPEG
// von höchstens ein paar MB; WebP oder ein 20-MB-Original zeigen manche gar nicht an. Fotos aus
// der Mediathek holt deshalb der Bilddienst als JPEG, höchstens 1200 px breit. Zuschneiden
// (1200 × 630) kann der Bilddienst nicht — das übernehmen die Plattformen selbst.
const MEDIATHEK = '/_emdash/api/media/file/'
const BREITE = 1200

export interface Vorschau {
  src: string // Pfad oder volle Adresse
  w?: number
  h?: number
  alt: string
}

export function vorschauVon(bild: Bild, alt: string): Vorschau {
  // Verkleinerte Fotos tragen ihr Original in `href` (originalVon in src/data/projects.ts —
  // das Modul selbst liest beim Laden das DOM und taugt nicht für den Server).
  const original = bild.src.startsWith('/_image?') ? (new URLSearchParams(bild.src.slice(bild.src.indexOf('?'))).get('href') ?? bild.src) : bild.src
  if (!original.startsWith(MEDIATHEK)) return { src: bild.src, w: bild.w, h: bild.h, alt }
  const w = Math.min(BREITE, bild.w)
  return {
    src: `/_image?href=${encodeURIComponent(original)}&w=${w}&f=jpeg`,
    w,
    h: Math.round((w * bild.h) / bild.w),
    alt,
  }
}

// Beschreibungen für Suchergebnisse: eine Zeile, höchstens ~158 Zeichen, an einer Wortgrenze gekürzt.
export const kuerze = (text: string, max = 158) => {
  const zeile = text.replace(/\s+/g, ' ').trim()
  return zeile.length <= max ? zeile : `${zeile.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}
