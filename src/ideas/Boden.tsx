import { useEffect, useMemo, useRef, useState, Suspense, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrthographicCamera } from '@react-three/drei'
import { useSearchParams } from 'react-router-dom'
import * as THREE from 'three'
import { PROJEKTE, findProjekt, type Projekt } from '../data/projects'
import { Kopf, Fuss, EntwurfSchalter } from '../ui/Chrome'
import { flags } from '../ui/flags'
import { Foto, Farbflaeche, daempf } from './helpers'

// Entwurf 1 — Der Boden.
// Ein Bühnenboden von oben: jedes Projekt liegt als Haufen von Abzügen auf
// dem Raster, der Titel als Farbblock mittendrin. Ziehen = schieben,
// Scrollen = zoomen, Anfassen fächert den Haufen auf.

interface Lage {
  p: [number, number]
  rot: number
}

interface BodenCtrl {
  x: number
  y: number
  z: number
  tx: number
  ty: number
  tz: number
}

const START_ZOOM = 1.15
const MIN_ZOOM = 0.75
const MAX_ZOOM = 4.5

// Handgelegte Positionen: x = Jahre (2021 links … 2026 rechts),
// y = Kostüm (unten) … Bühne (oben).
const LAGE: Record<string, Lage> = {
  parachutes: { p: [-64, -10], rot: -4 },
  'um-ordnen': { p: [-52, 14.5], rot: 2 },
  knast: { p: [-28.5, -19], rot: -3 },
  'on-repeat': { p: [-19, -1.5], rot: 4 },
  'hundekot-attacke': { p: [-31, 15.5], rot: -5 },
  spuren: { p: [-4.5, -17.5], rot: 3 },
  'bitte-auto-komm': { p: [0.5, 5.5], rot: -2 },
  amygdala: { p: [-8, 21.5], rot: 5 },
  lost: { p: [19, 20], rot: -4 },
  'ein-stueck-vom-mond': { p: [18.5, 0.5], rot: 2 },
  'draussen-feiern': { p: [26, -15.5], rot: -2 },
  'love-western': { p: [44.5, -4.5], rot: 3 },
  reden: { p: [53.5, 15.5], rot: -3 },
  'heavy-matters': { p: [61.5, -19], rot: 5 },
}

// Vier Anker um die Mitte — die Fotos gruppieren sich darum.
const ANKER: [number, number][] = [
  [-3.0, 2.1],
  [3.1, -1.8],
  [-2.4, -2.9],
  [3.2, 2.5],
]

// Geöffnet weichen die Fotos an den Rand aus — frei von Titel,
// Beschreibung und Farbfläche (lokale Koordinaten, Panelzone x −1…13, y −11…0).
const OFFEN_PLAETZE: [number, number][] = [
  [-9, 3.4],
  [17.5, 4],
  [-10, -9],
  [18, -10],
]

