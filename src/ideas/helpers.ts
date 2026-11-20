// Gedämpfte Annäherung, unabhängig von der Bildrate.
export const daempf = (ziel: number, ist: number, geschw: number, dt: number): number =>
  ist + (ziel - ist) * (1 - Math.exp(-geschw * dt))
