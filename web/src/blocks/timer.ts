import { type Base, typed } from '../model/show'
import { formatDuration } from '../model/format'
import type { BlockDef } from './types'
import python from './timer.py?raw'

export type TimerBlock = Base & { kind: 'timer'; seconds: number; countTo: number; end: 'hold' | 'loop' }

export const timer: BlockDef<TimerBlock> = {
  kind: 'timer',
  label: 'Timer (0 → N over a time)',
  info: 'Counts from 0 to N over a set time: whole steps, the smooth value and progress 0–1',
  tab: 'Time',
  python,
  create: (base, n) => ({ ...base, id: `timer${n}`, name: `timer${n}`, kind: 'timer', seconds: 4 * 3600, countTo: 4, end: 'hold' }),
  inputs: () => [typed('reset', 'signal'), typed('run', 'signal')],
  outputs: () => [typed('count', 'index'), typed('value', 'number'), typed('progress', 'signal')],
  subtitle: (b) => `0→${b.countTo} over ${formatDuration(b.seconds)}${b.end === 'loop' ? ' · loop' : ''}`,
}
