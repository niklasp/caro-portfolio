import { useEffect, useRef } from 'react'

// Die Wackelaugen von der letzten Seite des Portfolios. Folgen dem Cursor.
export default function GooglyEyes() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      for (const auge of el.querySelectorAll<HTMLElement>('.auge')) {
        const r = auge.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const winkel = Math.atan2(e.clientY - cy, e.clientX - cx)
        const dist = Math.min(Math.hypot(e.clientX - cx, e.clientY - cy) / 30, 1)
        const dx = Math.cos(winkel) * 4 * dist
        const dy = Math.sin(winkel) * 7 * dist
        const pupille = auge.querySelector<HTMLElement>('.pupille')
        if (pupille) pupille.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <span className="augen" ref={ref} aria-hidden="true">
      <span className="auge"><span className="pupille" /></span>
      <span className="auge"><span className="pupille" /></span>
    </span>
  )
}
