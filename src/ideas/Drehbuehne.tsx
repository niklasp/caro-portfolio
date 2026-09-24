import { useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'
import { KATEGORIEN, KONTAKT, byKategorie, findByPermalink, type Projekt } from '../data/projects'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useProjektUrlSync } from '../ui/permalink'
import { Kopf, Fuss } from '../ui/Chrome'
import { flags } from '../ui/flags'
import { daempf } from './helpers'
import { cfg, useDrehConfig, LICHT_WIRKUNG, type DrehConfig, type Leinwand, type Licht } from './drehConfig'
import { ledRaster } from './ledSchrift'

// Entwurf 2 — Die Drehbühne.
// Ein schwarzer Bühnenraum mit einem echten Verfolger: Die Maus führt das
// Licht, die Fotos stehen als beleuchtete Blöcke auf der Drehscheibe, und
// hinten hängt — stark abgedunkelt — das Hauptmotiv des vordersten Projekts.
// Die Scheibe lässt sich wenden wie eine Münze: jede Seite trägt eine
// Kategorie, am Rand läuft ihr Name als rote LED-Laufschrift. Ein Klick auf
// ein Foto der vordersten Kulisse öffnet das Projekt: dieselben Fotos heben von
// der Scheibe ab und ordnen sich vor der Kamera zum Bildraster wie im
// gedruckten Portfolio, die übrigen Bilder des Projekts kommen dazu.

const SAMMLUNG = KATEGORIEN.map((k) => byKategorie(k.id))
const RADIUS = 11.2
const SCHEIBE_R = 13.4
const SCHEIBE_H = 0.62
const FOTO_DICKE = 0.5
const DETAIL_HASH = '#projekt'

const mod = (a: number, n: number) => ((a % n) + n) % n
const schrittVon = (kat: number) => (Math.PI * 2) / SAMMLUNG[kat].length

interface DrehCtrl {
  ang: number
  tang: number
}

// Wenden: flip läuft fziel hinterher, ein Vielfaches von π pro Seite.
interface WendeCtrl {
  flip: number
  fziel: number
}

// Detailansicht: t läuft 0 → 1, gross ist das Foto, das vor der Kamera steht.
interface DetailCtrl {
  offen: boolean
  t: number
  gross: number | null
  grossT: number
}

// Aufstellung der drei Fotos einer Kulisse.
const LAGEN = [
  { x: -0.85, z: 0.07, b: 2.6, ry: 0.05 },
  { x: 1.18, z: 0.6, b: 1.68, ry: -0.12 },
  { x: 0.28, z: 1.15, b: 1.35, ry: 0.09 },
]
// Weitere Aufstellungen (Stellwerk → Kulissen). Die Geometrie bleibt die der freien
// Aufstellung, die Breite hier skaliert sie nur — so wechselt die Aufstellung ohne Neuaufbau.
const AUFSTELLUNG_LAGEN: Record<string, typeof LAGEN> = {
  frei: LAGEN,
  hauptbild: [
    { x: 0, z: -0.5, b: 4.4, ry: 0 }, // so breit wie der Platz eines Projekts auf der Scheibe
    { x: -1.3, z: 1.2, b: 1.4, ry: 0.14 },
    { x: 1.3, z: 1.25, b: 1.4, ry: -0.14 },
  ],
  reihe: [
    { x: -1.75, z: 0.45, b: 1.55, ry: 0.16 },
    { x: 0, z: 0.2, b: 1.55, ry: 0 },
    { x: 1.75, z: 0.45, b: 1.55, ry: -0.16 },
  ],
  faecher: [
    { x: -1.35, z: 0.55, b: 2.1, ry: 0.5 },
    { x: 0, z: 0, b: 2.1, ry: 0 },
    { x: 1.35, z: 0.55, b: 2.1, ry: -0.5 },
  ],
  treppe: [
    { x: -1.2, z: -0.4, b: 2.9, ry: 0.08 },
    { x: 0.35, z: 0.5, b: 2.0, ry: -0.05 },
    { x: 1.55, z: 1.3, b: 1.3, ry: 0.1 },
  ],
}

const KAMERA_HEIM = new THREE.Vector3(0, 3.1, 28.5)
const BLICK_HEIM = new THREE.Vector3(0, 2.0, 0)
const FOV = 34
// Schmale Fenster (Hochformat, Telefon): der Blick wird weiter, damit die Bühne in
// der Breite nicht abgeschnitten wird — mindestens 46° waagrecht, höchstens 75° senkrecht.
const fovFuer = (aspekt: number) =>
  THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(23)) / aspekt)), FOV, 75)
// Ab hier gilt das schmale Layout — dieselbe Grenze steht in styles.css (.db … @media).
const istSchmal = (breite: number, hoehe: number) => breite < 900 || breite / hoehe < 1.1

// Normierte Mausposition — führt Verfolger und Blickpunkt.
const maus = { x: 0, y: 0 }

const weich = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

// ---------- Auftakt: Ladeschirm ----------
// Der Name der Künstlerin füllt sich von links in der Farbe des vordersten Projekts,
// während die Fotos laden. Erst wenn alles da ist — und der Auftakt kurz zu sehen war —
// hebt sich der Vorhang. Einmal pro Sitzung; wer vom Lebenslauf zurückkommt, wartet nicht.
let auftaktGezeigt = false
const AUFTAKT_MIN = 1.7 // Sekunden, die der Auftakt mindestens steht
const AUFTAKT_MAX = 9 // danach geht es auch ohne letztes Bild weiter

function Auftakt({ farbe, onFertig }: { farbe: string; onFertig: () => void }) {
  const { active, progress } = useProgress()
  const lade = useRef({ active, progress, gesehen: false })
  lade.current.active = active
  lade.current.progress = progress
  if (active) lade.current.gesehen = true
  const [fuell, setFuell] = useState(0)
  const [weg, setWeg] = useState(false)

  useEffect(() => {
    auftaktGezeigt = true
    const start = performance.now()
    let ende = 0
    let f = 0
    const takt = window.setInterval(() => {
      const zeit = (performance.now() - start) / 1000
      const l = lade.current
      const fertig = zeit >= AUFTAKT_MIN && ((l.gesehen && !l.active && l.progress >= 100) || zeit > AUFTAKT_MAX || (!l.gesehen && zeit > 3))
      // Der Name läuft stetig zu, immer langsamer, und kommt erst ganz an, wenn die
      // Bilder da sind. Der echte Ladestand hebt ihn an, wenn er weiter ist.
      f += ((fertig ? 1 : 0.985) - f) * (fertig ? 0.3 : 0.035)
      if (l.gesehen) f = Math.max(f, (l.progress / 100) * 0.9)
      setFuell(f)
      if (fertig && !ende) {
        ende = window.setTimeout(() => setWeg(true), 700) // der volle Name darf kurz stehen
        window.clearInterval(takt)
      }
    }, 80)
    return () => {
      window.clearInterval(takt)
      window.clearTimeout(ende)
    }
  }, [])

  return (
    <div
      className={weg ? 'db-auftakt weg' : 'db-auftakt'}
      style={{ '--farbe': farbe, '--fuell': fuell } as React.CSSProperties}
      onTransitionEnd={weg ? onFertig : undefined}
      aria-hidden
    >
      <div className="db-auftakt-name">{KONTAKT.name}</div>
      <div className="db-auftakt-unter">{KONTAKT.untertitel}</div>
    </div>
  )
}

// ---------- Bildraster der Detailansicht ----------
// Im Kameraraum, RASTER_D vor der Kamera: links das Raster, rechts bleibt Platz
// für die Beschreibung, unten links für den Titel — wie eine Seite im Portfolio.

const RASTER_D = 12
const RASTER_LUECKE = 0.09

interface Zelle {
  x: number // Mitte
  y: number
  b: number
  h: number
}

const sichtfeld = (aspekt: number, abstand = RASTER_D) => {
  const h = 2 * abstand * Math.tan(THREE.MathUtils.degToRad(fovFuer(aspekt) / 2))
  return { b: h * aspekt, h }
}
// Schmales Layout: die Seite scrollt, das Bildraster im Kameraraum rollt mit (Pixel).
const rollen = { px: 0 }
const rollWelt = (aspekt: number, hoehePx: number) => (rollen.px / hoehePx) * sichtfeld(aspekt).h

// Zeilen im Blocksatz: jede Zeile füllt die Breite, die Bilder behalten ihr Format.
// Bei höchstens elf Bildern lassen sich alle Zeilenumbrüche durchprobieren — es
// gewinnt die Aufteilung mit der größten Bildfläche bei möglichst gleich hohen Zeilen.
const rasterCache = new Map<string, Zelle[]>()

// Scrollt die Projektansicht? Schmal immer; breit je nach Stellwerk (Ordner „Projektansicht").
const rollt = (breite: number, hoehe: number) => istSchmal(breite, hoehe) || cfg.ansicht !== 'raster'

// Stapel und Spalte, in Pixeln: links die Bildspalte, rechts daneben der Text. Die Bildspalte
// wächst nicht über SPALTE_MAX hinaus — auf sehr breiten Schirmen rückt das Ganze in die Mitte.
const SPALTE_MAX = 1100
function spaltenMasse(breite: number) {
  const textB = Math.min(400, 0.3 * breite)
  const spalt = 56 // zwischen Bildspalte und Text
  let randL = 0.06 * breite
  let spalteB = breite - randL - spalt - textB - 40
  if (spalteB > SPALTE_MAX) {
    spalteB = SPALTE_MAX
    randL = (breite - spalteB - spalt - textB) / 2
  }
  return { randL, spalteB, textL: randL + spalteB + spalt, textB }
}

