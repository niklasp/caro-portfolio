import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Projekt } from '../data/projects'
import { flags } from './flags'

// Der Lichtkasten: ein Bild aus der Beschreibung, groß, mit Shader-Übergang.
// Die Farbfläche des Projekts fegt als Vorhang über das Bild — links raus, rechts rein.

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform sampler2D uVon;
uniform sampler2D uZu;
uniform float uProg;
uniform float uVonIstFarbe;
uniform float uPlaneAspect;
uniform float uVonAspect;
uniform float uZuAspect;
uniform vec3 uFarbe;
varying vec2 vUv;

vec4 abtasten(sampler2D t, vec2 uv, float imgA) {
  vec2 s = vec2(max(1.0, uPlaneAspect / imgA), max(1.0, imgA / uPlaneAspect));
  vec2 q = (uv - 0.5) * s + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return vec4(0.0);
  return texture2D(t, q);
}

void main() {
  float b = 0.18;
  float t = uProg * (1.0 + 2.0 * b) - b;
  float m = smoothstep(t - b, t + b, vUv.x); // 1 = altes Bild, 0 = neues
  float band = m * (1.0 - m) * 4.0;

  vec2 uv = vUv;
  uv.x += band * 0.045 * sin(vUv.y * 9.0 + uProg * 8.0);

  vec4 von = (uVonIstFarbe > 0.5) ? vec4(uFarbe, 1.0) : abtasten(uVon, uv, uVonAspect);
  vec4 zu = abtasten(uZu, uv, uZuAspect);
  vec4 farbe = mix(zu, von, m);
  farbe.rgb = mix(farbe.rgb, uFarbe, band * 0.9);
  farbe.a = max(farbe.a, band * 0.9);
  gl_FragColor = farbe;
  #include <colorspace_fragment>
}
`

const lader = new THREE.TextureLoader()
const texCache = new Map<string, Promise<THREE.Texture>>()
function ladeTex(src: string): Promise<THREE.Texture> {
  let p = texCache.get(src)
  if (!p) {
    p = lader.loadAsync(src).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return t
    })
    texCache.set(src, p)
  }
  return p
}

interface Steuer {
  ziel: number // Bildindex, der gezeigt werden soll
}

function Leinwand({ projekt, steuer }: { projekt: Projekt; steuer: { current: Steuer } }) {
  const size = useThree((s) => s.size)
  const mesh = useRef<THREE.Mesh>(null)
  const gezeigt = useRef(-1)
  const laeuft = useRef(false)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        uniforms: {
          uVon: { value: null },
          uZu: { value: null },
          uProg: { value: 0 },
          uVonIstFarbe: { value: 1 },
          uPlaneAspect: { value: 1 },
          uVonAspect: { value: 1 },
          uZuAspect: { value: 1 },
          uFarbe: { value: new THREE.Color(projekt.farbe) },
        },
      }),
    // Material lebt so lange wie der Lichtkasten eines Projekts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((_, dt) => {
    const u = material.uniforms
    u.uPlaneAspect.value = size.width / size.height

    // Nächstes Ziel anfahren, sobald der laufende Übergang fertig ist.
    if (!laeuft.current && gezeigt.current !== steuer.current.ziel) {
      const ziel = steuer.current.ziel
      laeuft.current = true
      ladeTex(projekt.bilder[ziel].src).then((tex) => {
        if (u.uZu.value) {
          u.uVon.value = u.uZu.value
          u.uVonAspect.value = u.uZuAspect.value
          u.uVonIstFarbe.value = 0
        } else {
          u.uVonIstFarbe.value = 1
        }
        u.uZu.value = tex
        u.uZuAspect.value = projekt.bilder[ziel].ar
        u.uProg.value = 0
        gezeigt.current = ziel
      })
    }
    if (u.uZu.value) {
      u.uProg.value = Math.min(1, u.uProg.value + dt * 2.2)
      if (u.uProg.value >= 1) laeuft.current = false
    }
  })

  return (
    <mesh ref={mesh} material={material} scale={[size.width, size.height, 1]}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

export default function Lichtkasten({
  projekt,
  start,
  onClose,
}: {
  projekt: Projekt
  start: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(start)
  const steuer = useRef<Steuer>({ ziel: start })
  const n = projekt.bilder.length

  const gehe = (delta: number) => {
    setIndex((i) => {
      const ni = (((i + delta) % n) + n) % n
      steuer.current.ziel = ni
      return ni
    })
  }

  useEffect(() => {
    flags.lightbox = true
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') gehe(1)
      if (e.key === 'ArrowLeft') gehe(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      flags.lightbox = false
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="lichtkasten" onClick={onClose}>
      <div className="lk-canvas" onClick={(e) => e.stopPropagation()}>
        <Canvas dpr={[1, 2]} flat orthographic camera={{ zoom: 1, position: [0, 0, 5] }} gl={{ alpha: true }}>
          <Leinwand projekt={projekt} steuer={steuer} />
        </Canvas>
      </div>
      <button className="lk-schliessen" onClick={onClose} aria-label="Schließen">
        ×
      </button>
      <div className="lk-nav" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => gehe(-1)} aria-label="Vorheriges Bild">
          ←
        </button>
        <span>
          {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </span>
        <button onClick={() => gehe(1)} aria-label="Nächstes Bild">
          →
        </button>
      </div>
      <div className="lk-unterschrift">
        <span>{projekt.rolle}</span>
        <span>{projekt.jahr}</span>
        <span>
          {projekt.titel}, {projekt.ort}
        </span>
      </div>
    </div>
  )
}
