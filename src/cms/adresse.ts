import { getSiteSettings } from 'emdash'

// Öffentliche Adresse der Website, ohne Schrägstrich am Ende: die „Website-URL" aus den
// Einstellungen, sonst die aufgerufene. So nennen kanonische Links, Vorschaubilder und die
// Sitemap die eigene Domain, sobald sie im Admin eingetragen ist — auch wenn die Seite über
// die workers.dev-Adresse aufgerufen wird (EmDashs robots.txt rechnet genauso).
export async function basisAdresse(aufgerufen: URL): Promise<string> {
  const einstellungen = await getSiteSettings() // pro Anfrage zwischengespeichert
  return einstellungen.url?.trim().replace(/\/+$/, '') || aufgerufen.origin
}

export const PERSON_ID = (basis: string) => `${basis}/#person`
