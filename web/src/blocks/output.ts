import { type Base, type InputType, typed } from '../model/show'
import type { BlockDef } from './types'

export type OutputBlock = Base & { kind: 'output'; type: InputType }

export const output: BlockDef<OutputBlock> = {
  kind: 'output',
  label: 'Output',
  info: 'A value this composite sends out: one output port on its node',
  tab: 'Outputs',
  create: (base, n, item) => ({ ...base, id: `out${n}`, name: `${item.type ?? 'signal'} out ${n}`, kind: 'output', type: item.type ?? 'signal' }),
  inputs: (b) => [typed('value', b.type)],
  outputs: (b) => [typed('out', b.type, b.name)],
  subtitle: (b) => `${b.type} out`,
}
