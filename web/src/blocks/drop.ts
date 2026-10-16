import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './drop.py?raw'

export type DropBlock = Base & { kind: 'drop'; threshold: number; beats: number; cooldown: number }

export const drop: BlockDef<DropBlock> = {
  kind: 'drop',
  label: 'Drop (kick + beat → drop)',
  info: 'Fires when the kick returns after a quiet stretch',
  tab: 'Time',
  python,
  create: (base, n) => ({ ...base, id: `drop${n}`, name: `drop${n}`, kind: 'drop', threshold: 0.2, beats: 12, cooldown: 8 }),
  inputs: () => [typed('signal', 'signal', 'kick'), typed('beat', 'signal')],
  outputs: () => [typed('drop', 'signal'), typed('armed', 'signal'), typed('drops', 'index', 'drops (count)')],
  subtitle: (b) => `${b.beats} quiet beats`,
}
