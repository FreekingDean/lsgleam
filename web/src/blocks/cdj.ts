import type { Base } from '../model/show'
import type { BlockDef } from './types'

export type CdjBlock = Base & { kind: 'cdj'; player: number }

export const cdj: BlockDef<CdjBlock> = {
  kind: 'cdj',
  label: 'Audio source (CDJ)',
  info: 'A player sending audio into an audio input',
  tab: 'Hardware',
  create: (base, n) => ({ ...base, id: `cdj${n}`, name: `CDJ ${n}`, kind: 'cdj', player: 1 }),
  inputs: () => [],
  outputs: () => [],
  subtitle: (b) => `player ${b.player}`,
}
