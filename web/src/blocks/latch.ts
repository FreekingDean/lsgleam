import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './latch.py?raw'

export type LatchBlock = Base & { kind: 'latch' }

export const latch: BlockDef<LatchBlock> = {
  kind: 'latch',
  label: 'Latch (set / reset)',
  info: '1 from set until reset',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `latch${n}`, name: `latch${n}`, kind: 'latch' }),
  inputs: () => [typed('set', 'signal'), typed('reset', 'signal')],
  outputs: () => [typed('out', 'signal', 'latched')],
  subtitle: () => 'set / reset',
}
