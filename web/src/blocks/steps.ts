import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './steps.py?raw'

export type StepsBlock = Base & { kind: 'steps'; steps: number }

export const steps: BlockDef<StepsBlock> = {
  kind: 'steps',
  label: 'Steps (signal → index)',
  info: 'Quantise a signal into N index steps',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `steps${n}`, name: `steps${n}`, kind: 'steps', steps: 4 }),
  inputs: () => [typed('signal', 'signal')],
  outputs: () => [typed('out', 'index', 'index')],
  subtitle: (b) => `${b.steps} steps`,
}
