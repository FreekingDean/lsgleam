import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import { flow, multiPort } from './multi'
import python from './and.py?raw'

export type AndBlock = Base & { kind: 'and' }

export const and: BlockDef<AndBlock> = {
  kind: 'and',
  label: 'And (both signals)',
  info: 'Both signals multiplied: 1 only when both are on',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `and${n}`, name: `and${n}`, kind: 'and' }),
  inputs: (b, show, ports) => [multiPort(show, b, 'a', ports), multiPort(show, b, 'b', ports)],
  outputs: (b, show, seen, ports) => [typed('out', flow(show, b, seen, ports), 'both')],
  subtitle: () => 'a × b',
}
