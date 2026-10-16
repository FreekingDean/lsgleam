import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import { flow, multiPort } from './multi'
import python from './range.py?raw'

export type RangeBlock = Base & { kind: 'range'; tame: [number, number]; wild: [number, number] }

export const range: BlockDef<RangeBlock> = {
  kind: 'range',
  label: 'Range (signal × amount → window)',
  info: 'Remaps a signal into a min–max window that widens with amount',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `rng${n}`, name: `rng${n}`, kind: 'range', tame: [0.2, 0.5], wild: [0, 1] }),
  inputs: (b, show, ports) => [multiPort(show, b, 'signal', ports), typed('amount', 'signal'), typed('tameMin', 'signal', 'tame min'), typed('tameMax', 'signal', 'tame max'), typed('wildMin', 'signal', 'wild min'), typed('wildMax', 'signal', 'wild max')],
  outputs: (b, show, seen, ports) => [typed('out', flow(show, b, seen, ports), 'signal')],
  subtitle: (b) => `${b.tame.join('–')} → ${b.wild.join('–')}`,
}
