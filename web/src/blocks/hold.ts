import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './hold.py?raw'

export type HoldBlock = Base & { kind: 'hold'; beats: number }

export const hold: BlockDef<HoldBlock> = {
  kind: 'hold',
  label: 'Hold (trigger → N beats)',
  info: 'Holds 1 for N beats after a trigger',
  tab: 'Time',
  python,
  create: (base, n) => ({ ...base, id: `hold${n}`, name: `hold${n}`, kind: 'hold', beats: 32 }),
  inputs: () => [typed('trigger', 'signal', 'start'), typed('beat', 'signal')],
  outputs: () => [typed('hold', 'signal')],
  subtitle: (b) => `${b.beats} beats`,
}
