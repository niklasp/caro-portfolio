import { useMemo } from 'react'
import { useLoader, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

type MeshProps = ThreeElements['mesh']

interface FotoProps extends Omit<MeshProps, 'children'> {
  url: string
  breite: number
  ar: number
  materialProps?: ThreeElements['meshBasicMaterial']
}

// Foto-Plane mit korrektem Farbraum. Breite in Welt-Einheiten, Höhe aus dem Seitenverhältnis.
export function Foto({ url, breite, ar, materialProps = {}, ...props }: FotoProps) {
  const tex = useLoader(THREE.TextureLoader, url)
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
  }, [tex])
  return (
    <mesh {...props}>
      <planeGeometry args={[breite, breite / ar]} />
      <meshBasicMaterial map={tex} toneMapped={false} transparent {...materialProps} />
    </mesh>
  )
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
