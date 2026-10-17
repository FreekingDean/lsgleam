import { type Base, type Block, type InputType, type Show, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './input.py?raw'

export type InputBlock = Base & { kind: 'input'; type: InputType }

export const innerInputs = (b: Block, show?: Show) => (show?.blocks ?? []).filter((x): x is InputBlock => x.kind === 'input' && x.scene === b.id).map((x) => typed(x.id, x.type, x.name))

export const input: BlockDef<InputBlock> = {
  kind: 'input',
  label: 'Input',
  info: 'A value this scene or composite takes from outside: one input port on its node',
  tab: 'Inputs',
  python,
  create: (base, n, item) => ({ ...base, id: `in${n}`, name: `${item.type ?? 'signal'} ${n}`, kind: 'input', type: item.type ?? 'signal' }),
  inputs: () => [],
  outputs: (b) => [typed('out', b.type, b.name)],
  subtitle: (b) => b.type,
}
