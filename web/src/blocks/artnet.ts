import type { Base, Show } from '../model/show'
import type { BlockDef } from './types'
import python from './artnet.py?raw'

export type ArtnetBlock = Base & { kind: 'artnet'; protocol: 'artnet' | 'sacn'; ip: string; universes: number[]; inputs: number[]; active: boolean }

export function chainOf(show: Show, node: string, universe: number) {
  const keys: string[] = []
  for (let c = show.cables.find((x) => x.from === node && x.fromPort === `u${universe}`); c && !keys.includes(c.to); c = show.cables.find((x) => x.from === c!.to && x.fromPort === 'out')) keys.push(c.to)
  return keys
}

export const artnet: BlockDef<ArtnetBlock> = {
  kind: 'artnet',
  label: 'Art-Net / sACN node',
  info: 'Art-Net / sACN interface: the universes it sends and listens to',
  tab: 'Hardware',
  python,
  create: (base, n) => ({ ...base, id: `net${n}`, name: `net${n}`, kind: 'artnet', protocol: 'artnet', ip: '255.255.255.255', universes: [0], inputs: [], active: true }),
  inputs: () => [],
  outputs: () => [],
  subtitle: (b) => `${b.protocol} → ${b.ip} · U${b.universes.join(',')}`,
}
