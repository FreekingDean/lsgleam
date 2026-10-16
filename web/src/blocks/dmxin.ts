import { type Base, type Patch, type Show, typed } from '../model/show'
import type { BlockDef } from './types'
import type { ArtnetBlock } from './artnet'
import python from './dmxin.py?raw'

export type DmxInBlock = Base & { kind: 'dmxin'; channels: number }

export function controllerPatch(show: Show, id: string): Patch | null {
  const c = show.cables.find((x) => x.from === id && x.fromPort === 'out' && x.port.startsWith('i'))
  return c ? { node: c.to, universe: Number(c.port.slice(1)) } : null
}

export const dmxin: BlockDef<DmxInBlock> = {
  kind: 'dmxin',
  label: 'DMX controller (faders in)',
  info: 'DMX controller: cable it into an Art-Net input universe; one signal per fader',
  tab: 'Hardware',
  python,
  create: (base, n) => ({ ...base, id: `dmxin${n}`, name: `DMX controller ${n}`, kind: 'dmxin', channels: 8 }),
  inputs: () => [],
  outputs: (b) => Array.from({ length: b.channels }, (_, i) => typed(`ch${i + 1}`, 'signal')),
  subtitle: (b) => `${b.channels} faders`,
  args: (b, show) => {
    const patch = controllerPatch(show, b.id)
    const node = show.blocks.find((x): x is ArtnetBlock => x.kind === 'artnet' && x.id === patch?.node)
    return [node?.protocol ?? 'artnet', node ? patch!.universe : null]
  },
}
