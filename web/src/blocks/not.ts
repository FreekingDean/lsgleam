import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import { flow, multiPort } from './multi'
import python from './not.py?raw'

export type NotBlock = Base & { kind: 'not' }

export const not: BlockDef<NotBlock> = {
  kind: 'not',
  label: 'Not (1 − signal)',
  info: '1 − signal: on becomes off and off becomes on',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `not${n}`, name: `not${n}`, kind: 'not' }),
  inputs: (b, show, ports) => [multiPort(show, b, 'signal', ports)],
  outputs: (b, show, seen, ports) => [typed('out', flow(show, b, seen, ports), 'not')],
  subtitle: () => '1 − x',
}
