import { type Base, type Show, typed } from '../model/show'
import type { BlockDef, Ports } from './types'
import { WIDE_TYPES, combineSlots } from './combine'
import python from './split.py?raw'

export type SplitBlock = Base & { kind: 'split' }

export const splitSource = (show: Show, b: SplitBlock, ports: Ports, seen = new Set<string>()) => {
  const feed = show.wires.find((w) => w.to === b.id)
  return feed && ports.combineOf(show, feed.from, feed.fromPort, new Set(seen).add(b.id))
}

export const split: BlockDef<SplitBlock> = {
  kind: 'split',
  label: 'Split (multichannel → values)',
  info: 'Unbundles a multichannel wire back into the values its Combine bundled',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `split${n}`, name: `split${n}`, kind: 'split' }),
  inputs: () => [typed('in', 'multi', 'multichannel')],
  outputs: (b, show, seen, ports) => {
    const from = show && !seen.has(b.id) ? splitSource(show, b, ports, seen) : undefined
    return !from ? [] : combineSlots(show, from, ports, new Set(seen).add(b.id)).map((p) => (WIDE_TYPES.includes(p.type) ? { ...p, chans: `${p.id}_*`, strip: `${p.id}_` } : { ...p, chans: p.id }))
  },
  subtitle: (_, outputs) => (outputs.length ? `multichannel → ${outputs.length}` : 'no Combine upstream'),
}
