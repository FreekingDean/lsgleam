import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './priority.py?raw'

export type PriorityBlock = Base & { kind: 'priority'; names: string[] }

export const priority: BlockDef<PriorityBlock> = {
  kind: 'priority',
  label: 'Priority (highest on → index)',
  info: 'The index of the highest input that is up: later inputs win over earlier ones',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `prio${n}`, name: `prio${n}`, kind: 'priority', names: ['fall', 'winter', 'spring', 'summer'] }),
  inputs: (b) => b.names.map((name, i) => typed(`in${i + 1}`, 'signal', `${i} ${name}`)),
  outputs: () => [typed('out', 'index', 'index')],
  subtitle: (b) => b.names.join(' < '),
}
