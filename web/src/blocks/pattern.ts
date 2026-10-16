import { type Base, type PatternAdvance, type PatternMode, typed } from '../model/show'
import { patternMasks } from '../model/catalog'
import type { BlockDef } from './types'
import python from './pattern.py?raw'

export type PatternBlock = Base & { kind: 'pattern'; slots: number; mode: PatternMode; advance: PatternAdvance; every: number; floor: number }

export const pattern: BlockDef<PatternBlock> = {
  kind: 'pattern',
  label: 'Pattern (fan-out)',
  info: 'Spreads one signal over N slots by a pattern',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `pat${n}`, name: `pat${n}`, kind: 'pattern', slots: 4, mode: 'alternate', advance: 'step', every: 1, floor: 0 }),
  inputs: (b) => [typed('signal', 'signal'), b.advance === 'step' ? typed('step', 'index', 'step index') : typed('trigger', 'signal', 'next step'), typed('floor', 'signal', 'minimum')],
  outputs: (b) => Array.from({ length: b.slots }, (_, i) => typed(`slot${i + 1}`, 'signal', `slot ${i + 1}`)),
  subtitle: (b) => `${b.mode} · ${b.slots} slots`,
  args: (b) => [patternMasks(b.mode, b.slots)],
}
