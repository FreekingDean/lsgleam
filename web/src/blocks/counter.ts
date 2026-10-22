import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './counter.py?raw'

export type CounterEnd = 'clamp' | 'wrap' | 'bounce'
export type CounterBlock = Base & { kind: 'counter'; max: number; end?: CounterEnd }

export const counter: BlockDef<CounterBlock> = {
  kind: 'counter',
  label: 'Counter (triggers → index)',
  info: 'Counts triggers into an index that stays at max, wraps to 0 or bounces back',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `count${n}`, name: `count${n}`, kind: 'counter', max: 3 }),
  inputs: () => [typed('trigger', 'signal', 'count'), typed('reset', 'signal')],
  outputs: () => [typed('out', 'index', 'count')],
  subtitle: (b) => `0${{ clamp: '…', wrap: ' ↻ ', bounce: ' ↔ ' }[b.end ?? 'clamp']}${b.max}`,
}
