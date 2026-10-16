import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './level.py?raw'

export type LevelBlock = Base & { kind: 'level'; gain: number; attack: number; release: number }

export const level: BlockDef<LevelBlock> = {
  kind: 'level',
  label: 'Level (RMS)',
  info: 'Audio loudness (RMS) as a 0–1 signal',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `level${n}`, name: `level${n}`, kind: 'level', gain: 4, attack: 0.05, release: 0.3 }),
  inputs: () => [typed('audio', 'audio')],
  outputs: () => [typed('out', 'signal', 'level')],
  subtitle: (b) => `RMS ×${b.gain}`,
}
