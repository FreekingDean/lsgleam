import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './equals.py?raw'

export type EqualsBlock = Base & { kind: 'equals'; value: number }

export const equals: BlockDef<EqualsBlock> = {
  kind: 'equals',
  label: 'Equals (index == N)',
  info: '1 when the index equals a value',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `eq${n}`, name: `eq${n}`, kind: 'equals', value: 0 }),
  inputs: () => [typed('index', 'index')],
  outputs: () => [typed('out', 'signal', 'equal')],
  subtitle: (b) => `== ${b.value}`,
}
