import type { APIRoute } from 'astro'
import { ladeDaten } from '../cms/daten'
import { basisAdresse } from '../cms/adresse'

// Sitemap der Website. EmDashs eigene (/sitemap.xml aus dem Paket) listet nur Sammlungen mit
// SEO-Feldern und kennt weder die Startseite noch die Bühnenadressen; diese Datei ersetzt sie
// (EmDash lässt die eigene weg, sobald es hier eine gibt). robots.txt verweist schon darauf.
// Gelistet ist, was Besucher sehen: Startseite, About und jedes Projekt auf der Bühne, mit
// seinen Fotos für die Bildersuche.
export const prerender = false

const xml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export const GET: APIRoute = async ({ url }) => {
  const daten = await ladeDaten(false) // nur Veröffentlichtes
  const basis = await basisAdresse(url)
  const absolut = (pfad: string) => new URL(pfad, `${basis}/`).href

  const eintrag = (pfad: string, bilder: string[] = []) =>
    [
      '  <url>',
      `    <loc>${xml(absolut(pfad))}</loc>`,
      ...bilder.map((b) => `    <image:image><image:loc>${xml(absolut(b))}</image:loc></image:image>`),
      '  </url>',
    ].join('\n')

  const seiten = [
    eintrag('/', ['/og-carolin-pflueger.jpg']),
    eintrag('/about', daten.about.bild ? [daten.about.bild.src] : []),
    ...daten.projekte.map((p) => eintrag(`/drehbuehne/${encodeURIComponent(p.slug)}`, p.bilder.map((b) => b.src))),
  ]

  const text = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...seiten,
    '</urlset>',
  ].join('\n')

  return new Response(text, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
