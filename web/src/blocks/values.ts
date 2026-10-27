import { type Base, type ValueRow, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './values.py?raw'

export type ValuesBlock = Base & { kind: 'values'; steps: number; rows: ValueRow[] }

export const valueTable = (b: ValuesBlock): [string, number][][] => Array.from({ length: b.steps }, (_, k) => b.rows.map((r, i): [string, number] => [`v${i}`, r.values[k] ?? 0]))

export const values: BlockDef<ValuesBlock> = {
  kind: 'values',
  label: 'Values (index → named numbers)',
  info: 'A table of named numbers, one column per index (e.g. per-section minimums)',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `val${n}`, name: `values${n}`, kind: 'values', steps: 4, rows: [{ name: 'min', values: [0.2, 0.15, 0.1, 0] }, { name: 'max', values: [0.6, 0.75, 0.9, 1] }] }),
  inputs: () => [typed('index', 'index')],
  outputs: (b) => b.rows.map((r, i) => ({ ...typed(`v${i}`, 'signal', r.name), chans: `v${i}` })),
  subtitle: (b) => `${b.rows.length} values × ${b.steps}`,
  args: (b) => [valueTable(b)],
}
