import { useEffect, useMemo, useRef, useState, Suspense, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { PROJEKTE, type Projekt } from '../data/projects'
import { Kopf, Fuss, EntwurfSchalter } from '../ui/Chrome'
import Lichtkasten from '../ui/Lichtkasten'
import { flags } from '../ui/flags'
import { daempf } from './helpers'

// Entwurf 2 — Die Drehbühne.
// Ein schwarzer Bühnenraum: sacht bewegter Samtvorhang, ein Lichtkegel.
// Alle Arbeiten stehen als Kulissen auf einer Drehscheibe — Ziehen oder
// Scrollen dreht die Bühne, das vorderste Projekt steht im Licht. Die
// Beschreibung steht auf großen Bildschirmen direkt im Raum.

const N = PROJEKTE.length
const SCHRITT = (Math.PI * 2) / N
const RADIUS = 12

const mod = (a: number, n: number) => ((a % n) + n) % n

interface DrehCtrl {
  ang: number
  tang: number
}

// Normierte Mausposition — kippt die Bühne leicht.
const maus = { x: 0, y: 0 }

// Ein Foto als Objekt: Leinwand mit Tiefe, die Textur läuft um die Kanten
// herum wie bei einem aufgezogenen Abzug.
function FotoObjekt({
  url,
  breite,
  ar,
  dicke = 0.5,
  ...props
}: {
  url: string
  breite: number
  ar: number
  dicke?: number
} & ThreeElements['mesh']) {
  const tex = useLoader(THREE.TextureLoader, url)
  const materialien = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const kante = (ox: number, oy: number, rx: number, ry: number) => {
      const t = tex.clone()
      t.needsUpdate = true
      t.repeat.set(rx, ry)
      t.offset.set(ox, oy)
      return new THREE.MeshBasicMaterial({ map: t, toneMapped: false })
    }
    return [
      kante(0.94, 0, 0.06, 1), // rechts
      kante(0, 0, 0.06, 1), // links
      kante(0, 0.94, 1, 0.06), // oben
      kante(0, 0, 1, 0.06), // unten
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), // vorn
      new THREE.MeshBasicMaterial({ color: '#1a1a1a', toneMapped: false }), // hinten
    ]
  }, [tex])
  return (
    <mesh {...props} material={materialien}>
      <boxGeometry args={[breite, breite / ar, dicke]} />
    </mesh>
  )
}

