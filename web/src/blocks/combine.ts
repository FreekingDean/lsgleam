import type { Base, Port, Show } from '../model/show'
import { outputPorts, sourcePort, typed } from '../model/ports'
import type { BlockDef } from './types'
import python from './combine.py?raw'

export type CombineBlock = Base & { kind: 'combine'; names: Record<string, string> }

export const ELEMENT_TYPES = ['signal', 'index', 'number', 'color', 'look', 'audio']
export const WIDE_TYPES = ['color', 'look', 'audio']
const MAX_SLOTS = 32
const slotNumber = (id: string) => Number(id.slice(1)) || 0

export function elementOf(show: Show | undefined, b: CombineBlock, seen = new Set<string>()) {
  const path = new Set(seen).add(b.id)
  return show?.wires.filter((w) => w.to === b.id).map((w) => sourcePort(show, w, path)?.type).find((t) => t && ELEMENT_TYPES.includes(t))
}

export function combineSlots(show: Show | undefined, b: CombineBlock, seen = new Set<string>()): Port[] {
  if (!show || seen.has(b.id)) return []
  const path = new Set(seen).add(b.id)
  const type = elementOf(show, b, seen) ?? 'any'
  const feeds = show.wires.filter((w) => w.to === b.id).sort((x, y) => slotNumber(x.port) - slotNumber(y.port))
  return feeds.filter((w, i) => feeds.findIndex((x) => x.port === w.port) === i).map((w) => {
    const from = show.blocks.find((x) => x.id === w.from)
    const outs = from ? outputPorts(from, show, path) : []
    return typed(w.port, type, b.names[w.port]?.trim() || (outs.length > 1 ? outs.find((p) => p.id === w.fromPort)?.label : from?.name) || w.port)
  })
}

export const combine: BlockDef<CombineBlock> = {
  kind: 'combine',
  label: 'Combine (values → multichannel)',
  info: 'Bundles values of one type into one multichannel wire: wire into the open slot to add one',
  tab: 'Math',
  python,
  slotted: true,
  create: (base, n) => ({ ...base, id: `comb${n}`, name: `combine${n}`, kind: 'combine', names: {} }),
  inputs: (b, show) => {
    const slots = combineSlots(show, b)
    const open = `s${Math.max(0, ...[...slots.map((p) => p.id), ...Object.keys(b.names)].map(slotNumber)) + 1}`
    return slots.length < MAX_SLOTS ? [...slots, typed(open, elementOf(show, b) ?? 'any', '+')] : slots
  },
  outputs: (b, show, seen) => {
    const slots = combineSlots(show, b, seen)
    return [typed('out', 'multi', slots.length ? `${slots.length} × ${slots[0].type}` : 'multichannel')]
  },
  subtitle: () => '→ multichannel',
  args: (b, show) => [WIDE_TYPES.includes(combineSlots(show, b)[0]?.type ?? '')],
  accepts: (source, target) => ELEMENT_TYPES.includes(source.type) && source.type === target.type,
}
