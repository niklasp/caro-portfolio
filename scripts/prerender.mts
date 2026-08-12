// Prerender: erzeugt für jede Route eine echte HTML-Datei mit passenden
// SEO/OG-Tags — Crawler und Link-Vorschauen führen kein JavaScript aus.
// Läuft nach `vite build` über `node --experimental-strip-types`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PROJEKTE, permalink } from '../src/data/projects.ts'

const SITE = process.env.SITE_URL ?? 'https://niklasp.github.io/caro-portfolio/'
const vorlage = readFileSync('dist/index.html', 'utf8')

const ENTWUERFE = [
  { pfad: 'boden', name: 'Der Boden' },
  { pfad: 'drehbuehne', name: 'Die Drehbühne' },
  { pfad: 'schnuerboden', name: 'Der Schnürboden' },
  { pfad: 'spielplan', name: 'Der Spielplan' },
]

const kuerze = (text: string, max = 158) =>
  text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`

const entkomme = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function seite(pfad: string, titel: string, beschreibung: string, bild: string) {
  const tags = [
    `<meta property="og:title" content="${entkomme(titel)}" />`,
    `<meta property="og:description" content="${entkomme(beschreibung)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${SITE}${pfad}" />`,
    `<meta property="og:image" content="${bild}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${SITE}${pfad}" />`,
  ].join('\n    ')
  let html = vorlage.replace(/<title>[^<]*<\/title>/, `<title>${entkomme(titel)}</title>`)
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${entkomme(beschreibung)}$2`)
  // Eigene Tags zuerst — Parser nehmen das erste Vorkommen.
  html = html.replace('<meta property="og:site_name"', `${tags}\n    <meta property="og:site_name"`)
  mkdirSync(`dist/${pfad}`, { recursive: true })
  writeFileSync(`dist/${pfad}/index.html`, html)
}

let anzahl = 0
for (const e of ENTWUERFE) {
  seite(
    e.pfad,
    `${e.name} — Carolin Pflüger`,
    `Entwurf „${e.name}“: räumliches Portfolio von Carolin Pflüger — Bühne, Kostüm, Intervention, 2021 bis 2026.`,
    `${SITE}images/on-repeat-2.jpg`
  )
  anzahl++
  for (const p of PROJEKTE) {
    seite(
      `${e.pfad}/${permalink(p)}`,
      `${p.titel} (${p.jahr}) — Carolin Pflüger`,
      kuerze(`${p.rolle} · ${p.jahr} · ${p.ort}. ${p.blurb}`),
      `${SITE}images/${p.slug}-1.jpg`
    )
    anzahl++
  }
}
seite(
  'lebenslauf',
  'Lebenslauf — Carolin Pflüger',
  'Lebenslauf von Carolin Pflüger: Bühnen- und Kostümbildnerin, Kunstvermittlerin. Ausbildung, Werdegang, künstlerische Arbeiten, Auszeichnungen.',
  `${SITE}images/on-repeat-2.jpg`
)
anzahl++

console.log(`Prerender: ${anzahl} Seiten geschrieben.`)
