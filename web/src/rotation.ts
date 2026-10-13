import type { Placement } from './show'

export type Vec = [number, number, number]
export const wrap = (d: number) => { const r = ((d % 360) + 540) % 360 - 180; return r === -180 ? 180 : Number(r.toFixed(2)) }
export const turned = (p: Placement, axis: 0 | 1 | 2, by: number): Placement => { const rotation = [...p.rotation] as Vec; rotation[axis] = wrap(rotation[axis] + by); return { ...p, rotation } }
export const ROTATIONS: { label: string; title: string; axis: 0 | 1 | 2; by: number }[] = [
  { label: '↺ 90°', title: 'turn left 90°', axis: 1, by: 90 },
  { label: '↻ 90°', title: 'turn right 90°', axis: 1, by: -90 },
  { label: 'flip H', title: 'turn around 180°', axis: 1, by: 180 },
  { label: 'flip V', title: 'upside down (hung vs standing)', axis: 0, by: 180 },
]
