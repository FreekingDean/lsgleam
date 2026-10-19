import type { FloorPlan } from './show'

export type XZ = [number, number]
export type Calib = { floor: string; points: XZ[] }

const cm = (v: number) => Math.round(v * 100) / 100

export const newPlan = (src: string, aspect: number, [x, z]: XZ, width = 20): FloorPlan => ({ src, x: cm(x), z: cm(z), width, height: width / aspect, rotation: 0, opacity: 0.5, locked: false })

export const movePlan = (p: FloorPlan, x: number, z: number): FloorPlan => ({ ...p, x: cm(x), z: cm(z) })

export const turnPlan = (p: FloorPlan, by: number): FloorPlan => ({ ...p, rotation: (p.rotation + by + 360) % 360 })

export function calibrate(p: FloorPlan, [a, b]: XZ[], metres: number): FloorPlan {
  const k = metres / Math.hypot(b[0] - a[0], b[1] - a[1])
  return { ...movePlan(p, a[0] + (p.x - a[0]) * k, a[1] + (p.z - a[1]) * k), width: p.width * k, height: p.height * k }
}