// Deterministischer Zufall — jedes Projekt fällt anders, aber immer gleich.
const rnd = (a: number) => {
  const x = Math.sin(a * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Heller Text auf dunklen Flächen (z. B. Blau), dunkler auf hellen.
const textFarbeAuf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  return lum < 0.45 ? '#ffffff' : '#141414'
}

function Raster() {
  const geo = useMemo(() => {
    const pts = []
    const S = 110
    for (let i = -S; i <= S; i += 3) {
      pts.push(-S, i, -0.2, S, i, -0.2)
      pts.push(i, -S, -0.2, i, S, -0.2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#e9e9e9" toneMapped={false} />
    </lineSegments>
  )
}

function Markierung({
  projekt,
  idx,
  offen,
  gross,
  gedimmt,
  labelsAus,
  onOpen,
  onBild,
}: {
  projekt: Projekt
  idx: number
  offen: boolean
  gross: number | null
  gedimmt: boolean
  labelsAus: boolean
  onOpen: (slug: string) => void
  onBild: (index: number) => void
}) {
  const size = useThree((st) => st.size)
  const lage = LAGE[projekt.slug]
  const gruppe = useRef<THREE.Group>(null)
  const fotos = useRef<THREE.Group>(null)
  const farbe = useRef<THREE.Mesh>(null)
  const trueb = useRef(1)
  const [hover, setHover] = useState(false)

  // Die Farbfläche liegt wie ein Abzug im Haufen …
  const fSeed = idx * 31
  const fBreite = 3.3 + rnd(fSeed) * 1.3
  const fHoehe = fBreite * (0.6 + rnd(fSeed + 1) * 0.26)
  const fRot = ((rnd(fSeed + 2) - 0.5) * 14 * Math.PI) / 180
  const fX = (rnd(fSeed + 3) - 0.5) * 2.6
  const fY = (rnd(fSeed + 4) - 0.5) * 2.2

  useFrame((_, dt) => {
    if (!gruppe.current) return
    const s = daempf(hover && !offen ? 1.04 : 1, gruppe.current.scale.x, 10, dt)
    gruppe.current.scale.setScalar(s)
    // Beim Anfassen fächert der Haufen auf — geöffnet räumt er die Mitte
    // ganz frei und macht Platz für die Beschreibung.
    const streuung = offen ? 3.1 : hover ? 1.18 : 1
    const richten = offen ? 0.12 : hover ? 0.3 : 1
    const groesse = offen ? 1.8 : 1 // geöffnet: die Abzüge selbst werden größer
    // Fokus: andere Projekte treten zurück
    trueb.current = daempf(gedimmt ? 0.15 : 1, trueb.current, 6, dt)
    // Sichtbare Weltbreite bei geöffnetem Zoom (2.2) — fürs Einpassen mit Rand.
    const weltB = 92 / 2.2
    const weltH = weltB * (size.height / size.width)
    fotos.current?.children.forEach((kind) => {
      const m = kind as THREE.Mesh
      const b = m.userData as { bx?: number; by?: number; brot?: number; i?: number; breite?: number; ar?: number }
      if (b.bx === undefined || b.by === undefined || b.brot === undefined) return
      const istGross = offen && gross === b.i
      const platz = OFFEN_PLAETZE[((b.i ?? 0) + idx) % OFFEN_PLAETZE.length]
      // Zielpunkt der Kamera in gedrehte Gruppen-Koordinaten umrechnen
      const rotRad = (lage.rot * Math.PI) / 180
      const gx = 5 * Math.cos(rotRad) + -3.4 * Math.sin(rotRad)
      const gy = -5 * Math.sin(rotRad) + -3.4 * Math.cos(rotRad)
      const zx = istGross ? gx : offen ? platz[0] : b.bx * streuung
      const zy = istGross ? gy : offen ? platz[1] : b.by * streuung
      let zielScale = groesse
      if (istGross && b.breite && b.ar) {
        zielScale = Math.min((weltB * 0.9) / b.breite, (weltH * 0.88) / (b.breite / b.ar))
      }
      const zz = istGross ? 3 : 0.4 + (b.i ?? 0) * 0.25
      m.position.x = daempf(zx, m.position.x, 9, dt)
      m.position.y = daempf(zy, m.position.y, 9, dt)
      m.position.z = daempf(zz, m.position.z, 9, dt)
      m.rotation.z = daempf(istGross ? -rotRad : b.brot * richten, m.rotation.z, 9, dt)
      m.scale.setScalar(daempf(zielScale, m.scale.x, 9, dt))
      ;(m.material as THREE.MeshBasicMaterial).opacity *= trueb.current
    })
    // … und weicht geöffnet an den freien linken Rand aus — die Farbe
    // trägt dann allein die Titelfläche, die Beschreibung steht auf Weiß.
    const f = farbe.current
    if (f) {
      ;(f.material as THREE.MeshBasicMaterial).opacity = trueb.current
      const ziel = offen
        ? { x: -8.5, y: -3.5, rot: fRot * 0.4, sx: 1.5, sy: 1.5 }
        : { x: fX, y: fY, rot: fRot, sx: 1, sy: 1 }
      f.position.x = daempf(ziel.x, f.position.x, 8, dt)
      f.position.y = daempf(ziel.y, f.position.y, 8, dt)
      f.rotation.z = daempf(ziel.rot, f.rotation.z, 8, dt)
      f.scale.x = daempf(ziel.sx, f.scale.x, 8, dt)
      f.scale.y = daempf(ziel.sy, f.scale.y, 8, dt)
    }
  })

  // Textfläche in wechselnden Größen und Versätzen — nie zweimal gleich,
  // aber immer achsparallel.
  const padX = 8 + (idx % 4) * 6
  const padY = 3 + (idx % 3) * 4
  const fx = 6 + ((idx * 3) % 5) * 4
  const fy = 4 + ((idx * 5) % 4) * 3

  return (
    <group position={[lage.p[0], lage.p[1], 0]} rotation={[0, 0, (lage.rot * Math.PI) / 180]}>
      <group ref={gruppe}>
        {/* Unsichtbare Hover-Fläche über dem ganzen Projekt — so bleibt der
            Zustand stabil, egal ob man über Fotos, Titel oder Lücken fährt. */}
        <mesh
          position={[0, 0, 0.05]}
          onClick={(e) => {
            e.stopPropagation()
            if (e.delta < 6 && !offen) onOpen(projekt.slug)
          }}
          onPointerOver={() => {
            setHover(true)
            document.body.style.cursor = offen ? 'zoom-in' : 'pointer'
          }}
          onPointerOut={() => {
            setHover(false)
            document.body.style.cursor = ''
          }}
        >
          <planeGeometry args={[14, 11]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <Farbflaeche
          ref={farbe}
          farbe={projekt.farbe}
          breite={fBreite}
          hoehe={fHoehe}
          position={[fX, fY, 0.3]}
          rotation={[0, 0, fRot]}
        />
        <group ref={fotos}>
          <Suspense fallback={null}>
            {projekt.bilder.slice(0, 4).map((b, i) => {
              const seed = idx * 17 + i * 3
              const breite = 2.6 + rnd(seed) * 2.3
              const brot = ((rnd(seed + 1) - 0.5) * 17 * Math.PI) / 180
              const anker = ANKER[(i + idx) % ANKER.length]
              const bx = anker[0] * (0.85 + rnd(seed + 2) * 0.55)
              const by = anker[1] * (0.85 + rnd(seed + 3) * 0.55)
              return (
                <Foto
                  key={b.src}
                  url={b.src}
                  breite={breite}
                  ar={b.ar}
                  position={[bx, by, 0.4 + i * 0.25]}
                  rotation={[0, 0, brot]}
                  userData={{ foto: true, bx, by, brot, i, breite, ar: b.ar }}
                  materialProps={{ opacity: 0 }}
                  onClick={(e) => {
                    if (!offen) return
                    e.stopPropagation()
                    if (e.delta < 6) onBild(i)
                  }}
                  onPointerOver={() => offen && (document.body.style.cursor = 'zoom-in')}
                />
              )
            })}
          </Suspense>
        </group>
        <Html position={[0, 0, 1.6]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className={hover && !offen ? 'marke-titel ist-hover' : 'marke-titel'}
            style={
              {
                color: offen ? textFarbeAuf(projekt.farbe) : 'var(--tinte)',
                padding: `${padY}px ${padX}px`,
                opacity: labelsAus ? 0 : gedimmt ? 0.15 : 1,
                transform: offen ? 'translateX(50%)' : undefined,
                '--fx': `${fx}px`,
                '--fy': `${fy}px`,
              } as React.CSSProperties
            }
          >
            <span className="marke-flaeche" style={{ background: offen ? projekt.farbe : '#ffffff' }} />
            <span className="marke-text">
              {projekt.titel}
              <span className="marke-unter">
                {projekt.rolle} · {projekt.jahr} · {projekt.ort}
              </span>
            </span>
          </div>
        </Html>
      </group>
    </group>
  )
}

function Kamera({ ctrl }: { ctrl: RefObject<BodenCtrl> }) {
  const cam = useRef<THREE.OrthographicCamera>(null)
  const size = useThree((s) => s.size)
  const szene = useThree((s) => s.scene)

  useFrame((_, dt) => {
    const c = ctrl.current
    c.x = daempf(c.tx, c.x, 7, dt)
    c.y = daempf(c.ty, c.y, 7, dt)
    c.z = daempf(c.tz, c.z, 7, dt)
    if (cam.current) {
      cam.current.position.set(c.x, c.y, 50)
      cam.current.zoom = (size.width / 92) * c.z
      cam.current.updateProjectionMatrix()
    }
    // Ganz weit draußen beruhigt sich die Karte leicht.
    const op = THREE.MathUtils.clamp((c.z - 0.5) / 0.25, 0, 1)
    szene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.userData.foto) {
        ;((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = op
      }
    })
  })

  return <OrthographicCamera ref={cam} makeDefault position={[0, 0, 50]} />
}

export default function Boden() {
  const ctrl = useRef<BodenCtrl>({ x: 0, y: 0, z: START_ZOOM, tx: 0, ty: 0, tz: START_ZOOM })
  const [zoomUI, setZoomUI] = useState(START_ZOOM)
  const wrap = useRef<HTMLDivElement>(null)
  const zeiger = useRef<{ x: number; y: number } | null>(null)
  const [sp, setSp] = useSearchParams()
  const projekt = findProjekt(sp.get('p'))
  const [gross, setGross] = useState<number | null>(null)
  const grossRef = useRef<number | null>(null)
  grossRef.current = gross
  const offenRef = useRef(false)
  const vorher = useRef<{ tx: number; ty: number; tz: number } | null>(null)
  offenRef.current = !!projekt

  // Klick auf ein Projekt: Kamera rastet darauf ein und zoomt hinein.
  // Schließen bringt sie an den alten Ort zurück.
  useEffect(() => {
    setGross(null)
    const c = ctrl.current
    if (projekt) {
      if (!vorher.current) vorher.current = { tx: c.tx, ty: c.ty, tz: c.tz }
      const lage = LAGE[projekt.slug]
      // Anker etwas links der Mitte und nach oben versetzt: das Label
      // gleitet an die Titelposition, linksbündig über der Beschreibung.
      c.tx = lage.p[0] + 5
      c.ty = lage.p[1] - 3.4
      c.tz = 2.2
    } else {
      if (vorher.current) {
        c.tx = vorher.current.tx
        c.ty = vorher.current.ty
        c.tz = vorher.current.tz
        setZoomUI(vorher.current.tz)
        vorher.current = null
      }
    }
  }, [projekt?.slug])

  const basePx = () => (wrap.current ? wrap.current.clientWidth / 92 : 15)

  const setzeZoom = (nz: number, px?: number, py?: number) => {
    const c = ctrl.current
    nz = THREE.MathUtils.clamp(nz, MIN_ZOOM, MAX_ZOOM)
    if (px !== undefined && py !== undefined && wrap.current) {
      const { clientWidth: bw, clientHeight: bh } = wrap.current
      const s = basePx() * c.tz
      const wx = c.tx + (px - bw / 2) / s
      const wy = c.ty - (py - bh / 2) / s
      c.tx = wx - ((wx - c.tx) * c.tz) / nz
      c.ty = wy - ((wy - c.ty) * c.tz) / nz
    }
    c.tz = nz
    setZoomUI(nz)
  }

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (offenRef.current) return
      setzeZoom(ctrl.current.tz * Math.exp(-e.deltaY * 0.0014), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    zeiger.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (offenRef.current) return
    if (!zeiger.current || e.buttons !== 1) return
    const c = ctrl.current
    const s = basePx() * c.tz
    c.tx -= (e.clientX - zeiger.current.x) / s
    c.ty += (e.clientY - zeiger.current.y) / s
    zeiger.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => {
    zeiger.current = null
  }

  // Offene Beschreibung: Pfeiltasten blättern durchs Register, die Karte fährt mit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flags.lightbox) return
      const slug = sp.get('p')
      if (!slug) return
      const i = PROJEKTE.findIndex((p) => p.slug === slug)
      if (i < 0) return
      const n = PROJEKTE.length
      let ni: number | null = null
      if (e.key === 'Escape') {
        if (grossRef.current !== null) {
          setGross(null)
          return
        }
        setSp({})
        return
      }
      // Solange ein Foto groß ist, blättern die Pfeile durch die Fotos.
      if (grossRef.current !== null) {
        const anzahl = Math.min(4, PROJEKTE[i].bilder.length)
        if (e.key === 'ArrowRight') setGross((g) => ((g ?? 0) + 1) % anzahl)
        if (e.key === 'ArrowLeft') setGross((g) => ((g ?? 0) - 1 + anzahl) % anzahl)
        return
      }
      if (e.key === 'ArrowRight') ni = (i + 1) % n
      if (e.key === 'ArrowLeft') ni = (i - 1 + n) % n
      if (ni === null) return
      setSp({ p: PROJEKTE[ni].slug })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sp])

  return (
    <>
      <div
        className="buehne"
        ref={wrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: 'grab' }}
      >
        <Canvas
          dpr={[1, 2]}
          flat
          style={{ background: '#ffffff' }}
          onPointerMissed={() => {
            if (grossRef.current !== null) setGross(null)
            else if (offenRef.current) setSp({})
          }}
        >
          <Kamera ctrl={ctrl} />
          <Raster />
          <Suspense fallback={null}>
            {PROJEKTE.map((p, i) => (
              <Markierung
                key={p.slug}
                projekt={p}
                idx={i}
                offen={projekt?.slug === p.slug}
                gross={projekt?.slug === p.slug ? gross : null}
                gedimmt={!!projekt && projekt.slug !== p.slug}
                labelsAus={gross !== null}
                onOpen={(slug) => setSp({ p: slug })}
                onBild={(bi) => setGross((g) => (g === bi ? null : bi))}
              />
            ))}
          </Suspense>
        </Canvas>
      </div>

      <Kopf />
      <EntwurfSchalter />
      <div className="achse oben">2021 — 2026</div>
      <div className="achse links">Kostüm — Bühne</div>
      <div className="hinweis">ziehen: schieben · scrollen: zoomen · klicken: öffnen</div>
      <div className="zoom-regler">
        <span>−</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoomUI}
          onChange={(e) => setzeZoom(parseFloat(e.target.value))}
          aria-label="Zoom"
        />
        <span>+</span>
        <button
          onClick={() => {
            const c = ctrl.current
            c.tx = 0
            c.ty = 0
            setzeZoom(START_ZOOM)
          }}
          aria-label="Ansicht zurücksetzen"
          style={{ fontSize: 13, marginLeft: 6 }}
        >
          ⌖
        </button>
      </div>
      <Fuss fallback={['Entwurf 1', 'Der Boden', 'alle Arbeiten, 2021–2026']} projekt={projekt} />

      {/* Beschreibung mitten im freigeräumten Haufen */}
      {projekt && gross === null && (
        <div className="bo-beschreibung" key={projekt.slug}>
          <p className="bo-meta ov-anim-2">
            {projekt.rolle} · {projekt.jahr} · {projekt.ort}
          </p>
          <p className="bo-blurb ov-anim-3">{projekt.blurb}</p>
          <div className="bo-credits ov-anim-3">
            {projekt.credits.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
          {projekt.links && (
            <div className="bo-links ov-anim-3">
              {projekt.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
          <div className="bo-hinweis ov-anim-3">← → nächstes Projekt · Foto anklicken: groß · Esc schließen</div>
        </div>
      )}
    </>
  )
}
