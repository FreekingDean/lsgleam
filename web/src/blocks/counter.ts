import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './counter.py?raw'

export type CounterEnd = 'clamp' | 'wrap' | 'bounce' | 'steps'
export type CounterBlock = Base & { kind: 'counter'; max: number; end?: CounterEnd; every?: number; forward?: number; back?: number }

export function stepCycle(max: number, forward: number, back: number) {
  const up = Math.max(1, forward)
  const down = Math.min(Math.max(0, back), up - 1)
  const out = [0]
  let v = 0
  const walk = (dir: number, n: number, stop: number) => {
    for (let i = 0; i < n && v !== stop; i++) out.push((v += dir))
  }
  while (v < max) {
    walk(1, up, max)
    if (v < max) walk(-1, down, -1)
  }
  while (v > 0) {
    walk(-1, up, 0)
    if (v > 0) walk(1, down, max + 1)
  }
  if (out.length > 1) out.pop()
  return out
}

export const counter: BlockDef<CounterBlock> = {
  kind: 'counter',
  label: 'Counter (triggers → index)',
  info: 'Counts triggers into an index that stays at max, wraps to 0, bounces back or steps forward and back',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `count${n}`, name: `count${n}`, kind: 'counter', max: 3 }),
  inputs: () => [typed('trigger', 'signal', 'count'), typed('reset', 'signal')],
  outputs: () => [typed('out', 'index', 'count')],
  subtitle: (b) => `0${{ clamp: '…', wrap: ' ↻ ', bounce: ' ↔ ', steps: ' ⤳ ' }[b.end ?? 'clamp']}${b.max}${(b.every ?? 1) > 1 ? ` · every ${b.every}` : ''}`,
  args: (b) => (b.end === 'steps' ? [stepCycle(b.max, b.forward ?? 3, b.back ?? 1)] : []),
}