function bildraster(ars: number[], breite: number, hoehe: number): Zelle[] {
  const schmal = istSchmal(breite, hoehe)
  const ansicht = schmal ? 'breit' : cfg.ansicht
  const schluessel = `${ansicht}|${Math.round(breite)}x${Math.round(hoehe)}|${ars.join()}`
  const fertig = rasterCache.get(schluessel)
  if (fertig) return fertig
  if (rasterCache.size > 400) rasterCache.clear() // beim Ziehen am Fenster sammelt sich sonst jede Größe an

  const sicht = sichtfeld(breite / hoehe)
  const links = -0.44 * sicht.b
  const oben = 0.36 * sicht.h
  const zellen: Zelle[] = []

  // Stapel und Spalte: jedes Foto füllt die Spalte links, eins unter dem anderen — die Seite
  // scrollt, die Beschreibung haftet rechts (Breite in Pixeln, siehe .ansicht-stapel .db-beschreibung).
  // Stapel: zwei Hochformate teilen sich eine Zeile, keins wird höher als der Schirm.
  // Spalte: jedes Bild ganz in Spaltenbreite, die Höhe folgt seinem Format.
  if (ansicht === 'stapel' || ansicht === 'spalte') {
    const masse = spaltenMasse(breite)
    const B = (masse.spalteB / breite) * sicht.b
    const linksSpalte = (masse.randL / breite - 0.5) * sicht.b
    const hMax = ansicht === 'stapel' ? 0.8 * sicht.h : Infinity
    let y = oben
    for (let i = 0; i < ars.length; ) {
      const paar = ansicht === 'stapel' && ars[i] < 1 && i + 1 < ars.length && ars[i + 1] < 1
      const zeile = paar ? [i, i + 1] : [i]
      const h = Math.min(hMax, (B - RASTER_LUECKE * (zeile.length - 1)) / zeile.reduce((a, k) => a + ars[k], 0))
      let x = linksSpalte
      zeile.forEach((k) => {
        zellen[k] = { x: x + (h * ars[k]) / 2, y: y - h / 2, b: h * ars[k], h }
        x += h * ars[k] + RASTER_LUECKE
      })
      y -= h + RASTER_LUECKE
      i += zeile.length
    }
    rasterCache.set(schluessel, zellen)
    return zellen
  }

  // Raster: rechts bleibt die Spalte der Beschreibung frei (ihre Breite in Pixeln, siehe
  // .db-beschreibung). Breit: das Raster nimmt die ganze Breite, der Text steht darunter.
  const textspalte = Math.min(290, 0.3 * breite) * 1.23 + 76
  const B = (ansicht === 'breit' ? 0.88 : Math.min(0.64, 0.94 - textspalte / breite)) * sicht.b
  // Raster: endet über dem großen Titel. Breit scrollt die Seite — am Telefon knapp, im
  // breiten Fenster darf das Raster fast den ganzen Schirm füllen.
  const H = (ansicht === 'breit' ? (schmal ? 0.5 : 1.2) : 0.55) * sicht.h
  let beste: { zeilen: number[][]; hoehen: number[]; wert: number } | null = null

  const pruefe = (zeilen: number[][]) => {
    let hoehen = zeilen.map((z) => (B - RASTER_LUECKE * (z.length - 1)) / z.reduce((a, i) => a + ars[i], 0))
    const platz = H - RASTER_LUECKE * (zeilen.length - 1)
    const s = Math.min(1, platz / hoehen.reduce((a, h) => a + h, 0), (H * 0.66) / Math.max(...hoehen))
    hoehen = hoehen.map((h) => h * s)
    const flaeche = zeilen.reduce((a, z, k) => a + hoehen[k] ** 2 * z.reduce((b, i) => b + ars[i], 0), 0)
    // Fläche allein reicht nicht: ein Block, der die Höhe ausfüllt, schlägt einen flachen
    // Streifen (2×2 statt 1×4), und lange Zeilen mit vielen kleinen Fotos wirken gedrängt —
    // ab vier Fotos pro Zeile kostet jedes weitere 30 %.
    const genutzt = hoehen.reduce((a, h) => a + h, 0) + RASTER_LUECKE * (zeilen.length - 1)
    const laengste = Math.max(...zeilen.map((z) => z.length))
    const wert =
      flaeche *
      Math.sqrt(Math.min(...hoehen) / Math.max(...hoehen)) *
      Math.min(1, genutzt / H) *
      Math.min(1, Math.min(...hoehen) / (0.3 * H)) *
      0.7 ** Math.max(0, laengste - 3)
    if (!beste || wert > beste.wert) beste = { zeilen, hoehen, wert }
  }
  const teile = (ab: number, zeilen: number[][]) => {
    if (ab === ars.length) return pruefe(zeilen)
    if (zeilen.length === 4) return
    for (let bis = ab + 1; bis <= ars.length; bis++)
      teile(bis, [...zeilen, Array.from({ length: bis - ab }, (_, k) => ab + k)])
  }
  teile(0, [])

  let y = oben
  beste!.zeilen.forEach((z, k) => {
    const h = beste!.hoehen[k]
    let x = links
    z.forEach((i) => {
      zellen[i] = { x: x + (h * ars[i]) / 2, y: y - h / 2, b: h * ars[i], h }
      x += h * ars[i] + RASTER_LUECKE
    })
    y -= h + RASTER_LUECKE
  })
  rasterCache.set(schluessel, zellen)
  return zellen
}

// ---------- Hintergrund: abgeschattetes Hauptmotiv, mit Dithering gegen Banding ----------

const HG_VERT = /* glsl */ `
uniform float uSchirm;
uniform vec2 uSchirmY;
varying vec2 vUv;
void main() {
  vUv = uv;
  // Schirm-Modus: die Fläche klebt am Bildschirm statt im Raum zu stehen
  gl_Position = uSchirm > 0.5
    ? vec4(position.x * 2.0, mix(uSchirmY.x, uSchirmY.y, uv.y), 0.9999, 1.0)
    : projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const HG_FRAG = /* glsl */ `
uniform sampler2D uBild;
uniform sampler2D uAlt;
uniform float uMix;
uniform float uZeit;
uniform float uBildA;
uniform float uAltA;
uniform float uPlaneA;
uniform float uHell;
uniform float uFokus;
uniform float uSpiegel;
uniform float uKacheln;
uniform float uBlende;
uniform float uPassung; // 0 Ausschnitt (Maus) · 1 Ausschnitt fest · 2 ganz · 3 ganz, Rand gefüllt · 4 Kacheln gespiegelt · 5 Kacheln gerade
uniform float uReihen;
uniform vec3 uGrund;
varying vec2 vUv;

