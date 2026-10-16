import { type Base, typed } from '../model/show'
import { sequenceValues } from '../model/catalog'
import type { BlockDef } from './types'
import python from './sequence.py?raw'

export type SequenceBlock = Base & { kind: 'sequence'; values: number[]; unit: number; center: number; every: number }

export const sequence: BlockDef<SequenceBlock> = {
  kind: 'sequence',
  label: 'Sequence (trigger → values)',
  info: 'Steps through a list of values on each trigger',
  tab: 'Time',
  python,
  create: (base, n) => ({ ...base, id: `seq${n}`, name: `seq${n}`, kind: 'sequence', values: [1, -1, 2, -1, 1, -2], unit: 0.05, center: 0.5, every: 1 }),
  inputs: () => [typed('trigger', 'signal', 'next value'), typed('reset', 'signal')],
  outputs: () => [typed('out', 'signal', 'value')],
  subtitle: (b) => b.values.join(' '),
  args: (b) => [sequenceValues(b)],
}
