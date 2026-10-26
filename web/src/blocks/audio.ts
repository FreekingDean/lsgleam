import { type Base, type Port, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './audio.py?raw'

export type AudioBlock = Base & { kind: 'audio'; device: string; channels: number; stereo: boolean }

export function audioInputs(b: AudioBlock): Port[] {
  const step = b.stereo ? 2 : 1
  return Array.from({ length: Math.ceil(b.channels / step) }, (_, i) => {
    const first = i * step + 1
    return typed(`in${first}`, 'audio', b.stereo && first < b.channels ? `${first}-${first + 1}` : `in ${first}`)
  })
}

export const audio: BlockDef<AudioBlock> = {
  kind: 'audio',
  label: 'Audio input (interface)',
  info: 'Audio device input',
  tab: 'Hardware',
  python,
  create: (base, n) => ({ ...base, id: `audio${n}`, name: `audio${n}`, kind: 'audio', device: '', channels: 2, stereo: true }),
  inputs: () => [],
  outputs: (b, show) => audioInputs(b).map((p) => {
    const source = show?.cables.find((c) => c.to === b.id && c.port === p.id)
    const first = Number(p.id.slice(2))
    const name = source && show?.blocks.find((x) => x.id === source.from)?.name
    return { ...p, label: name ? `${name} (${p.label})` : p.label, chans: b.stereo && first < b.channels ? `chan${first} chan${first + 1}` : `chan${first}` }
  }),
  subtitle: (b) => b.device || 'default device',
}
