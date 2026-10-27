import type { Base } from '../model/show'
import type { BlockDef } from './types'

export type AudioSourceBlock = Base & { kind: 'audiosource' }

export const audiosource: BlockDef<AudioSourceBlock> = {
  kind: 'audiosource',
  label: 'Audio source',
  info: 'Anything sending audio into an audio input: a mixer, player, mic or laptop',
  tab: 'Hardware',
  create: (base, n) => ({ ...base, id: `src${n}`, name: `Source ${n}`, kind: 'audiosource' }),
  inputs: () => [],
  outputs: () => [],
  subtitle: () => 'audio out',
}