// Der Samtvorhang: umschließt die Szene, mit gefaltetem Lichtspiel.
const VORHANG_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uZeit;
uniform vec3 uTon;
void main() {
  // Der Stoff bewegt sich leicht: eine langsame Welle wandert durch die Falten.
  float x = vUv.x + 0.008 * sin(uZeit * 0.45 + vUv.y * 3.5 + vUv.x * 24.0)
                  + 0.004 * sin(uZeit * 0.7 + vUv.y * 9.0);
  float grob = sin(x * 43.0 + sin(x * 17.0) * 2.2 + uZeit * 0.12);
  float fein = sin(x * 210.0 + uZeit * 0.2);
  float falte = pow(abs(grob), 1.7) + 0.25 * pow(abs(fein), 2.0);
  float hell = 0.012 + 0.030 * falte;
  hell *= 1.0 + 0.10 * sin(uZeit * 0.3 + vUv.x * 6.0);
  hell *= smoothstep(0.0, 0.28, vUv.y);              // unten im Dunkel
  hell *= 1.0 - 0.55 * smoothstep(0.58, 1.0, vUv.y); // oben weg vom Licht
  hell *= 0.78 + 0.22 * sin(vUv.x * 9.0 + 1.7);      // große Bahnen
  vec3 farbe = vec3(hell) * mix(vec3(1.0, 0.97, 0.92), uTon * 2.4, 0.5);
  gl_FragColor = vec4(farbe, 1.0);
  #include <colorspace_fragment>
}
`

function Vorhang({ farbe }: { farbe: string }) {
  const ziel = useMemo(() => new THREE.Color(), [])
  useMemo(() => ziel.set(farbe), [farbe, ziel])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: VORHANG_FRAG,
        uniforms: { uZeit: { value: 0 }, uTon: { value: new THREE.Color('#ffffff') } },
        side: THREE.BackSide,
      }),
    []
  )
  useFrame(({ clock }, dt) => {
    material.uniforms.uZeit.value = clock.elapsedTime
    ;(material.uniforms.uTon.value as THREE.Color).lerp(ziel, 1 - Math.exp(-2.2 * dt))
  })
  return (
    <mesh material={material} position={[0, 5.4, 0]}>
      <cylinderGeometry args={[20, 20, 15, 160, 1, true]} />
    </mesh>
  )
}

// Farbiger Schein hinter der Bühne — der Rundhorizont übernimmt die Projektfarbe.
function Schein({ farbe }: { farbe: string }) {
  const mesh = useRef<THREE.Mesh>(null)
  const ziel = useMemo(() => new THREE.Color(), [])
  useMemo(() => ziel.set(farbe), [farbe, ziel])
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,255,255,0.85)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.25)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    ;((m.material as THREE.MeshBasicMaterial).color as THREE.Color).lerp(ziel, 1 - Math.exp(-2.2 * dt))
  })
  return (
    <mesh ref={mesh} position={[0, 4.2, -13]}>
      <planeGeometry args={[42, 22]} />
      <meshBasicMaterial
        map={tex}
        color="#0c0c0c"
        transparent
        opacity={0.42}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function Kulisse({
  projekt,
  index,
  vorn,
  onDrehen,
  onBild,
}: {
  projekt: Projekt
  index: number
  vorn: boolean
  onDrehen: (index: number) => void
  onBild: (bildIndex: number) => void
}) {
  const theta = index * SCHRITT
  const gruppe = useRef<THREE.Group>(null)

  useEffect(() => {
    // Grundfarben einmalig merken, damit das Abdunkeln nicht kumuliert.
    gruppe.current?.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !m.userData.grundfarben) {
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        m.userData.grundfarben = mats.map((mat) => (mat as THREE.MeshBasicMaterial).color.clone())
      }
    })
  })

  const fotos = projekt.bilder.slice(0, 3)
  const lagen = [
    { x: -1.1, z: 0.07, b: 3.0, ry: 0.05 },
    { x: 1.5, z: 0.6, b: 1.95, ry: -0.12 },
    { x: 0.35, z: 1.15, b: 1.55, ry: 0.09 },
  ]

  return (
    <group position={[Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS]} rotation={[0, theta, 0]}>
      <group
        ref={gruppe}
        userData={{ kulisse: true, index }}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta < 6 && !vorn) onDrehen(index)
        }}
        onPointerOver={() => (document.body.style.cursor = vorn ? 'zoom-in' : 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <Suspense fallback={null}>
          {fotos.map((b, i) => {
            const l = lagen[i]
            const h = l.b / b.ar
            return (
              <FotoObjekt
                key={b.src}
                url={b.src}
                breite={l.b}
                ar={b.ar}
                position={[l.x, h / 2 + 0.02, l.z]}
                rotation={[0, l.ry, 0]}
                onClick={(e) => {
                  e.stopPropagation()
                  if (e.delta >= 6) return
                  if (vorn) onBild(i)
                  else onDrehen(index)
                }}
              />
            )
          })}
        </Suspense>
      </group>
    </group>
  )
}

function Buehnenraum({
  ctrl,
  onDrehen,
  onBild,
  aktiv,
}: {
  ctrl: RefObject<DrehCtrl>
  onDrehen: (index: number) => void
  onBild: (bildIndex: number) => void
  aktiv: number
}) {
  const scheibe = useRef<THREE.Group>(null)
  const kippen = useRef<THREE.Group>(null)
  const szene = useThree((s) => s.scene)
  const cam = useThree((s) => s.camera)

  useEffect(() => {
    cam.lookAt(0, 2.0, 0)
  }, [cam])

  // Weicher Lichtteppich statt harter Kreiskante.
  const lache = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(128, 128, 12, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255, 240, 214, 0.9)')
    grad.addColorStop(0.55, 'rgba(255, 240, 214, 0.28)')
    grad.addColorStop(1, 'rgba(255, 240, 214, 0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])

  useFrame((_, dt) => {
    const c = ctrl.current
    c.ang = daempf(c.tang, c.ang, 5, dt)
    if (scheibe.current) scheibe.current.rotation.y = c.ang
    // Die ganze Bühne kippt sacht zur Maus.
    if (kippen.current) {
      kippen.current.rotation.x = daempf(maus.y * 0.035, kippen.current.rotation.x, 4, dt)
      kippen.current.rotation.z = daempf(maus.x * -0.022, kippen.current.rotation.z, 4, dt)
    }

    // Vorderstes Projekt aufhellen, alle anderen abdunkeln.
    szene.traverse((o) => {
      if (!((o as THREE.Group).isGroup && o.userData.kulisse)) return
      const winkel = mod(c.ang + o.userData.index * SCHRITT + Math.PI, Math.PI * 2) - Math.PI
      const vorn = Math.abs(winkel) < SCHRITT / 2
      const ziel = vorn ? 1 : 0.2
      o.userData.b = daempf(ziel, o.userData.b ?? 0.2, 5, dt)
      o.traverse((kind) => {
        const m = kind as THREE.Mesh
        if (m.isMesh && m.userData.grundfarben) {
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach((mat, mi) => {
            ;(mat as THREE.MeshBasicMaterial).color
              .copy((m.userData.grundfarben as THREE.Color[])[mi])
              .multiplyScalar(o.userData.b as number)
          })
        }
      })
    })
  })

  return (
    <>
      <Vorhang farbe={PROJEKTE[aktiv].farbe} />
      <Schein farbe={PROJEKTE[aktiv].farbe} />

      <group ref={kippen}>
      <group ref={scheibe}>
        {/* Drehscheibe */}
        <mesh position={[0, -0.19, 0]}>
          <cylinderGeometry args={[13.4, 13.4, 0.38, 128]} />
          <meshBasicMaterial color="#181818" toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[13.1, 13.4, 128]} />
          <meshBasicMaterial color="#4a4a4a" toneMapped={false} />
        </mesh>
        {PROJEKTE.map((p, i) => (
          <Kulisse key={p.slug} projekt={p} index={i} vorn={i === aktiv} onDrehen={onDrehen} onBild={onBild} />
        ))}
      </group>
      </group>

      {/* Lichtkegel auf die vorderste Position — fest im Raum, dreht nicht mit. */}
      <mesh position={[0, 4.7, RADIUS]}>
        <coneGeometry args={[3.3, 9.4, 48, 1, true]} />
        <meshBasicMaterial
          color="#fff3e0"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, RADIUS]}>
        <planeGeometry args={[9.5, 9.5]} />
        <meshBasicMaterial
          map={lache}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}

export default function Drehbuehne() {
  const [aktiv, setAktiv] = useState(0)

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
  const panel = useRef<HTMLDivElement>(null)
  const zeiger = useRef<{ x: number; roh: number } | null>(null)
  const radAcc = useRef({ acc: 0, t: 0 })

  const ctrl = useRef<DrehCtrl>({ ang: Math.PI, tang: 0 })

  const aktivAusTang = (tang: number) => mod(Math.round(-tang / SCHRITT), N)

  const schnappe = (tang: number) => {
    ctrl.current.tang = tang
    setAktiv(aktivAusTang(tang))
    setLichtkasten(null)
  }

  const dreheZu = (index: number) => {
    // Kürzester Weg zum Ziel-Index.
    const c = ctrl.current
    const ziel = -index * SCHRITT
    const delta = mod(ziel - c.tang + Math.PI, Math.PI * 2) - Math.PI
    schnappe(c.tang + delta)
  }

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (flags.lightbox) return
      const r = radAcc.current
      const jetzt = performance.now()
      if (jetzt - r.t < 350) return
      r.acc += e.deltaY
      if (Math.abs(r.acc) > 60) {
        const richtung = Math.sign(r.acc)
        r.acc = 0
        r.t = jetzt
        schnappe(ctrl.current.tang - richtung * SCHRITT)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flags.lightbox) return
      if (e.key === 'ArrowRight') schnappe(ctrl.current.tang - SCHRITT)
      if (e.key === 'ArrowLeft') schnappe(ctrl.current.tang + SCHRITT)
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
      el.style.transform = `translate(${nx * -8}px, ${ny * -6}px)`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => (zeiger.current = { x: e.clientX, roh: ctrl.current.tang })
  const onPointerMove = (e: React.PointerEvent) => {
    if (!zeiger.current || e.buttons !== 1) return
    ctrl.current.tang = zeiger.current.roh + (e.clientX - zeiger.current.x) * 0.0055
  }
  const onPointerUp = () => {
    if (!zeiger.current) return
    zeiger.current = null
    schnappe(Math.round(ctrl.current.tang / SCHRITT) * SCHRITT)
  }

  const p = PROJEKTE[aktiv]

  return (
    <>
      <div
        className="buehne"
        ref={wrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: 'grab', background: '#0c0c0c' }}
      >
        <Canvas
          dpr={[1, 2]}
          flat
          camera={{ fov: 37, position: [0, 3.1, 28.5], near: 0.1, far: 90 }}
          style={{ background: '#0c0c0c' }}
        >
          <fog attach="fog" args={['#0c0c0c', 32, 60]} />
          <Buehnenraum ctrl={ctrl} aktiv={aktiv} onDrehen={dreheZu} onBild={(i) => setLichtkasten(i)} />
        </Canvas>
      </div>

      <Kopf hell />
      <EntwurfSchalter hell />
      <div className="sb-titel" style={{ color: '#fff' }}>
        <h2>{p.titel}</h2>
      </div>

      {/* Beschreibung direkt im Bühnenraum — nur auf großen Bildschirmen. */}
      <div className="db-beschreibung" ref={panel} key={p.slug}>
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

      <div className="pfeil-nav" style={{ color: '#fff' }}>
        <button onClick={() => schnappe(ctrl.current.tang + SCHRITT)} aria-label="Vorheriges Projekt">
          ←
        </button>
        <button onClick={() => schnappe(ctrl.current.tang - SCHRITT)} aria-label="Nächstes Projekt">
          →
        </button>
      </div>
      <div className="hinweis hell">ziehen oder scrollen: drehen · Foto anklicken: groß</div>
      <Fuss hell projekt={p} />
      {lichtkasten !== null && (
        <Lichtkasten projekt={p} start={Math.min(lichtkasten, p.bilder.length - 1)} onClose={() => setLichtkasten(null)} />
      )}
    </>
  )
}
