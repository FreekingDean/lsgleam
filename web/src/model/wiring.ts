import { type Block, type Wire, type Show, SOURCE_KINDS, POSITION_PORT, PATTERN_PORT, LOOK_PORT, COLOR_PORT, RGB_ATTRS, LOOK_ATTRS, profileOf } from './show'
import { pruneWires, inputPorts, outputPorts, blockHeight } from './ports'
import { ELEMENT_TYPES, blockDef } from '../blocks'

export function drivenPorts(show: Show, id: string, tab: string | null) {
  const block = show.blocks.find((b) => b.id === id)
  const wired = new Set(show.wires.filter((w) => w.to === id && (w.scene ?? null) === tab).map((w) => w.port))
  if (block) for (const [port, channels] of exclusions(block)) if (wired.has(port)) for (const ch of channels) wired.add(ch)
  return wired
}

function exclusions(b: Block): [string, string[]][] {
  if (b.kind !== 'light' && b.kind !== 'group') return []
  const colors = [...RGB_ATTRS, ...(profileOf(b).wheel ? [profileOf(b).wheel!.key] : [])]
  const common: [string, string[]][] = [[LOOK_PORT, [...LOOK_ATTRS, ...colors, COLOR_PORT]], [COLOR_PORT, colors], [POSITION_PORT, profileOf(b).position ?? []]]
  return b.kind === 'group' ? [...common, [PATTERN_PORT, ['intensity']]] : common
}

export function canWire(show: Show, from: string, fromPort: string, to: string, port: string, tab: string | null) {
  const a = show.blocks.find((b) => b.id === from)
  const b = show.blocks.find((b) => b.id === to)
  if (!a || !b) return false
  const rail = !a.scene && SOURCE_KINDS.includes(a.kind) && show.blocks.some((x) => x.id === tab && x.kind === 'scene')
  if (tab === null ? a.scene || b.scene : (a.scene !== tab && !rail) || b.scene !== tab) return false
  const source = outputPorts(a, show).find((p) => p.id === fromPort)
  const target = inputPorts(b, show, tab).find((p) => p.id === port)
  if (!source || !target || !(source.type === target.type || (target.multi && source.type === 'multi') || (target.type === 'any' && ELEMENT_TYPES.includes(source.type))) || source.profile !== target.profile) return false
  const here = show.wires.filter((w) => (w.scene ?? null) === tab)
  if (here.some((w) => w.from === from && w.fromPort === fromPort && w.to === to && w.port === port)) return false
  const output = target.type === 'fixture' || target.type === 'pixels'
  if (output && here.some((w) => w.to === to && w.from === from)) return false
  if ((target.type !== 'signal' || source.type === 'multi' || blockDef(b.kind)?.slotted) && !output && here.some((w) => w.to === to && w.port === port)) return false
  const driven = drivenPorts(show, to, tab)
  for (const [master, channels] of exclusions(b)) {
    if (port === master && channels.some((ch) => driven.has(ch))) return false
    if (channels.includes(port) && driven.has(master)) return false
  }
  const next = addWire(show, { from, fromPort, to, port, ...(tab ? { scene: tab } : {}) })
  return pruneWires(next) === next
}

const resized = (show: Show): Show => ({ ...show, blocks: show.blocks.map((b) => (blockDef(b.kind)?.slotted || b.kind === 'split') && b.h !== blockHeight(b, show) ? { ...b, h: blockHeight(b, show) } : b) })

export function addWire(show: Show, wire: Wire): Show {
  return resized({ ...show, wires: [...show.wires, wire] })
}

const sameWire = (a: Wire, b: Wire) => a.from === b.from && a.fromPort === b.fromPort && a.to === b.to && a.port === b.port && (a.scene ?? null) === (b.scene ?? null)

export function removeWires(show: Show, wires: Wire[]): Show {
  return resized(pruneWires({ ...show, wires: show.wires.filter((w) => !wires.some((r) => sameWire(r, w))) }))
}
