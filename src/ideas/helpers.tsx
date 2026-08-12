import { useEffect, useMemo, useState } from 'react'
import { useLoader, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

type MeshProps = ThreeElements['mesh']

interface FotoProps extends Omit<MeshProps, 'children'> {
  url: string
  breite: number
  ar: number
  ersatz?: THREE.Texture | null
  materialProps?: ThreeElements['meshBasicMaterial']
}

// Foto-Plane mit korrektem Farbraum. Breite in Welt-Einheiten, Höhe aus dem
// Seitenverhältnis. `ersatz` (z. B. eine Videotextur) übersteuert das Bild.
export function Foto({ url, breite, ar, ersatz, materialProps = {}, ...props }: FotoProps) {
  const tex = useLoader(THREE.TextureLoader, url)
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
  }, [tex])
  return (
    <mesh {...props}>
      <planeGeometry args={[breite, breite / ar]} />
      <meshBasicMaterial map={ersatz ?? tex} toneMapped={false} transparent {...materialProps} />
    </mesh>
  )
}

// Abspielposition pro Videodatei merken — Pause statt Neustart.
const videoZeiten = new Map<string, number>()

// Videotextur, die nur lebt, solange src gesetzt ist.
export function useVideoTextur(src: string | undefined, spielt: boolean): THREE.VideoTexture | null {
  const [tex, setTex] = useState<THREE.VideoTexture | null>(null)
  useEffect(() => {
    if (!src) {
      setTex(null)
      return
    }
    const v = document.createElement('video')
    v.src = src
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.crossOrigin = 'anonymous'
    v.currentTime = videoZeiten.get(src) ?? 0
    const t = new THREE.VideoTexture(v)
    t.colorSpace = THREE.SRGBColorSpace
    setTex(t)
    return () => {
      videoZeiten.set(src, v.currentTime)
      v.pause()
      v.removeAttribute('src')
      t.dispose()
      setTex(null)
    }
  }, [src])
  useEffect(() => {
    const v = tex?.image as HTMLVideoElement | undefined
    if (!v) return
    if (spielt) v.play().catch(() => {})
    else v.pause()
  }, [spielt, tex])
  return tex
}

interface FarbflaecheProps extends Omit<MeshProps, 'children'> {
  farbe: string
  breite: number
  hoehe: number
  materialProps?: ThreeElements['meshBasicMaterial']
}

// Farbfläche — das Rechteck aus dem gedruckten Portfolio als Objekt im Raum.
export function Farbflaeche({ farbe, breite, hoehe, materialProps = {}, ...props }: FarbflaecheProps) {
  return (
    <mesh {...props}>
      <planeGeometry args={[breite, hoehe]} />
      <meshBasicMaterial color={farbe} toneMapped={false} transparent {...materialProps} />
    </mesh>
  )
}

export const glatt = (a: number, b: number, t: number): number => a + (b - a) * t
export const daempf = (ziel: number, ist: number, geschw: number, dt: number): number =>
  glatt(ist, ziel, 1 - Math.exp(-geschw * dt))
