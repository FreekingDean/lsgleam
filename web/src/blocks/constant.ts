import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './constant.py?raw'

export type ConstantBlock = Base & { kind: 'constant'; type: 'signal' | 'index'; value: number; pulse: number }

export const constant: BlockDef<ConstantBlock> = {
  kind: 'constant',
  label: 'Constant (test value / pulse)',
  info: 'A fixed value for testing, optionally pulsing on and off',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `const${n}`, name: `const${n}`, kind: 'constant', type: 'signal', value: 1, pulse: 0 }),
  inputs: () => [],
  outputs: (b) => [typed('out', b.type, b.pulse > 0 ? `pulse ${b.pulse} Hz` : `${b.value}`)],
  subtitle: (b) => (b.pulse > 0 ? `pulse ${b.pulse} Hz × ${b.value}` : `${b.type} ${b.value}`),
}
