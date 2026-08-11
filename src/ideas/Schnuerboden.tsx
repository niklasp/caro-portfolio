import { useEffect, useMemo, useRef, useState, Suspense, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PROJEKTE, type Projekt as ProjektDaten } from '../data/projects'
import { Kopf, Fuss, EntwurfSchalter } from '../ui/Chrome'
import Lichtkasten from '../ui/Lichtkasten'
import { flags } from '../ui/flags'
import { Foto, Farbflaeche } from './helpers'

// Entwurf 3 — Der Schnürboden.
// Die Projekte hängen an Zügen wie Prospekte über der Bühne. Scrollen fährt
// ein Bühnenbild nach dem anderen ein und aus. Auch die Beschreibung hängt
// mit — als scrollbare Karte am eigenen Zug. Fotos öffnen im Lichtkasten.

const OBEN = 15 // Parkposition im Schnürboden, über dem Bild
const UNTEN = -15 // Parkposition unter der Bühne — fürs Zurückblättern

// Gemeinsame, normierte Mausposition (-1 … 1) — jedes Element reagiert anders darauf.
const maus = { x: 0, y: 0 }

// Jedes Foto zieht in eine andere Richtung, unterschiedlich stark.
const PAR_FOTOS: [number, number, number][] = [
  [-1.15, 0.7, -0.009],
  [0.8, -1.25, 0.007],
  [-1.55, -0.85, 0.011],
]

interface Feder {
  y: number
  v: number
  ziel: number
}

// Ein hängendes Element an zwei Zügen, mit eigener Feder.
// Beim Fahren neigt es sich mit der Geschwindigkeit — wie ein echter Prospekt.
function Behang({
  kinder,
  breite,
  hoehe,
  position,
  phase,
  feder,
  par = [0, 0, 0],
  pendel = 0.008,
}: {
  kinder: ReactNode
  breite: number
  hoehe: number
  position: [number, number, number]
  phase: number
  feder: { current: Feder }
  par?: [number, number, number]
  pendel?: number
}) {
  const ref = useRef<THREE.Group>(null)
  const versatz = useRef({ x: 0, y: 0, r: 0 })
  useFrame(({ clock }, roheDt) => {
    if (!ref.current) return
    const dt = Math.min(roheDt, 1 / 30) // große Frame-Lücken (Tab-Wechsel) nicht in die Feder integrieren
    const f = feder.current
    const kraft = (f.ziel - f.y) * 34
    f.v = (f.v + kraft * dt) * Math.exp(-10.5 * dt)
    f.y += f.v * dt
    // Jedes Element antwortet anders auf die Maus — Stärke, Richtung, Drehung.
    const k = 1 - Math.exp(-3.5 * dt)
    const o = versatz.current
    o.x += (maus.x * par[0] - o.x) * k
    o.y += (-maus.y * par[1] - o.y) * k
    o.r += (maus.x * par[2] - o.r) * k
    ref.current.position.set(position[0] + o.x, position[1] + f.y + o.y, position[2])
    // Grundpendeln + Neigung aus der Fahrgeschwindigkeit
    const fahrt = THREE.MathUtils.clamp(f.v * 0.006, -0.05, 0.05)
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + phase) * pendel + fahrt + o.r
  })
  return (
    <group ref={ref} position={[position[0], position[1] + OBEN, position[2]]}>
      {kinder}
    </group>
  )
}

