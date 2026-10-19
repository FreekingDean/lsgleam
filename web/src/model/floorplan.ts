import type { FloorPlan } from '../blocks/box'
import type { BoxBlock, Show } from './show'

export type XZ = [number, number]
export type Calib = { room: string; points: XZ[] }

const cm = (v: number) => Math.round(v * 100) / 100

export const roomCentre = (room: BoxBlock): XZ => [room.sim?.position[0] ?? 0, room.sim?.position[2] ?? 0]

export const newPlan = (src: string, aspect: number, width: number): FloorPlan => ({ src, x: 0, z: 0, width, height: width / aspect, rotation: 0, opacity: 0.5, locked: false })

export const movePlan = (p: FloorPlan, x: number, z: number): FloorPlan => ({ ...p, x: cm(x), z: cm(z) })

export const turnPlan = (p: FloorPlan, by: number): FloorPlan => ({ ...p, rotation: (p.rotation + by + 360) % 360 })

export function calibrate(p: FloorPlan, [a, b]: XZ[], metres: number): FloorPlan {
  const k = metres / Math.hypot(b[0] - a[0], b[1] - a[1])
  return { ...movePlan(p, a[0] + (p.x - a[0]) * k, a[1] + (p.z - a[1]) * k), width: p.width * k, height: p.height * k }
}

export function withPlan(show: Show, room: string, plan: FloorPlan | null): Show {
  return { ...show, blocks: show.blocks.map((b) => {
    if (b.id !== room || b.kind !== 'box') return b
    const { floorplan: _old, ...rest } = b
    return plan ? { ...rest, floorplan: plan } : rest
  }) }
}
