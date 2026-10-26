import { type Base, type ColorRow, RGB, typed } from '../model/show'
import { hexToRgb } from '../model/format'
import type { BlockDef } from './types'
import python from './colors.py?raw'

export type ColorsBlock = Base & { kind: 'colors'; steps: number; rows: ColorRow[] }

export const colorTable = (b: ColorsBlock): [string, number][][] => Array.from({ length: b.steps }, (_, k) => b.rows.flatMap((r, i) => hexToRgb(r.colors[k] ?? '#000000').map((v, ch): [string, number] => [`c${i}_${['Red', 'Green', 'Blue'][ch]}`, v])))

export const colors: BlockDef<ColorsBlock> = {
  kind: 'colors',
  label: 'Colours (index → named colours)',
  info: 'A table of named colours, one column per index (e.g. per song or section)',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `col${n}`, name: `colours${n}`, kind: 'colors', steps: 4, rows: [{ name: 'main', colors: ['#ff4d00', '#2050ff', '#a040ff', '#ffd000'] }] }),
  inputs: () => [typed('index', 'index')],
  outputs: (b) => b.rows.map((r, i) => ({ ...typed(`c${i}`, 'color', r.name), chans: RGB.map((ch) => `c${i}_${ch}`).join(' '), strip: `c${i}_` })),
  subtitle: (b) => `${b.rows.length} colours × ${b.steps}`,
  args: (b) => [colorTable(b)],
}