function Projekt({
  projekt,
  aktiv,
  richtung,
  onBild,
}: {
  projekt: ProjektDaten
  aktiv: boolean
  richtung: number
  onBild: (index: number) => void
}) {
  const fotos = projekt.bilder.slice(0, 3)
  const lagen: { p: [number, number, number]; b: number }[] = [
    { p: [-2.7, 0.25, 0.1], b: 3.4 },
    { p: [0.55, 1.25, 0.6], b: 2.2 },
    { p: [-0.4, -1.15, 1.1], b: 1.8 },
  ]

  // Eine Feder pro Behang, gestaffelt losgelassen — so setzt das Bühnenbild in Wellen auf.
  // Die Richtung des Blätterns bestimmt, von wo das neue Bild kommt und wohin das alte geht.
  const federn = useRef<Feder[]>([0, 1, 2, 3, 4].map(() => ({ y: OBEN, v: 0, ziel: OBEN })))
  const warAktiv = useRef(false)
  useEffect(() => {
    if (aktiv === warAktiv.current) return
    const einstieg = richtung > 0 ? UNTEN : OBEN
    const ausstieg = richtung > 0 ? OBEN : richtung < 0 ? UNTEN : OBEN
    const timer = federn.current.map((f, i) =>
      setTimeout(() => {
        if (aktiv) {
          f.y = einstieg
          f.v = 0
          f.ziel = 0
        } else {
          f.ziel = ausstieg
        }
      }, (aktiv ? i : federn.current.length - i) * 65)
    )
    warAktiv.current = aktiv
    return () => timer.forEach(clearTimeout)
  }, [aktiv, richtung])

  return (
    <group>
      <Behang
        feder={{ current: federn.current[0] }}
        breite={5.6}
        hoehe={3.8}
        position={[-1.3, 0.7, -0.9]}
        phase={0.4}
        par={[0.45, 0.3, 0.004]}
        kinder={<Farbflaeche farbe={projekt.farbe} breite={5.6} hoehe={3.8} />}
      />
      <Suspense fallback={null}>
        {fotos.map((b, i) => {
          const l = lagen[i]
          return (
            <Behang
              key={b.src}
              feder={{ current: federn.current[i + 1] }}
              breite={l.b}
              hoehe={l.b / b.ar}
              position={l.p}
              phase={i * 1.7}
              par={PAR_FOTOS[i]}
              kinder={
                <Foto
                  url={b.src}
                  breite={l.b}
                  ar={b.ar}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (aktiv && e.delta < 6) onBild(i)
                  }}
                  onPointerOver={() => aktiv && (document.body.style.cursor = 'zoom-in')}
                  onPointerOut={() => (document.body.style.cursor = '')}
                />
              }
            />
          )
        })}
      </Suspense>
      {/* Die Beschreibung hängt mit — scrollbar, am eigenen Zug. */}
      <Behang
        feder={{ current: federn.current[4] }}
        breite={2.4}
        hoehe={3.4}
        position={[3.3, 0.35, 0.4]}
        phase={2.6}
        par={[0, 0, 0]}
        pendel={0}
        kinder={
          <Html transform scale={0.34} zIndexRange={[30, 0]} style={{ pointerEvents: aktiv ? 'auto' : 'none' }}>
            <div className="sb-panel" style={{ borderColor: projekt.farbe }} onWheel={(e) => e.stopPropagation()}>
              <h3>{projekt.titel}</h3>
              <p className="sb-panel-meta">
                {projekt.rolle} · {projekt.jahr} · {projekt.ort}
              </p>
              <p>{projekt.blurb}</p>
              <div className="sb-panel-credits">
                {projekt.credits.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
              {projekt.links && (
                <div style={{ marginTop: 10 }}>
                  {projekt.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ borderBottom: '1px solid', marginRight: 12 }}>
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Html>
        }
      />
    </group>
  )
}

export default function Schnuerboden() {
  const [index, setIndex] = useState(0)
  const richtung = useRef(0)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      maus.x = (e.clientX / window.innerWidth) * 2 - 1
      maus.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  const [lichtkasten, setLichtkasten] = useState<number | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const radAcc = useRef({ acc: 0, t: 0 })

  const gehe = (i: number) => {
    const ziel = ((i % PROJEKTE.length) + PROJEKTE.length) % PROJEKTE.length
    let d = ziel - index
    if (d > PROJEKTE.length / 2) d -= PROJEKTE.length
    if (d < -PROJEKTE.length / 2) d += PROJEKTE.length
    if (d !== 0) richtung.current = Math.sign(d)
    setIndex(ziel)
    setLichtkasten(null)
  }

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (flags.lightbox) return
      const r = radAcc.current
      const jetzt = performance.now()
      if (jetzt - r.t < 500) return
      r.acc += e.deltaY
      if (Math.abs(r.acc) > 70) {
        const schritt = Math.sign(r.acc)
        r.acc = 0
        r.t = jetzt
        gehe(index + schritt)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flags.lightbox) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') gehe(index + 1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') gehe(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index])

  const p = PROJEKTE[index]

  return (
    <>
      <div className="buehne" ref={wrap}>
        <Canvas
          dpr={[1, 2]}
          flat
          camera={{ fov: 35, position: [0, 0.4, 11.5], near: 0.1, far: 60 }}
          style={{ background: '#ffffff' }}
        >
          {PROJEKTE.map((pr, i) => (
            <Projekt
              key={pr.slug}
              projekt={pr}
              aktiv={i === index}
              richtung={richtung.current}
              onBild={(bi) => setLichtkasten(bi)}
            />
          ))}
        </Canvas>
      </div>

      <Kopf />
      <EntwurfSchalter />
      <div className="sb-titel sb-titel-blend">
        <h2>{p.titel}</h2>
        <div className="sb-meta">
          {String(index + 1).padStart(2, '0')} / {String(PROJEKTE.length).padStart(2, '0')}
        </div>
      </div>
      <div className="register">
        {PROJEKTE.map((pr, i) => (
          <button key={pr.slug} className={i === index ? 'aktiv' : ''} onClick={() => gehe(i)}>
            <span className="titel-kurz">{pr.titel}</span>
            <span className="marke" style={{ background: pr.farbe, opacity: i === index ? 1 : 0.45 }} />
          </button>
        ))}
      </div>
      <div className="pfeil-nav">
        <button onClick={() => gehe(index - 1)} aria-label="Vorheriges Projekt">
          ←
        </button>
        <button onClick={() => gehe(index + 1)} aria-label="Nächstes Projekt">
          →
        </button>
      </div>
      <div className="hinweis">scrollen oder Pfeiltasten: nächstes Bühnenbild · Foto anklicken: groß</div>
      <Fuss projekt={p} />
      {lichtkasten !== null && (
        <Lichtkasten projekt={p} start={Math.min(lichtkasten, p.bilder.length - 1)} onClose={() => setLichtkasten(null)} />
      )}
    </>
  )
}
