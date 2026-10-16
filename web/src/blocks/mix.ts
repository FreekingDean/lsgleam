import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import { flow, multiPort } from './multi'
import python from './mix.py?raw'

export type MixBlock = Base & { kind: 'mix'; type: 'signal' | 'color' }

export const mix: BlockDef<MixBlock> = {
  kind: 'mix',
  label: 'Mix (crossfade a → b)',
  info: 'Crossfades two signals or colours: a × (1 − mix) + b × mix',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `mix${n}`, name: `mix${n}`, kind: 'mix', type: 'signal' }),
  inputs: (b, show, ports) => [...(b.type === 'color' ? [typed('a', 'color'), typed('b', 'color')] : [multiPort(show, b, 'a', ports), multiPort(show, b, 'b', ports)]), typed('mix', 'signal', 'mix (0 = a, 1 = b)')],
  outputs: (b, show, seen, ports) => [typed('out', b.type === 'color' ? 'color' : flow(show, b, seen, ports), 'mixed')],
  subtitle: (b) => `${b.type}: a → b`,
}
