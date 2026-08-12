import { useEffect, useMemo, useRef, useState, Suspense, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { PROJEKTE, type Projekt } from '../data/projects'
import { Kopf, Fuss, EntwurfSchalter } from '../ui/Chrome'
import { flags } from '../ui/flags'
import { daempf } from './helpers'

// Entwurf 2 — Die Drehbühne.
// Ein schwarzer Bühnenraum mit einem echten Verfolger: Die Maus führt das
// Licht, die Fotos stehen als beleuchtete Blöcke auf der Drehscheibe, und
// hinten hängt — stark abgedunkelt — das Hauptmotiv des vordersten Projekts.

const N = PROJEKTE.length
const SCHRITT = (Math.PI * 2) / N
const RADIUS = 11.2

const mod = (a: number, n: number) => ((a % n) + n) % n

interface DrehCtrl {
  ang: number
  tang: number
}

// Normierte Mausposition — führt Verfolger und Blickpunkt.
const maus = { x: 0, y: 0 }

// ---------- Hintergrund: abgeschattetes Hauptmotiv, mit Dithering gegen Banding ----------

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
varying vec2 vUv;

float zufall(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 abdecken(vec2 uv, float imgA) {
  // cover-fit: die Fläche wird immer voll gefüllt; der Fokus wandert
  // mit der Maushöhe durch den abgeschnittenen Bildbereich
  if (imgA < uPlaneA) {
    float band = imgA / uPlaneA;
    return vec2(uv.x, (uv.y - 0.5) * band + 0.5 + (uFokus - 0.5) * (1.0 - band));
  }
  return vec2((uv.x - 0.5) * (uPlaneA / imgA) + 0.5, uv.y);
}

void main() {
  vec2 uv = vec2(1.0 - vUv.x, vUv.y); // Innenseite des Zylinders
  vec3 alt = texture2D(uAlt, abdecken(uv, uAltA)).rgb;
  vec3 neu = texture2D(uBild, abdecken(uv, uBildA)).rgb;
  vec3 farbe = mix(alt, neu, smoothstep(0.0, 1.0, uMix));
  // abgeschattet, zur Mitte hin offen — als Projektion noch heller
  float vig = smoothstep(1.15, 0.3, distance(vUv, vec2(0.5, 0.42)));
  farbe *= (0.24 + 0.42 * vig) * uHell;
  // Dithering gegen sichtbare Farbstufen im Dunkeln
  farbe += (zufall(vUv * 917.0 + fract(uZeit)) - 0.5) / 96.0;
  gl_FragColor = vec4(farbe, 1.0);
  #include <colorspace_fragment>
}
`

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

function Hintergrund({ src, hell, video }: { src: string; hell: boolean; video?: string }) {
  const material = useMemo(() => {
    const leer = new THREE.DataTexture(new Uint8Array([8, 8, 8, 255]), 1, 1)
    leer.needsUpdate = true
    return new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
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
      },
      side: THREE.BackSide,
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

  useFrame(({ clock }, dt) => {
    material.uniforms.uZeit.value = clock.elapsedTime
    material.uniforms.uMix.value = Math.min(1, (material.uniforms.uMix.value as number) + dt * 1.3)
    const u = material.uniforms.uHell
    u.value += ((hell || video ? 1.7 : 1) - (u.value as number)) * (1 - Math.exp(-4 * dt))
    // Maus oben → Bildfokus oben, unten → unten
    const uf = material.uniforms.uFokus
    uf.value += (0.5 - maus.y * 0.5 - (uf.value as number)) * (1 - Math.exp(-3 * dt))
  })

  const BOGEN = 2.4 // ~140° Rückwand-Segment
  return (
    <mesh material={material} position={[0, 6, 0]}>
      <cylinderGeometry args={[19, 19, 16, 96, 1, true, Math.PI - BOGEN / 2, BOGEN]} />
    </mesh>
  )
}

// ---------- Der Verfolger: ein echtes Licht, von der Maus geführt ----------

function Verfolger() {
  const licht = useRef<THREE.SpotLight>(null)
  const ziel = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, 0.8, RADIUS)
    return o
  }, [])

  useFrame((_, dt) => {
    ziel.position.x = daempf(maus.x * 10, ziel.position.x, 4, dt)
    ziel.position.z = daempf(RADIUS - 3.5 + maus.y * 7.5, ziel.position.z, 4, dt)
    ziel.updateMatrixWorld()
  })

  return (
    <>
      <primitive object={ziel} />
      <spotLight
        ref={licht}
        position={[0, 13, 21]}
        target={ziel}
        angle={0.32}
        penumbra={0.5}
        intensity={5.2}
        color="#fff3e0"
        decay={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-radius={5}
      />
    </>
  )
}

// ---------- Foto als beleuchteter Block, Textur läuft um die Kanten ----------

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
      return new THREE.MeshLambertMaterial({ map: t })
    }
    return [
      kante(0.94, 0, 0.06, 1), // rechts
      kante(0, 0, 0.06, 1), // links
      kante(0, 0.94, 1, 0.06), // oben
      kante(0, 0, 1, 0.06), // unten
      new THREE.MeshLambertMaterial({ map: tex }), // vorn
      new THREE.MeshLambertMaterial({ color: '#2a2a2a' }), // hinten
    ]
  }, [tex])
  return (
    <mesh {...props} material={materialien} castShadow receiveShadow>
      <boxGeometry args={[breite, breite / ar, dicke]} />
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
        m.userData.grundfarben = mats.map((mat) => (mat as THREE.MeshLambertMaterial).color.clone())
      }
    })
  })

  const fotos = projekt.bilder.slice(0, 3)
  const lagen = [
    { x: -0.85, z: 0.07, b: 2.6, ry: 0.05 },
    { x: 1.18, z: 0.6, b: 1.68, ry: -0.12 },
    { x: 0.28, z: 1.15, b: 1.35, ry: 0.09 },
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
  projiziert,
}: {
  ctrl: RefObject<DrehCtrl>
  onDrehen: (index: number) => void
  onBild: (bildIndex: number) => void
  aktiv: number
  projiziert: number | null
}) {
  const scheibe = useRef<THREE.Group>(null)
  const szene = useThree((s) => s.scene)
  const cam = useThree((s) => s.camera)

  useEffect(() => {
    cam.lookAt(0, 2.0, 0)
  }, [cam])

  useFrame((_, dt) => {
    const c = ctrl.current
    c.ang = daempf(c.tang, c.ang, 5, dt)
    if (scheibe.current) scheibe.current.rotation.y = c.ang

    // Vorderstes Projekt aufhellen, alle anderen abdunkeln.
    szene.traverse((o) => {
      if (!((o as THREE.Group).isGroup && o.userData.kulisse)) return
      const winkel = mod(c.ang + o.userData.index * SCHRITT + Math.PI, Math.PI * 2) - Math.PI
      const vorn = Math.abs(winkel) < SCHRITT / 2
      const ziel = vorn ? 1 : 0.55
      o.userData.b = daempf(ziel, o.userData.b ?? 0.55, 5, dt)
      o.traverse((kind) => {
        const m = kind as THREE.Mesh
        if (m.isMesh && m.userData.grundfarben) {
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach((mat, mi) => {
            ;(mat as THREE.MeshLambertMaterial).color
              .copy((m.userData.grundfarben as THREE.Color[])[mi])
              .multiplyScalar(o.userData.b as number)
          })
        }
      })
    })
  })

  return (
    <>
      <Hintergrund
        src={PROJEKTE[aktiv].bilder[Math.min(projiziert ?? 0, PROJEKTE[aktiv].bilder.length - 1)].src}
        hell={projiziert !== null}
        video={PROJEKTE[aktiv].videoDatei}
      />
      <ambientLight intensity={0.42} color="#f2ecff" />
      <Verfolger />

      <group ref={scheibe}>
        {/* Drehscheibe */}
        <mesh position={[0, -0.19, 0]} receiveShadow>
          <cylinderGeometry args={[13.4, 13.4, 0.38, 128]} />
          <meshLambertMaterial color="#4a4a4a" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[13.1, 13.4, 128]} />
          <meshBasicMaterial color="#4a4a4a" toneMapped={false} />
        </mesh>
        {PROJEKTE.map((p, i) => (
          <Kulisse key={p.slug} projekt={p} index={i} vorn={i === aktiv} onDrehen={onDrehen} onBild={onBild} />
        ))}
      </group>
    </>
  )
}

export default function Drehbuehne() {
  const [aktiv, setAktiv] = useState(0)
  const [projiziert, setProjiziert] = useState<number | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const zeiger = useRef<{ x: number; roh: number } | null>(null)
  const radAcc = useRef({ acc: 0, t: 0 })

  const ctrl = useRef<DrehCtrl>({ ang: Math.PI, tang: 0 })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      maus.x = (e.clientX / window.innerWidth) * 2 - 1
      maus.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const aktivAusTang = (tang: number) => mod(Math.round(-tang / SCHRITT), N)

  const schnappe = (tang: number) => {
    ctrl.current.tang = tang
    setAktiv(aktivAusTang(tang))
    setProjiziert(null)
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
          shadows
          camera={{ fov: 34, position: [0, 3.1, 28.5], near: 0.1, far: 90 }}
          style={{ background: '#0c0c0c' }}
        >
          <fog attach="fog" args={['#0c0c0c', 32, 60]} />
          <Buehnenraum
            ctrl={ctrl}
            aktiv={aktiv}
            projiziert={projiziert}
            onDrehen={dreheZu}
            onBild={(i) => setProjiziert((v) => (v === i ? null : i))}
          />
        </Canvas>
      </div>

      <Kopf hell />
      <EntwurfSchalter hell />
      {p.video && !p.videoDatei && (
        <div className="db-video-zone">
          <iframe
            src={`${p.video}?background=1&autoplay=1&muted=1&loop=1`}
            allow="autoplay; fullscreen"
            title={`${p.titel} — Video`}
          />
        </div>
      )}
      <div className="sb-titel" style={{ color: '#fff' }}>
        <div className="db-pfeile">
          <button onClick={() => schnappe(ctrl.current.tang + SCHRITT)} aria-label="Vorheriges Projekt">
            ←
          </button>
          <button onClick={() => schnappe(ctrl.current.tang - SCHRITT)} aria-label="Nächstes Projekt">
            →
          </button>
        </div>
        <h2>{p.titel}</h2>
      </div>

      {/* Beschreibung unten rechts — über dunklem Boden, ohne Fläche. */}
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

      <div className="hinweis hell">ziehen oder scrollen: drehen · Maus führt das Licht · Foto anklicken: auf den Rundhorizont</div>
      <Fuss hell fallback={['Entwurf 2', 'Die Drehbühne', 'alle Arbeiten, 2021–2026']} />
    </>
  )
}
