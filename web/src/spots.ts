import { INPUTS_ID, OUTPUTS_ID, inputRail, outputRail, visibleBlocks, type Rail, type Show, type Unit } from './show'

export const SCALE = 100
export const RAIL_W = 240

export const flipY = (y: number, h: number) => -y - h
export const railHeight = (rails: Rail[]) => 50 + rails.reduce((h, r) => h + 22 + r.ports.length * 18, 0)

export const unitSize = (u: Unit): [number, number] => {
  if (u.block.kind === 'box') return [u.block.size[0] * SCALE, u.block.size[1] * SCALE]
  const side = Math.max(100, 54 + Math.max(u.inputs.length, u.outputs.length) * 16)
  return [side, side]
}

export function railSpots(show: Show): Record<string, { x: number; y: number }> {
  const blocks = visibleBlocks(show, null)
  const top = Math.min(0, ...blocks.map((b) => flipY(b.y, b.h)))
  return {
    [INPUTS_ID]: { x: Math.min(0, ...blocks.map((b) => b.x)) - RAIL_W - 160, y: top },
    [OUTPUTS_ID]: { x: Math.max(400, ...blocks.map((b) => b.x + b.w)) + 160, y: top },
    ...show.rails,
  }
}

export type Spot = { x: number; y: number; w: number; h: number }

export function railSpot(show: Show, id: string): Spot {
  const p = railSpots(show)[id]
  const h = railHeight(id === INPUTS_ID ? inputRail(show) : outputRail(show))
  return { x: p.x, y: flipY(p.y, h), w: RAIL_W, h }
}

export function unitSpot(u: Unit): Spot {
  const [w, h] = unitSize(u)
  return { x: Math.round(u.placement.position[0] * SCALE - w / 2), y: Math.round(flipY(u.placement.position[2] * SCALE - h / 2, h)), w, h }
}