float zufall(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 abdecken(vec2 uv, float imgA, float fokus) {
  // cover-fit: die Fläche wird immer voll gefüllt; der Fokus wandert
  // durch den abgeschnittenen Bildbereich (mit der Maushöhe oder fest in der Mitte)
  if (imgA < uPlaneA) {
    float band = imgA / uPlaneA;
    return vec2(uv.x, (uv.y - 0.5) * band + 0.5 + (fokus - 0.5) * (1.0 - band));
  }
  return vec2((uv.x - 0.5) * (uPlaneA / imgA) + 0.5, uv.y);
}

// contain-fit: das ganze Bild, mittig — z sagt, ob der Punkt im Bild liegt
vec3 einpassen(vec2 uv, float imgA) {
  vec2 p = imgA > uPlaneA
    ? vec2(uv.x, (uv.y - 0.5) * (imgA / uPlaneA) + 0.5)
    : vec2((uv.x - 0.5) * (uPlaneA / imgA) + 0.5, uv.y);
  float innen = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
  return vec3(p, innen);
}

// Kacheln: uReihen Bildreihen übereinander, jedes Bild im eigenen Format, nebeneinander wiederholt
vec2 kacheln(vec2 uv, float imgA, bool spiegeln) {
  vec2 k = vec2(uv.x * uPlaneA / imgA, uv.y) * uReihen;
  vec2 f = fract(k);
  if (!spiegeln) return f;
  vec2 ungerade = mod(floor(k), 2.0);
  return mix(f, 1.0 - f, ungerade);
}

vec3 motiv(sampler2D bild, float imgA, vec2 uv) {
  if (uPassung < 0.5) return texture2D(bild, abdecken(uv, imgA, uFokus)).rgb;
  if (uPassung < 1.5) return texture2D(bild, abdecken(uv, imgA, 0.5)).rgb;
  if (uPassung < 3.5) {
    vec3 e = einpassen(uv, imgA);
    vec3 farbe = texture2D(bild, e.xy).rgb;
    // Rand: Hintergrundfarbe — oder das abgedunkelte, füllende Motiv dahinter
    vec3 rand = uPassung < 2.5 ? uGrund : texture2D(bild, abdecken(uv, imgA, 0.5)).rgb * 0.3;
    return mix(rand, farbe, e.z);
  }
  return texture2D(bild, kacheln(uv, imgA, uPassung < 4.5)).rgb;
}

void main() {
  vec2 uv = vec2(uSpiegel > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y); // Innenseite des Zylinders
  // Rundum: das Motiv mehrfach nebeneinander, abwechselnd gespiegelt — die Mitte bleibt richtig herum
  float k = uv.x * uKacheln;
  float f = fract(k);
  uv.x = mod(floor(k) - floor(uKacheln * 0.5), 2.0) > 0.5 ? 1.0 - f : f;
  vec3 alt = motiv(uAlt, uAltA, uv);
  vec3 neu = motiv(uBild, uBildA, uv);
  vec3 farbe = mix(alt, neu, smoothstep(0.0, 1.0, uMix));
  // abgeschattet, zur Mitte hin offen — als Projektion noch heller
  float vig = smoothstep(1.15, 0.3, distance(vUv, vec2(0.5, 0.42)));
  farbe *= (0.24 + 0.42 * vig) * uHell;
  // Oberer Bildschirmteil: nach unten in den Hintergrund auslaufen
  farbe = mix(uGrund, farbe, mix(1.0, smoothstep(0.0, 0.3, vUv.y), uBlende));
  // Dithering gegen sichtbare Farbstufen im Dunkeln
  farbe += (zufall(vUv * 917.0 + fract(uZeit)) - 0.5) / 96.0;
  gl_FragColor = vec4(farbe, 1.0);
  #include <colorspace_fragment>
}
`

// Abspielposition pro Videodatei merken — Pause statt Neustart
const videoZeiten = new Map<string, number>()

const hgLader = new THREE.TextureLoader()
const hgCache = new Map<string, Promise<THREE.Texture>>()
const ladeHg = (src: string) => {
  let p = hgCache.get(src)
  if (!p) {
    p = hgLader.loadAsync(src).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      return t
    })
    hgCache.set(src, p)
  }
  return p
}

const PASSUNG_NR: Record<string, number> = { ausschnitt: 0, fest: 1, ganz: 2, ganzRand: 3, kacheln: 4, kachelnGerade: 5 }
const OBEN_ANTEIL = 0.62 // „Oberer Bildschirmteil": so viel der Höhe trägt das Bild

// Ein Material für alle Leinwand-Arten — die Art bestimmt nur, auf welcher Fläche es liegt.
function useLeinwandMaterial(src: string, hell: boolean, video: string | undefined, art: Leinwand) {
  const material = useMemo(() => {
    const leer = new THREE.DataTexture(new Uint8Array([8, 8, 8, 255]), 1, 1)
    leer.needsUpdate = true
    return new THREE.ShaderMaterial({
      vertexShader: HG_VERT,
      fragmentShader: HG_FRAG,
      uniforms: {
        uBild: { value: leer },
        uAlt: { value: leer },
        uMix: { value: 1 },
        uZeit: { value: 0 },
        uBildA: { value: 1.5 },
        uAltA: { value: 1.5 },
        uPlaneA: { value: 2.85 },
        uHell: { value: 1 },
        uFokus: { value: 0.5 },
        uSpiegel: { value: 1 },
        uKacheln: { value: 1 },
        uBlende: { value: 0 },
        uPassung: { value: 0 },
        uReihen: { value: 1 },
        uSchirm: { value: 0 },
        uSchirmY: { value: new THREE.Vector2(-1, 1) },
        uGrund: { value: new THREE.Color() },
      },
    })
  }, [])

  useEffect(() => {
    // Läuft ein Video, spielt es direkt auf der Leinwand.
    if (video) {
      const v = document.createElement('video')
      v.src = video
      v.muted = true
      v.loop = true
      v.playsInline = true
      v.crossOrigin = 'anonymous'
      v.currentTime = videoZeiten.get(video) ?? 0
      const tex = new THREE.VideoTexture(v)
      tex.colorSpace = THREE.SRGBColorSpace
      const u = material.uniforms
      u.uAlt.value = u.uBild.value
      u.uAltA.value = u.uBildA.value
      u.uBild.value = tex
      u.uMix.value = 0
      v.addEventListener('loadedmetadata', () => {
        u.uBildA.value = v.videoWidth / v.videoHeight
      })
      v.play().catch(() => {})
      return () => {
        videoZeiten.set(video, v.currentTime)
        v.pause()
        v.removeAttribute('src')
        tex.dispose()
      }
    }
    let lebendig = true
    ladeHg(src).then((tex) => {
      if (!lebendig) return
      const u = material.uniforms
      u.uAlt.value = u.uBild.value
      u.uAltA.value = u.uBildA.value
      u.uBild.value = tex
      u.uBildA.value = (tex.image as HTMLImageElement).width / (tex.image as HTMLImageElement).height
      u.uMix.value = 0
    })
    return () => {
      lebendig = false
    }
  }, [src, video, material])

  useEffect(() => {
    const schirm = art === 'vollbild' || art === 'oben'
    const u = material.uniforms
    u.uSchirm.value = schirm ? 1 : 0
    u.uSchirmY.value.set(art === 'oben' ? 1 - 2 * OBEN_ANTEIL : -1, 1)
    u.uBlende.value = art === 'oben' ? 1 : 0
    u.uSpiegel.value = art === 'rundhorizont' || art === 'rundum' ? 1 : 0
    u.uKacheln.value = art === 'rundum' ? 3 : 1
    material.side = schirm || art === 'boden' || art === 'leinwand' ? THREE.DoubleSide : THREE.BackSide
    material.depthTest = !schirm
    material.depthWrite = !schirm
    material.needsUpdate = true
  }, [art, material])

  useFrame(({ clock, size }, dt) => {
    const u = material.uniforms
    u.uZeit.value = clock.elapsedTime
    u.uMix.value = Math.min(1, (u.uMix.value as number) + dt * 1.3)
    u.uHell.value += ((hell || video ? 1.7 : 1) * cfg.leinwandHell - (u.uHell.value as number)) * (1 - Math.exp(-4 * dt))
    // Maus oben → Bildfokus oben, unten → unten
    u.uFokus.value += (0.5 - maus.y * 0.5 - (u.uFokus.value as number)) * (1 - Math.exp(-3 * dt))
    ;(u.uGrund.value as THREE.Color).set(cfg.grund)
    u.uPassung.value = PASSUNG_NR[cfg.leinwandPassung] ?? 0
    u.uReihen.value = cfg.leinwandReihen
    const bildschirm = size.width / size.height
    u.uPlaneA.value =
      art === 'vollbild'
        ? bildschirm
        : art === 'oben'
          ? bildschirm / OBEN_ANTEIL
          : art === 'rundum'
            ? (Math.PI * 2 * 19) / 16 / 3
            : art === 'boden'
              ? 1
              : art === 'leinwand'
                ? u.uBildA.value
                : 2.85
  })

  return material
}

// Die Leinwand im Raum oder am Bildschirm. (Die Bodenprojektion liegt auf der Münze selbst.)
function Leinwandflaeche({ material, art }: { material: THREE.ShaderMaterial; art: Leinwand }) {
  const flach = useRef<THREE.Mesh>(null)
  useFrame(() => {
    // Schwebende Leinwand: zeigt das Motiv unbeschnitten, im eigenen Seitenverhältnis.
    if (art !== 'leinwand' || !flach.current) return
    const a = material.uniforms.uBildA.value as number
    const b = Math.min(26, 12.5 * a)
    flach.current.scale.set(b, b / a, 1)
  })
  if (art === 'rundhorizont' || art === 'rundum') {
    const bogen = art === 'rundum' ? Math.PI * 2 : 2.4 // ~140° Rückwand-Segment
    return (
      <mesh material={material} position={[0, 6, 0]}>
        <cylinderGeometry args={[19, 19, 16, 128, 1, true, Math.PI - bogen / 2, bogen]} />
      </mesh>
    )
  }
  if (art === 'vollbild' || art === 'oben')
    return (
      <mesh material={material} frustumCulled={false} renderOrder={-10}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    )
  if (art === 'leinwand')
    return (
      <mesh ref={flach} material={material} position={[0, 8, -10]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    )
  return null
}

// ---------- Licht: sechs Stimmungen ----------

const SCHATTEN = {
  'shadow-bias': -0.0004,
  'shadow-radius': 5,
  'shadow-camera-near': 6,
  'shadow-camera-far': 60,
} as const

// Ein Scheinwerfer mit Zielpunkt; `fuehre` bewegt das Ziel pro Frame.
function Scheinwerfer({
  von,
  auf,
  fuehre,
  schatten,
  karte = 1024,
  ...licht
}: {
  von: [number, number, number]
  auf: [number, number, number]
  fuehre?: (ziel: THREE.Vector3, zeit: number, dt: number) => void
  schatten: boolean
  karte?: number
} & Omit<ThreeElements['spotLight'], 'position' | 'target'>) {
  const ziel = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(...auf)
    return o
  }, [])
  useFrame(({ clock }, dt) => {
    fuehre?.(ziel.position, clock.elapsedTime, Math.min(dt, 1 / 30))
    ziel.updateMatrixWorld()
  })
  return (
    <>
      <primitive object={ziel} />
      <spotLight position={von} target={ziel} decay={0} castShadow={schatten} shadow-mapSize={[karte, karte]} {...SCHATTEN} {...licht} />
    </>
  )
}

function Beleuchtung({ art, staerke: s, schatten }: { art: Licht; staerke: number; schatten: boolean }) {
  switch (art) {
    // 1 — der Verfolger: ein echtes Licht, von der Maus geführt
    case 'verfolger':
      return (
        <>
          <ambientLight intensity={0.42} color="#f2ecff" />
          <Scheinwerfer
            von={[0, 13, 21]}
            auf={[0, 0.8, RADIUS]}
            fuehre={(z, _, dt) => {
              z.x = daempf(maus.x * 10, z.x, 4, dt)
              z.z = daempf(RADIUS - 3.5 + maus.y * 7.5, z.z, 4, dt)
            }}
            angle={0.32}
            penumbra={0.5}
            intensity={5.2 * s}
            color="#fff3e0"
            schatten={schatten}
          />
        </>
      )
    // 2 — Fokus: nur das Hauptprojekt steht im Licht, die Nachbarn bekommen den Rand ab
    case 'fokus':
      return (
        <>
          <ambientLight intensity={0.16} color="#f2ecff" />
          <Scheinwerfer von={[0, 15, 23]} auf={[0, 1, RADIUS + 0.4]} angle={0.2} penumbra={0.85} intensity={7 * s} color="#fff6ea" schatten={schatten} />
        </>
      )
    // 3 — Arbeitslicht: alles gleich hell, nüchtern wie bei der Probe
    case 'arbeitslicht':
      return (
        <>
          <ambientLight intensity={2.3 * s} color="#ffffff" />
          <directionalLight
            position={[6, 22, 14]}
            intensity={1.5 * s}
            castShadow={schatten}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={16}
            shadow-camera-bottom={-16}
            shadow-camera-far={60}
            shadow-bias={-0.0004}
            shadow-radius={6}
          />
        </>
      )
    // 4 — Gegenlicht: von hinten oben, lange Schatten zum Publikum
    case 'gegenlicht':
      return (
        <>
          <ambientLight intensity={1.5 * s} color="#e9e4ff" />
          <Scheinwerfer von={[0, 11, -17]} auf={[0, 0, 8]} angle={0.62} penumbra={0.6} intensity={8 * s} color="#ffd9a8" schatten={schatten} />
        </>
      )
    // 5 — Farbwechsler: Rot, Grün, Blau aus drei Richtungen — zusammen weiß, die Schatten farbig
    case 'farben':
      return (
        <>
          <ambientLight intensity={0.3} color="#ffffff" />
          {(
            [
              [[-15, 12, 20], '#ff2a1a'],
              [[0, 15, 24], '#22ff3c'],
              [[15, 12, 20], '#2a48ff'],
            ] as const
          ).map(([von, farbe]) => (
            <Scheinwerfer
              key={farbe}
              von={[...von]}
              auf={[0, 0.8, RADIUS - 1.5]}
              angle={0.4}
              penumbra={0.6}
              intensity={4.6 * s}
              color={farbe}
              schatten={schatten}
              karte={1024}
            />
          ))}
        </>
      )
    // 6 — Suchscheinwerfer: zwei schmale Kegel wandern von selbst über die Bühne
    case 'sucher':
      return (
        <>
          <ambientLight intensity={0.34} color="#e6ecff" />
          {[0, 1].map((i) => (
            <Scheinwerfer
              key={i}
              von={[i ? 12 : -12, 14, 20]}
              auf={[0, 0.8, RADIUS]}
              fuehre={(z, zeit) => {
                const t = zeit * 0.45 + i * 2.4
                z.x = Math.sin(t * (i ? 1.3 : 1)) * 9
                z.z = RADIUS - 5 + Math.cos(t * (i ? 0.7 : 1.1)) * 6
              }}
              angle={0.17}
              penumbra={0.35}
              intensity={6.5 * s}
              color="#f1f5ff"
              schatten={schatten}
              karte={1024}
            />
          ))}
        </>
      )
  }
}

// ---------- Foto als beleuchteter Block, Textur läuft um die Kanten ----------

// Box eines Fotos: die vier Kanten zeigen die äußersten 6 % des Bildes (wie ein
// umgeschlagener Druck), vorn das ganze Bild, hinten eine eigene Fläche. Die
// Flächen von BoxGeometry liegen in der Reihenfolge +x −x +y −y +z −z, je 4 Ecken.
const KANTEN: [number, number, number, number][] = [
  [0.94, 0, 0.06, 1], // rechts: Versatz u/v, Ausschnitt u/v
  [0, 0, 0.06, 1], // links
  [0, 0.94, 1, 0.06], // oben
  [0, 0, 1, 0.06], // unten
]
function fotoGeometrie(breite: number, hoehe: number, dicke: number) {
  const g = new THREE.BoxGeometry(breite, hoehe, dicke)
  const uv = g.attributes.uv as THREE.BufferAttribute
  KANTEN.forEach(([ou, ov, ru, rv], seite) => {
    for (let e = 0; e < 4; e++) {
      const i = seite * 4 + e
      uv.setXY(i, ou + uv.getX(i) * ru, ov + uv.getY(i) * rv)
    }
  })
  g.clearGroups()
  g.addGroup(0, 30, 0) // fünf Flächen mit dem Bild
  g.addGroup(30, 6, 1) // Rückseite
  return g
}

function FotoObjekt({
  url,
  nr,
  breite,
  ar,
  dicke = FOTO_DICKE,
  ...props
}: {
  url: string
  nr: number // Platz im Projekt — bestimmt die Zelle im Bildraster
  breite: number
  ar: number
  dicke?: number
} & Omit<ThreeElements['mesh'], 'position' | 'rotation' | 'scale'>) {
  const tex = useLoader(THREE.TextureLoader, url)
  // Ein Bild, ein GPU-Upload: die schmalen Kanten holen sich ihren Streifen über die
  // UVs der Geometrie statt über geklonte Texturen. Zwei Materialien, zwei Draw-Calls.
  const materialien = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return [
      // emissiveMap: in der Detailansicht leuchtet das Foto selbst, unabhängig vom Bühnenlicht
      new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: '#000' }), // vorn + Kanten
      new THREE.MeshLambertMaterial({ color: '#2a2a2a' }), // hinten
    ]
  }, [tex])
  const geometrie = useMemo(() => fotoGeometrie(breite, breite / ar, dicke), [breite, ar, dicke])
  // Wo das Foto steht, bestimmt allein die Frame-Schleife der Bühnenseite: aus der
  // Aufstellung und den Reglern im Stellwerk — und im Flug ins Bildraster.
  const mesh = useRef<THREE.Mesh>(null)
  useLayoutEffect(() => {
    const m = mesh.current
    if (m) m.userData.foto = { k: 0, g: 0, da: 1, ...m.userData.foto, nr, breite }
  }, [nr, breite])
  useLayoutEffect(() => {
    // Der Raycaster fragt nicht nach Sichtbarkeit: versteckte Extras und die eingefahrene
    // Münzseite würden sonst Klicks und Hover abfangen.
    const m = mesh.current
    if (!m) return
    m.raycast = (r, hits) => {
      for (let o: THREE.Object3D | null = m; o; o = o.parent) if (!o.visible) return
      THREE.Mesh.prototype.raycast.call(m, r, hits)
    }
  }, [])
  return (
    <mesh ref={mesh} {...props} geometry={geometrie} material={materialien} castShadow receiveShadow />
  )
}

// ---------- Der Münzrand: rote LED-Laufschrift mit dem Namen der Kategorie ----------

const LED_FRAG = /* glsl */ `
uniform sampler2D uText;
uniform float uKachel;
uniform float uAnzahl;
uniform float uZeilen;
uniform float uSchritt;
uniform float uKopf;
uniform float uAn;
uniform vec3 uFarbe;
varying vec2 vUv;
varying float vFront;

void main() {
  // Liegt die Münze auf der Rückseite, steht der Rand kopf — Schrift mitdrehen.
  vec2 uv = uKopf > 0.5 ? 1.0 - vUv : vUv;
  // Das Punktraster wandert mit der Schrift — kein festes Dioden-Gitter, sondern
  // eine gepunktete Schrift, die stufenlos über den Rand gleitet.
  vec2 g = vec2(uv.x * uKachel * uAnzahl + uSchritt, uv.y * uZeilen);
  vec2 zelle = floor(g);
  float d = length(fract(g) - 0.5);
  float punkt = smoothstep(0.47, 0.3, d);
  float an = uAn * step(0.5, texture2D(uText, vec2((zelle.x + 0.5) / uKachel, (zelle.y + 0.5) / uZeilen)).r);
  vec3 farbe = uFarbe * mix(0.12, 1.0, an) * punkt;
  farbe += an * uFarbe * 0.3 * (1.0 - punkt); // Überstrahlen zwischen den Dioden
  // Dioden strahlen nach vorn: schräg gesehen — zu den Bildrändern hin — werden sie matter.
  farbe *= 0.12 + 0.88 * pow(clamp(vFront, 0.0, 1.0), 3.0);
  gl_FragColor = vec4(farbe + vec3(0.015), 1.0);
  #include <colorspace_fragment>
}
`

function ledTextur(text: string, schrift: string, zeilen: number) {
  const { daten, breite, hoehe } = ledRaster(text, schrift, zeilen)
  // DataTexture zählt Zeilen von unten
  const pixel = new Uint8Array(breite * hoehe * 4)
  for (let y = 0; y < hoehe; y++)
    for (let x = 0; x < breite; x++) pixel.fill(daten[y * breite + x] * 255, ((hoehe - 1 - y) * breite + x) * 4, ((hoehe - 1 - y) * breite + x) * 4 + 4)
  const tex = new THREE.DataTexture(pixel, breite, hoehe)
  tex.wrapS = THREE.RepeatWrapping
  tex.needsUpdate = true
  // so viele Wiederholungen, dass die Dioden rund um den Rand etwa quadratisch bleiben
  const spaltenRundum = ((Math.PI * 2 * SCHEIBE_R) / SCHEIBE_H) * zeilen
  return { tex, kachel: breite, anzahl: Math.max(1, Math.round(spaltenRundum / breite)) }
}

function Scheibe({ wende, config }: { wende: RefObject<WendeCtrl>; config: DrehConfig }) {
  const { laufText, laufSchrift, laufZeilen } = config
  const schriften = useMemo(
    () => KATEGORIEN.map((k) => ledTextur(laufText.trim() || k.name, laufSchrift, laufZeilen)),
    [laufText, laufSchrift, laufZeilen]
  )
  useEffect(() => () => schriften.forEach((s) => s.tex.dispose()), [schriften])

  const materialien = useMemo(() => {
    const flaeche = new THREE.MeshLambertMaterial()
    const rand = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; varying float vFront; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFront = dot(normalize(normalMatrix * normal), normalize(-mv.xyz)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: LED_FRAG,
      uniforms: {
        uText: { value: null },
        uKachel: { value: 1 },
        uAnzahl: { value: 1 },
        uZeilen: { value: 11 },
        uSchritt: { value: 0 },
        uKopf: { value: 0 },
        uAn: { value: 1 },
        uFarbe: { value: new THREE.Color() },
      },
    })
    return [rand, flaeche, flaeche] as const
  }, [])

  const lauf = useRef(0)
  useFrame((_, dt) => {
    // Name und Leserichtung wechseln genau dann, wenn der Rand auf der Kante steht.
    const seite = Math.round(wende.current.flip / Math.PI)
    const s = schriften[mod(seite, KATEGORIEN.length)]
    const u = materialien[0].uniforms
    u.uText.value = s.tex
    u.uKachel.value = s.kachel
    u.uAnzahl.value = s.anzahl
    u.uZeilen.value = cfg.laufZeilen
    u.uKopf.value = mod(seite, 2)
    u.uAn.value = cfg.laufschrift ? 1 : 0
    ;(u.uFarbe.value as THREE.Color).set(cfg.laufFarbe)
    // Die Schrift gleitet stufenlos in Dioden-Spalten pro Sekunde.
    lauf.current = (lauf.current + Math.min(dt, 1 / 30) * cfg.laufTempo) % s.kachel
    u.uSchritt.value = lauf.current
    materialien[1].color.set(cfg.scheibe)
  })

  return (
    <mesh material={materialien as unknown as THREE.Material[]} receiveShadow>
      <cylinderGeometry args={[SCHEIBE_R, SCHEIBE_R, SCHEIBE_H, 160]} />
    </mesh>
  )
}

// ---------- Kulissen: drei Fotos pro Projekt, im Kreis auf der Scheibe ----------

function Kulisse({
  projekt,
  index,
  schritt,
  vorn,
  oben,
  detail,
  alleBilder,
  onDrehen,
  onBild,
  onZeigen,
}: {
  projekt: Projekt
  index: number
  schritt: number
  vorn: boolean
  oben: boolean
  detail: boolean
  alleBilder: boolean // Detailansicht: auch die Bilder, die nicht auf der Bühne stehen
  onDrehen: (index: number) => void
  onBild: (bildIndex: number) => void
  onZeigen: (bildIndex: number | null, verlassen?: number) => void
}) {
  const theta = index * schritt
  const gruppe = useRef<THREE.Group>(null)

  useEffect(() => {
    // Grundfarben einmalig merken, damit das Abdunkeln nicht kumuliert.
    gruppe.current?.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !m.userData.grundfarben) {
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        m.userData.grundfarben = mats.map((mat) => (mat as THREE.MeshLambertMaterial).color.clone())
      }
    })
  })

  // Stabiles Objekt: die Frame-Schleife legt hier ihren Stand ab (Helligkeit, Flugfortschritt).
  const daten = useMemo(
    () => ({ kulisse: true, index, ars: projekt.bilder.map((b) => b.ar), farbe: new THREE.Color(projekt.farbe) }),
    [index, projekt]
  )
  const fotos = projekt.bilder.slice(0, alleBilder ? undefined : LAGEN.length)
  const klick = (i: number) => (e: { stopPropagation: () => void; delta: number }) => {
    e.stopPropagation()
    if (e.delta >= 6) return
    if (vorn) onBild(i)
    else onDrehen(index)
  }

  return (
    <group position={[Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS]} rotation={[0, theta, 0]}>
      {/* Nur die Seite, die oben liegt, reagiert — die Rückseite hängt unsichtbar darunter. */}
      <group
        ref={gruppe}
        userData={daten}
      >
        <Suspense fallback={null}>
          {fotos.map((b, i) => {
            // Auf der Bühne stehen immer nur drei Fotos. Die übrigen stecken klein im
            // ersten Block und falten sich erst in der Detailansicht heraus.
            const l = LAGEN[i] ?? { ...LAGEN[0], b: 1.5 }
            return (
              <FotoObjekt
                key={b.src}
                url={b.src}
                nr={i}
                breite={l.b}
                ar={b.ar}
                visible={false}
                // stopPropagation: nur das vorderste Foto zählt — nicht auch die dahinter
                onPointerOver={
                  oben
                    ? (e) => {
                        e.stopPropagation()
                        // am Canvas selbst — die Bühne darunter hat ihren eigenen Cursor (zoom-out / grab)
                        ;(e.nativeEvent.target as HTMLElement).style.cursor = vorn ? 'zoom-in' : 'pointer'
                        if (vorn && !detail) onZeigen(i)
                      }
                    : undefined
                }
                onPointerOut={
                  oben
                    ? (e) => {
                        ;(e.nativeEvent.target as HTMLElement).style.cursor = ''
                        if (vorn && !detail) onZeigen(null, i)
                      }
                    : undefined
                }
                onClick={oben ? klick(i) : undefined}
              />
            )
          })}
        </Suspense>
      </group>
    </group>
  )
}

// Eine Seite der Münze: die Kulissen einer Kategorie, mit eigener Drehung.
function Flaeche({
  seite,
  kat,
  ctrl,
  wende,
  detail,
  oben,
  aktiv,
  offen,
  alleBilder,
  onDrehen,
  onBild,
  onZeigen,
}: {
  seite: 0 | 1
  kat: number
  ctrl: RefObject<DrehCtrl[]>
  wende: RefObject<WendeCtrl>
  detail: RefObject<DetailCtrl>
  oben: boolean
  aktiv: number
  offen: boolean
  alleBilder: boolean
  onDrehen: (index: number) => void
  onBild: (bildIndex: number) => void
  onZeigen: (bildIndex: number | null, verlassen?: number) => void
}) {
  const flaeche = useRef<THREE.Group>(null)
  const scheibe = useRef<THREE.Group>(null)
  const schritt = schrittVon(kat)
  const vorne = useRef(aktiv)
  vorne.current = oben ? aktiv : -1
  const hilf = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
      heim: new THREE.Vector3(),
      heimQ: new THREE.Quaternion(),
      blickQ: new THREE.Quaternion(),
      euler: new THREE.Euler(),
    }),
    []
  )

  useFrame(({ camera, size, clock }, roheDt) => {
    const dt = Math.min(roheDt, 1 / 30)
    const c = ctrl.current[seite]
    c.ang = daempf(c.tang, c.ang, 5, dt)
    if (!flaeche.current || !scheibe.current) return
    scheibe.current.rotation.y = c.ang

    // Die Rückseite ist nur während des Wendens zu sehen — ihre Kulissen fahren
    // wie auf Versenkungen aus der Scheibe heraus und wieder hinein.
    const w = wende.current.flip
    const liegtOben = mod(Math.round(w / Math.PI), 2) === seite
    const hub = liegtOben ? 1 : THREE.MathUtils.smoothstep(Math.abs(Math.sin(w)), 0.03, 0.45)
    flaeche.current.visible = hub > 0
    if (!flaeche.current.visible) return
    scheibe.current.scale.y = Math.max(hub, 0.001)

    // Vorderstes Projekt aufhellen, alle anderen abdunkeln.
    scheibe.current.traverse((o) => {
      if (!((o as THREE.Group).isGroup && o.userData.kulisse)) return
      const winkel = mod(c.ang + o.userData.index * schritt + Math.PI, Math.PI * 2) - Math.PI
      const vorn = Math.abs(winkel) < schritt / 2 + 0.001
      const wirkung = LICHT_WIRKUNG[cfg.licht]
      o.userData.b = daempf(vorn ? 1 : wirkung.rest, o.userData.b ?? 0.55, 5, dt)
      o.scale.setScalar(daempf(vorn ? wirkung.vornSkala : 1, o.scale.x, 5, dt))

      // Detailansicht: die Fotos dieses Projekts heben ab und fliegen in ihr Raster
      // vor der Kamera — gestaffelt, eins nach dem anderen. Beim Schließen (oder
      // Weiterblättern) kehren sie auf ihren Platz auf der Scheibe zurück.
      const d = detail.current
      const dran = d.offen && o.userData.index === vorne.current
      const u = (o.userData.u = THREE.MathUtils.clamp(((o.userData.u as number) ?? 0) + ((dran ? 1 : -1) * dt) / cfg.zoomDauer, 0, 1))
      // Die Kulisse steht auf ihrem Radius; ihre Fotos bekommen jede Frame ihre Lage
      // aus der Aufstellung und den Reglern im Stellwerk (Ordner „Kulissen").
      const theta = o.userData.index * schritt
      o.parent?.position.set(Math.sin(theta) * cfg.objRadius, 0, Math.cos(theta) * cfg.objRadius)
      const ars = o.userData.ars as number[]
      const zeit = clock.elapsedTime
      const schwung = THREE.MathUtils.clamp((c.tang - c.ang) * 0.6, -0.6, 0.6) * cfg.objSchwung
      const fliegt = u > 0
      let zellen: Zelle[] = []
      let elternSkala = 1
      let roll = 0
      const aspekt = size.width / size.height
      if (fliegt) {
        zellen = bildraster(ars, size.width, size.height)
        roll = rollWelt(aspekt, size.height)
        o.updateWorldMatrix(true, false)
        hilf.m.copy(o.matrixWorld).invert()
        o.getWorldQuaternion(hilf.q).invert().multiply(camera.quaternion)
        elternSkala = o.getWorldScale(hilf.s).x
      }
      const staffel = 0.45
      o.children.forEach((kind) => {
        const f = kind.userData.foto
        if (!f) return
        const extra = f.nr >= LAGEN.length // steckt klein im ersten Block, bis die Detailansicht öffnet
        const lagen = AUFSTELLUNG_LAGEN[cfg.objAufstellung] ?? LAGEN
        const lage = lagen[extra ? 0 : f.nr]
        const G = cfg.objGroesse * (extra ? 1 : lage.b / LAGEN[f.nr].b) // Aufstellung skaliert die Grundgeometrie
        const hoehe = (lage.b / ars[extra ? 0 : f.nr]) * cfg.objGroesse
        let turm = 0 // Stapeln: die Höhe aller Fotos darunter
        for (let j = 0; j < (extra ? 0 : f.nr); j++) turm += (lagen[j].b / ars[j]) * cfg.objGroesse + 0.04
        const S = cfg.objStapel
        hilf.heim.set(
          THREE.MathUtils.lerp(lage.x * cfg.objStreuung, 0, S),
          hoehe / 2 + 0.02 + turm * S + cfg.objSchweben + Math.sin(zeit * 0.9 + o.userData.index * 1.7 + f.nr * 2.1) * cfg.objAtmen,
          THREE.MathUtils.lerp(lage.z * cfg.objStreuung, 0.5, S)
        )
        // Verdrehung, Neigung und der Schwung aus der Drehung der Scheibe — und auf Wunsch
        // dreht sich jedes Foto zum Publikum, egal wo die Kulisse gerade steht.
        hilf.heimQ.setFromEuler(hilf.euler.set(-cfg.objNeigung, lage.ry * cfg.objVerdrehung, schwung * (1 + f.nr * 0.35), 'YXZ'))
        hilf.blickQ.setFromEuler(hilf.euler.set(-cfg.objNeigung, -winkel, schwung * (1 + f.nr * 0.35), 'YXZ'))
        hilf.heimQ.slerp(hilf.blickQ, cfg.objZurKamera)
        f.da = daempf(extra || f.nr < cfg.objAnzahl ? 1 : 0, f.da, 6, dt)
        const heimSkala = (extra ? 0.12 : 1) * G * f.da
        const heimTiefe = extra ? heimSkala : (cfg.objDicke / FOTO_DICKE) * f.da

        if (!fliegt) {
          f.k = 0
          kind.position.copy(hilf.heim)
          kind.quaternion.copy(hilf.heimQ)
          kind.scale.set(heimSkala, heimSkala, heimTiefe)
          kind.visible = !extra && f.da > 0.002
          return
        }

        // Detailansicht: die Fotos dieses Projekts heben ab und fliegen in ihr Raster
        // vor der Kamera — gestaffelt, eins nach dem anderen. Beim Schließen (oder
        // Weiterblättern) kehren sie auf ihren Platz auf der Scheibe zurück.
        const zelle = zellen[f.nr]
        const k = (f.k = weich(THREE.MathUtils.clamp(u * (1 + staffel) - (staffel * f.nr) / Math.max(1, zellen.length - 1), 0, 1)))
        f.g += ((dran && d.gross === f.nr ? 1 : 0) - f.g) * (1 - Math.exp(-6.5 * dt))
        const g = THREE.MathUtils.smoothstep(f.g, 0, 1)
        // Groß: dasselbe Foto kommt so nah, dass es den Schirm fast füllt — Kopf und Fuß bleiben frei.
        const sicht = sichtfeld(aspekt, 1)
        const nah = Math.max(zelle.h / (0.8 * sicht.h), zelle.b / (0.9 * sicht.b))
        // Große Zellen (Stapel) kämen so hinter den Schleier — dann bleibt das Foto vor ihm
        // und wird stattdessen kleiner skaliert, was auf dem Schirm dasselbe ergibt.
        const dist = Math.min(nah, RASTER_D - 3)
        const tiefe = 1 + (f.nr % 3) * 0.4 // jedes Foto antwortet etwas anders auf die Maus
        hilf.v
          .set(
            THREE.MathUtils.lerp(zelle.x - maus.x * 0.1 * tiefe, 0, g),
            THREE.MathUtils.lerp(zelle.y + roll + maus.y * 0.07 * tiefe, 0.01 * sicht.h * dist, g),
            -THREE.MathUtils.lerp(RASTER_D, dist, g)
          )
          .applyMatrix4(camera.matrixWorld)
          .applyMatrix4(hilf.m)
        kind.position.lerpVectors(hilf.heim, hilf.v, k)
        kind.quaternion.slerpQuaternions(hilf.heimQ, hilf.q, k)
        const skala = THREE.MathUtils.lerp(heimSkala, zelle.b / (f.breite * elternSkala), k) * THREE.MathUtils.lerp(1, dist / nah, g)
        kind.scale.set(skala, skala, THREE.MathUtils.lerp(heimTiefe, 0.05 / (FOTO_DICKE * elternSkala), k))
        kind.visible = k > 0.002 || (!extra && f.da > 0.002)
      })

      o.traverse((kind) => {
        const m = kind as THREE.Mesh
        if (m.isMesh && m.userData.grundfarben) {
          // Im Raster leuchtet das Foto selbst — Bühnenlicht und Abdunkeln blenden aus.
          const k = (m.userData.foto?.k as number) ?? 0
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach((mat, mi) => {
            const l = mat as THREE.MeshLambertMaterial
            // Rückseite (Material 1) auf Wunsch in der Farbe des Projekts
            const basis = mi === 1 && cfg.objRueckseite ? (o.userData.farbe as THREE.Color) : (m.userData.grundfarben as THREE.Color[])[mi]
            l.color.copy(basis).multiplyScalar((o.userData.b as number) * (1 - k))
            if (l.emissiveMap) l.emissive.setScalar(k)
          })
        }
      })
    })
  })

  return (
    <group ref={flaeche} rotation={[seite ? Math.PI : 0, 0, 0]}>
      <group ref={scheibe} position={[0, SCHEIBE_H / 2, 0]}>
        {SAMMLUNG[kat].map((p, i) => (
          <Kulisse
            key={p.slug}
            projekt={p}
            index={i}
            schritt={schritt}
            vorn={oben && i === aktiv}
            oben={oben}
            detail={offen}
            alleBilder={alleBilder && oben && i === aktiv}
            onDrehen={onDrehen}
            onBild={onBild}
            onZeigen={onZeigen}
          />
        ))}
      </group>
    </group>
  )
}

function Buehnenraum({
  ctrl,
  wende,
  detail,
  offen,
  gross,
  alleBilder,
  flaechen,
  seite,
  projekt,
  aktiv,
  projiziert,
  config,
  onDrehen,
  onBild,
  onZeigen,
  onLeer,
}: {
  ctrl: RefObject<DrehCtrl[]>
  wende: RefObject<WendeCtrl>
  detail: RefObject<DetailCtrl>
  offen: boolean
  gross: number | null
  alleBilder: boolean
  onLeer: () => void
  flaechen: [number, number]
  seite: number
  projekt: Projekt
  aktiv: number
  projiziert: number | null
  config: DrehConfig
  onDrehen: (index: number) => void
  onBild: (bildIndex: number) => void
  onZeigen: (bildIndex: number | null, verlassen?: number) => void
}) {
  // Hochgeladenes Bild vor festem Motiv vor dem Foto des Projekts.
  const festesBild = config.leinwandBild || config.leinwandMotiv
  const leinwand = useLeinwandMaterial(
    festesBild || projekt.bilder[Math.min(projiziert ?? 0, projekt.bilder.length - 1)].src,
    projiziert !== null,
    projiziert === null && !festesBild ? projekt.videoDatei : undefined,
    config.leinwand
  )
  const muenze = useRef<THREE.Group>(null)
  const kameraraum = useRef<THREE.Group>(null)
  const vorhang = useRef<THREE.MeshBasicMaterial>(null)
  const schleier = useRef<THREE.MeshBasicMaterial>(null)
  const farbe = useRef<THREE.Mesh>(null)
  const cam = useThree((s) => s.camera)
  const groesse = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const szene = useThree((s) => s.scene)
  // Nur in der Entwicklung: Renderer und Szene für Messungen in der Konsole
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__buehne = { gl, szene, kamera: cam }
  }, [gl, szene, cam])
  const aspekt = groesse.width / groesse.height
  const ars = useMemo(() => projekt.bilder.map((b) => b.ar), [projekt])

  useEffect(() => {
    cam.position.copy(KAMERA_HEIM)
    cam.lookAt(BLICK_HEIM)
    ;(cam as THREE.PerspectiveCamera).fov = fovFuer(aspekt)
    cam.updateProjectionMatrix()
  }, [cam, aspekt])

  useFrame(({ camera }, roheDt) => {
    const dt = Math.min(roheDt, 1 / 30)

    // Wenden wie eine Münze: über die Querachse, mit etwas Wurf nach hinten oben.
    const w = wende.current
    w.flip = daempf(w.fziel, w.flip, cfg.wendeTempo, dt)
    if (muenze.current) {
      const wurf = Math.abs(Math.sin(w.flip))
      muenze.current.rotation.x = w.flip
      muenze.current.position.set(0, -SCHEIBE_H / 2 + wurf * 1.4, -wurf * 7)
    }

    // Detailansicht: hinter dem Bildraster schließt sich ein dunkler Vorhang vor der Bühne.
    const d = detail.current
    d.t = THREE.MathUtils.clamp(d.t + ((d.offen ? 1 : -1) * dt) / cfg.zoomDauer, 0, 1)
    d.grossT = daempf(d.offen && d.gross !== null ? 1 : 0, d.grossT, 6.5, dt)
    const e = weich(d.t)
    kameraraum.current?.position.copy(camera.position)
    kameraraum.current?.quaternion.copy(camera.quaternion)
    if (vorhang.current) {
      vorhang.current.opacity = e
      vorhang.current.color.set(cfg.grund)
    }
    if (schleier.current) {
      schleier.current.opacity = 0.9 * d.grossT
      schleier.current.color.set(cfg.grund)
    }
    // Die Farbfläche des Projekts schiebt sich hinter das Raster — wie im gedruckten Portfolio.
    if (farbe.current) {
      const zellen = bildraster(ars, groesse.width, groesse.height)
      const rand = Math.min(0.45, 0.035 * sichtfeld(aspekt).b)
      const links = Math.min(...zellen.map((z) => z.x - z.b / 2)) - rand
      const obenKante = Math.max(...zellen.map((z) => z.y + z.h / 2)) + rand * 0.9
      const rechts = Math.max(...zellen.map((z) => z.x + z.b / 2))
      // Nicht höher als ein gutes Drittel des Schirms — auch wenn der Stapel weit hinunterreicht.
      const unten = Math.max(Math.min(...zellen.map((z) => z.y - z.h / 2)), obenKante - 0.6 * sichtfeld(aspekt).h)
      // wächst aus der oberen linken Ecke und verblasst auf dem Rückweg, statt als Streifen stehenzubleiben
      const b = (rechts - links) * 0.58 * Math.max(e, 0.0001)
      const h = (obenKante - unten) * 0.62 * Math.max(e, 0.0001)
      ;(farbe.current.material as THREE.MeshBasicMaterial).opacity = e
      farbe.current.scale.set(b, h, 1)
      // rollt langsamer als die Fotos mit der Seite — sie liegt ja hinter ihnen (Parallaxe)
      farbe.current.position.set(links + b / 2 - maus.x * 0.05, obenKante + rollWelt(aspekt, groesse.height) * 0.55 - h / 2 + maus.y * 0.035, -(RASTER_D + 0.5))
      farbe.current.visible = e > 0.001
    }
  })

  const oben = mod(seite, 2)
  const riesig = sichtfeld(aspekt, 40)

  return (
    <>
      <group ref={kameraraum}>
        <mesh
          position={[0, 0, -(RASTER_D + 1.4)]}
          onPointerOver={offen ? (e) => e.stopPropagation() : undefined}
          onClick={offen ? (e) => (e.stopPropagation(), e.delta < 6 && onLeer()) : undefined}>
          <planeGeometry args={[riesig.b, riesig.h]} />
          <meshBasicMaterial ref={vorhang} transparent opacity={0} depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
        <mesh ref={farbe} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={projekt.farbe} transparent depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
        {/* Steht ein Foto groß vor der Kamera, tritt das Raster hinter einen Schleier zurück. */}
        <mesh position={[0, 0, -(RASTER_D - 1.2)]} onClick={offen && gross !== null ? (e) => (e.stopPropagation(), onLeer()) : undefined}>
          <planeGeometry args={[riesig.b, riesig.h]} />
          <meshBasicMaterial ref={schleier} transparent opacity={0} depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
      </group>
      <Leinwandflaeche material={leinwand} art={config.leinwand} />
      <Beleuchtung key={config.licht} art={config.licht} staerke={config.lichtStaerke} schatten={config.schatten} />

      <group ref={muenze}>
        <Scheibe wende={wende} config={config} />
        {/* Bodenprojektion: das Motiv liegt auf beiden Seiten der Münze */}
        {config.leinwand === 'boden' &&
          [1, -1].map((s) => (
            <mesh key={s} material={leinwand} position={[0, s * (SCHEIBE_H / 2 + 0.012), 0]} rotation={[-s * (Math.PI / 2), 0, 0]}>
              <circleGeometry args={[SCHEIBE_R - 0.25, 96]} />
            </mesh>
          ))}
        {([0, 1] as const).map((s) => (
          <Flaeche
            key={s}
            seite={s}
            kat={flaechen[s]}
            ctrl={ctrl}
            wende={wende}
            detail={detail}
            offen={offen}
            alleBilder={alleBilder}
            oben={s === oben}
            aktiv={aktiv}
            onDrehen={onDrehen}
            onBild={onBild}
            onZeigen={onZeigen}
          />
        ))}
      </group>
    </>
  )
}

export default function Drehbuehne() {
  const { projekt: linkParam } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const detail = hash === DETAIL_HASH
  const config = useDrehConfig()

  const [auftakt, setAuftakt] = useState(() => !auftaktGezeigt)
  const [fenster, setFenster] = useState(() => ({ b: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setFenster({ b: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Start aus der URL: das Projekt bestimmt Kategorie (= Münzseite) und Stellung.
  const start = useMemo(() => {
    const pr = findByPermalink(linkParam)
    const kat = pr ? KATEGORIEN.findIndex((k) => k.id === pr.kategorie) : 0
    return { kat, index: pr ? SAMMLUNG[kat].indexOf(pr) : 0 }
  }, [])

  // seite zählt die Wendungen: Kategorie = seite mod 3, Münzseite = seite mod 2.
  const [seite, setSeite] = useState(start.kat)
  const [flaechen, setFlaechen] = useState<[number, number]>(() =>
    start.kat % 2 === 0 ? [start.kat, (start.kat + 1) % 3] : [(start.kat + 1) % 3, start.kat]
  )
  const [aktiv, setAktiv] = useState(start.index)
  const [projiziert, setProjiziert] = useState<number | null>(null)

  const kat = mod(seite, KATEGORIEN.length)
  const projekte = SAMMLUNG[kat]
  const p = projekte[aktiv]
  useProjektUrlSync('/drehbuehne', p, detail ? DETAIL_HASH : '')

  // Scrollende Ansichten: die Seite reicht bis unter das letzte Foto — dessen Unterkante in Pixeln.
  const rasterUnten = useMemo(() => {
    const zellen = bildraster(
      p.bilder.map((b) => b.ar),
      fenster.b,
      fenster.h
    )
    const unten = Math.min(...zellen.map((z) => z.y - z.h / 2))
    return (0.5 - unten / sichtfeld(fenster.b / fenster.h).h) * fenster.h
  }, [p, fenster, config.ansicht])
  const scrollt = detail && rollt(fenster.b, fenster.h)
  const spalte = spaltenMasse(fenster.b)

  const wrap = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const zeiger = useRef<{ x: number; y: number; roh: number; achse: 'x' | 'y' | null; richtung: number } | null>(null)
  const radAcc = useRef({ acc: 0, t: 0 })

  const ctrl = useRef<DrehCtrl[]>(
    [0, 1].map((s) =>
      s === start.kat % 2
        ? { ang: Math.PI - start.index * schrittVon(start.kat), tang: -start.index * schrittVon(start.kat) }
        : { ang: 0, tang: 0 }
    )
  )
  const wende = useRef<WendeCtrl>({ flip: start.kat * Math.PI, fziel: start.kat * Math.PI })
  const detailCtrl = useRef<DetailCtrl>({ offen: detail, t: detail ? 1 : 0, gross: null, grossT: 0 })
  const [gross, setGross] = useState<number | null>(null)

  // Aktueller Stand für die Handler, die nur einmal gebunden werden.
  const stand = useRef({ seite, kat, detail, gross, bilder: p.bilder.length })
  stand.current = { seite, kat, detail, gross, bilder: p.bilder.length }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      maus.x = (e.clientX / window.innerWidth) * 2 - 1
      maus.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // ---------- Drehen ----------

  const schnappe = (tang: number) => {
    const { seite, kat } = stand.current
    const c = ctrl.current[mod(seite, 2)]
    c.tang = tang
    setAktiv(mod(Math.round(-tang / schrittVon(kat)), SAMMLUNG[kat].length))
    setProjiziert(null)
  }

  const dreheUm = (schritte: number) => {
    const { seite, kat } = stand.current
    schnappe(ctrl.current[mod(seite, 2)].tang - schritte * schrittVon(kat))
  }

  const dreheZu = (index: number) => {
    // Kürzester Weg zum Ziel-Index.
    const { seite, kat } = stand.current
    const c = ctrl.current[mod(seite, 2)]
    const delta = mod(-index * schrittVon(kat) - c.tang + Math.PI, Math.PI * 2) - Math.PI
    schnappe(c.tang + delta)
  }

  // ---------- Wenden ----------

  // Die verdeckte Seite bekommt die nächste Kategorie, bevor sie nach oben kommt.
  const bestuecke = (neueSeite: number) => {
    const s = mod(neueSeite, 2)
    const k = mod(neueSeite, KATEGORIEN.length)
    setFlaechen((f) => (f[s] === k ? f : s === 0 ? [k, f[1]] : [f[0], k]))
    ctrl.current[s] = { ang: -Math.PI * 0.6, tang: 0 }
  }

  const wendeZu = (neueSeite: number, bestueckt = false) => {
    if (!bestueckt) bestuecke(neueSeite)
    wende.current.fziel = neueSeite * Math.PI
    setSeite(neueSeite)
    setAktiv(0)
    setProjiziert(null)
  }

  const zeigeKategorie = (k: number) => {
    const { seite, kat } = stand.current
    const d = mod(k - kat, KATEGORIEN.length)
    if (d !== 0) wendeZu(seite + (d === 1 ? 1 : -1))
  }

  // ---------- Hinein ins Projekt und zurück ----------

  const hierGeoeffnet = useRef(false)
  const schliesse = () => {
    if (hierGeoeffnet.current) navigate(-1)
    else navigate({ hash: '' }, { replace: true })
    hierGeoeffnet.current = false
  }
  // Klick auf ein Foto der vordersten Kulisse: erst ins Projekt, dort dann das Foto groß.
  const waehleBild = (bildIndex: number) => {
    if (!stand.current.detail) {
      hierGeoeffnet.current = true
      navigate({ hash: DETAIL_HASH })
    } else setGross((g) => (g === bildIndex ? null : bildIndex))
  }
  // Steht ein Foto groß vor der Kamera, blättern Pfeile und Scrollen durch die Bilder
  // des Projekts — sonst durch die Projekte.
  const blaettere = (schritte: number) => {
    const { gross, bilder } = stand.current
    if (gross === null) dreheUm(schritte)
    else setGross(mod(gross + schritte, bilder))
  }
  // Klick ins Leere: erst das große Foto zurück, dann zurück zur Bühne.
  const insLeere = () => (stand.current.gross !== null ? setGross(null) : schliesse())

  // Die übrigen Bilder des Projekts gibt es nur in der Detailansicht — und noch so
  // lange danach, bis sie wieder im ersten Foto verschwunden sind.
  const [alleBilder, setAlleBilder] = useState(detail)
  useEffect(() => {
    if (detail) return setAlleBilder(true)
    const t = setTimeout(() => setAlleBilder(false), cfg.zoomDauer * 1600 + 200)
    return () => clearTimeout(t)
  }, [detail])

  useEffect(() => {
    detailCtrl.current.offen = detail
    detailCtrl.current.gross = detail ? gross : null
    const canvas = wrap.current?.querySelector('canvas')
    if (canvas) canvas.style.cursor = ''
  }, [detail, gross])
  useEffect(() => setGross(null), [detail, p])
  // Schmal: die Detailseite scrollt — Raster und Farbfläche rollen mit; jedes Projekt beginnt oben.
  useEffect(() => {
    window.scrollTo(0, 0)
    rollen.px = 0
    const onScroll = () => (rollen.px = window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [detail, p])

  // Alle Bilder des vordersten Projekts schon laden, bevor jemand hineinklickt.
  useEffect(() => p.bilder.forEach((b) => useLoader.preload(THREE.TextureLoader, b.src)), [p])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // Scrollende Projektansicht: das Rad scrollt die Seite, statt zu blättern — außer ein Foto steht groß
      if (stand.current.detail && stand.current.gross === null && rollt(window.innerWidth, window.innerHeight)) return
      e.preventDefault()
      if (flags.lightbox) return
      const r = radAcc.current
      const jetzt = performance.now()
      if (jetzt - r.t < (stand.current.detail ? 650 : 350)) return
      r.acc += e.deltaY
      if (Math.abs(r.acc) > 60) {
        const richtung = Math.sign(r.acc)
        r.acc = 0
        r.t = jetzt
        blaettere(richtung)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flags.lightbox || (e.target as HTMLElement).closest?.('input, select, textarea')) return
      if (e.key === 'ArrowRight') blaettere(1)
      if (e.key === 'ArrowLeft') blaettere(-1)
      if (stand.current.detail) {
        if (e.key === 'Escape') insLeere()
        return
      }
      if (e.key === 'ArrowDown') wendeZu(stand.current.seite + 1)
      if (e.key === 'ArrowUp') wendeZu(stand.current.seite - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Die Beschreibung reagiert leicht auf die Maus — wie ein schwebendes Blatt.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = panel.current
      if (!el) return
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      el.style.translate = `${nx * -8}px ${ny * -6}px`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Ziehen: waagrecht dreht die Scheibe, senkrecht wendet die Münze.
  const onPointerDown = (e: React.PointerEvent) =>
    (zeiger.current = { x: e.clientX, y: e.clientY, roh: ctrl.current[mod(seite, 2)].tang, achse: null, richtung: 0 })
  const onPointerMove = (e: React.PointerEvent) => {
    const z = zeiger.current
    if (!z || e.buttons !== 1 || detail) return
    const dx = e.clientX - z.x
    const dy = e.clientY - z.y
    if (!z.achse) {
      if (Math.hypot(dx, dy) < 8) return
      z.achse = Math.abs(dy) > Math.abs(dx) * 1.4 ? 'y' : 'x'
      if (z.achse === 'y') {
        z.richtung = Math.sign(dy)
        bestuecke(seite + z.richtung)
      }
    }
    if (z.achse === 'x') ctrl.current[mod(seite, 2)].tang = z.roh + dx * 0.0055
    else wende.current.fziel = seite * Math.PI + z.richtung * THREE.MathUtils.clamp(dy * z.richtung * 0.0075, 0, Math.PI)
  }
  const onPointerUp = () => {
    const z = zeiger.current
    if (!z) return
    zeiger.current = null
    if (z.achse === 'x') {
      const s = schrittVon(kat)
      schnappe(Math.round(ctrl.current[mod(seite, 2)].tang / s) * s)
    } else if (z.achse === 'y') {
      const weit = Math.abs(wende.current.fziel - seite * Math.PI) > Math.PI * 0.3
      if (weit) wendeZu(seite + z.richtung, true)
      else wende.current.fziel = seite * Math.PI
    }
  }

  return (
    <div className={`db ansicht-${config.ansicht}${detail ? ' detail' : ''}${scrollt ? ' rollt' : ''}${gross !== null ? ' gross' : ''}`} style={{ '--db-text': config.text, '--db-grund': config.grund, '--raster-unten': `${Math.round(rasterUnten)}px`, '--spalte-text': `${Math.round(spalte.textL)}px`, '--spalte-text-b': `${Math.round(spalte.textB)}px` } as React.CSSProperties}>
      <div
        className="buehne"
        ref={wrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: detail ? 'zoom-out' : 'grab', background: config.grund }}
      >
        <Canvas
          dpr={[1, 1.5]}
          flat
          shadows
          gl={{ powerPreference: 'high-performance' }}
          camera={{ fov: fovFuer(fenster.b / fenster.h), position: KAMERA_HEIM.toArray(), near: 0.1, far: 90 }}
          style={{ background: config.grund }}
        >
          <fog attach="fog" args={[config.grund, 32, 60]} />
          <Buehnenraum
            ctrl={ctrl}
            wende={wende}
            detail={detailCtrl}
            offen={detail}
            gross={gross}
            alleBilder={alleBilder}
            onLeer={insLeere}
            flaechen={flaechen}
            seite={seite}
            projekt={p}
            aktiv={aktiv}
            projiziert={projiziert}
            config={config}
            onDrehen={dreheZu}
            onBild={waehleBild}
            onZeigen={(i, verlassen) =>
              // Verlassen nimmt nur das eigene Bild zurück — sonst löscht der Wechsel zum Nachbarfoto dessen Bild
              setProjiziert((z) => (i === null ? (z === verlassen ? null : z) : p.videoDatei && i === 0 ? null : i))
            }
          />
        </Canvas>
      </div>

      {auftakt && <Auftakt farbe={p.farbe} onFertig={() => setAuftakt(false)} />}
      <Kopf hell />
      <nav className="db-kategorien" aria-label="Kategorien">
        {KATEGORIEN.map((k, i) => (
          <button key={k.id} className={i === kat ? 'aktiv' : ''} onClick={() => zeigeKategorie(i)}>
            {k.name}
          </button>
        ))}
      </nav>
      {p.video && !p.videoDatei && !detail && (
        <div className="db-video-zone">
          <iframe
            src={`${p.video}?background=1&autoplay=1&muted=1&loop=1`}
            allow="autoplay; fullscreen"
            title={`${p.titel} — Video`}
          />
        </div>
      )}
      <button className="db-zurueck" onClick={schliesse}>
        ← zurück zur Bühne
      </button>
      <div className="sb-titel">
        <div className="db-pfeile">
          <button onClick={() => dreheUm(-1)} aria-label="Vorheriges Projekt">
            ←
          </button>
          <button onClick={() => dreheUm(1)} aria-label="Nächstes Projekt">
            →
          </button>
          <button className="db-wenden" onClick={() => wendeZu(seite + 1)} aria-label="Bühne wenden" title="Bühne wenden">
            ↻
          </button>
        </div>
        <h2>{p.titel}</h2>
        <div className="sb-meta db-zaehler">
          {KATEGORIEN[kat].name} · {String(aktiv + 1).padStart(2, '0')} / {String(projekte.length).padStart(2, '0')}
        </div>
      </div>

      {/* Beschreibung unten rechts — über dunklem Boden, ohne Fläche. In der
          Detailansicht rückt sie neben das Bildraster und wird zur Lesegröße. */}
      <div className="db-beschreibung" ref={panel} key={p.slug}>
        {/* Stapel-Ansicht: der große Titel unten links tritt ab — Blättern und Zähler ziehen hierher. */}
        <div className="db-blaettern ov-anim-2">
          <button onClick={() => dreheUm(-1)} aria-label="Vorheriges Projekt">
            ←
          </button>
          <button onClick={() => dreheUm(1)} aria-label="Nächstes Projekt">
            →
          </button>
          <span>
            {KATEGORIEN[kat].name} · {String(aktiv + 1).padStart(2, '0')} / {String(projekte.length).padStart(2, '0')}
          </span>
        </div>
        <h3 className="db-titel ov-anim-2">{p.titel}</h3>
        <p className="db-meta ov-anim-2">
          {p.rolle} · {p.jahr} · {p.ort}
        </p>
        <p className="db-blurb ov-anim-3">{p.blurb}</p>
        <div className="db-credits ov-anim-3">
          {p.credits.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        {p.links && (
          <div className="db-links ov-anim-3">
            {p.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="hinweis hell">
        {detail
          ? `${scrollt ? 'Pfeiltasten' : 'scrollen oder Pfeiltasten'}: nächstes Projekt · Foto anklicken: groß · Esc: zurück zur Bühne`
          : 'ziehen ↔ oder scrollen: drehen · ziehen ↕: Bühne wenden · Maus führt das Licht · Foto anklicken: hinein ins Projekt'}
      </div>

      <Fuss hell projekt={detail ? p : undefined} fallback={['', '', `${KATEGORIEN[kat].name}, 2021–2026`]} />
    </div>
  )
}
