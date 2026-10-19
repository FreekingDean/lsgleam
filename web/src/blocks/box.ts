import type { Base } from '../model/show'
import type { BlockDef } from './types'

export type BoxBlock = Base & { kind: 'box'; size: [number, number, number]; locked: boolean }

export const box: BlockDef<BoxBlock> = {
  kind: 'box',
  label: 'Box (room, stage, bar)',
  info: 'A room, stage or other space with width, depth and height',
  tab: 'Hardware',
  create: (base, n) => ({ ...base, id: `box${n}`, name: `Room ${n}`, kind: 'box', size: [30.48, 9.144, 4], locked: false }),
  inputs: () => [],
  outputs: () => [],
  subtitle: (b) => b.size.map((v) => v.toFixed(1)).join(' × ') + ' m',
}
