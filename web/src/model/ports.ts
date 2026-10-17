import { allProfiles } from './fixtures'
import { NODE_H, type CombineBlock, type Block, type Kind, type Wire, type Show, FIXTURE_PORT, SOURCE_KINDS, isLight, type Port, POSITION_PORT, PATTERN_PORT, LOOK_PORT, COLOR_PORT, RGB, LOOK_CHANNELS, profileOf, type Rail, RAIL_SEP, membersOf, typed } from './show'
import { type Ports, blockDef, defOf, elementOf, hasDef } from '../blocks'

const MULTI_INPUTS: Partial<Record<Kind, string[]>> = { gate: ['signal'], not: ['signal'], fade: ['signal'], range: ['signal'], mix: ['a', 'b'], and: ['a', 'b'] }

export function multiFeeds(show: Show | undefined, b: Block, seen = new Set<string>()): Wire[] {
  if (!show || seen.has(b.id) || (b.kind === 'mix' && b.type === 'color')) return []
  const path = new Set(seen).add(b.id)
  return (MULTI_INPUTS[b.kind] ?? []).flatMap((port) => {
    const here = show.wires.filter((w) => w.to === b.id && w.port === port)
    const from = here.length === 1 ? show.blocks.find((x) => x.id === here[0].from) : undefined
    return from && outputPorts(from, show, path).find((p) => p.id === here[0].fromPort)?.type === 'multi' ? here : []
  })
}

function sourcePort(show: Show, w: Wire, seen?: Set<string>) {
  const from = show.blocks.find((b) => b.id === w.from)
  return from && outputPorts(from, show, seen).find((p) => p.id === w.fromPort)
}

export function combineOf(show: Show, from: string, fromPort = 'out', seen = new Set<string>()): CombineBlock | undefined {
  const b = show.blocks.find((x) => x.id === from)
  if (!b || seen.has(b.id)) return undefined
  const path = new Set(seen).add(b.id)
  if (b.kind === 'combine') return b
  const feed = b.kind === 'composite' ? show.wires.find((w) => w.to === fromPort) : b.kind === 'input' ? show.wires.find((w) => w.to === b.scene && w.port === b.id) : b.kind === 'output' ? show.wires.find((w) => w.to === b.id) : multiFeeds(show, b, seen)[0]
  return feed && combineOf(show, feed.from, feed.fromPort, path)
}

function perChannel(show: Show, w: Wire) {
  const from = combineOf(show, w.from, w.fromPort)
  return (from ? elementOf(show, from, PORTS) ?? 'signal' : 'signal') === 'signal'
}

function wireOk(show: Show, w: Wire) {
  const b = show.blocks.find((b) => b.id === w.to)
  const source = sourcePort(show, w)
  const target = b && allInputPorts(b, show).find((p) => p.id === w.port)
  if (!source) return show.blocks.find((x) => x.id === w.from)?.kind !== 'split'
  if (!target) return true
  const accepts = blockDef(b.kind)?.accepts
  if (accepts) return accepts(source, target)
  if (source.type !== 'multi' && target.type !== 'multi') return true
  if (target.multi && source.type === 'multi' && !perChannel(show, w)) return false
  return source.type === target.type || (!!target.multi && show.wires.filter((x) => x.to === w.to && x.port === w.port && (x.scene ?? null) === (w.scene ?? null)).length === 1)
}

export function pruneWires(show: Show): Show {
  const wires = show.wires.filter((w) => wireOk(show, w))
  return wires.length === show.wires.length ? show : pruneWires({ ...show, wires })
}

export function inputPorts(b: Block, show?: Show, tab?: string | null): Port[] {
  const hidden = new Set(b.hidden ?? [])
  if (show && tab !== undefined) {
    const wired = new Set(show.wires.filter((w) => w.to === b.id && (w.scene ?? null) === tab).map((w) => w.port))
    for (const [a, z] of alternatives(b)) {
      if (a.some((p) => wired.has(p))) z.forEach((p) => hidden.add(p))
      if (z.some((p) => wired.has(p))) a.forEach((p) => hidden.add(p))
    }
  }
  return allInputPorts(b, show).filter((p) => !hidden.has(p.id))
}

function alternatives(b: Block): [string[], string[]][] {
  if (!isLight(b)) return []
  const pos = profileOf(b).position ?? []
  const brightness = b.kind === 'group' ? [...LOOK_CHANNELS, PATTERN_PORT] : LOOK_CHANNELS
  return [[[LOOK_PORT], brightness], [[LOOK_PORT], [COLOR_PORT]], [[COLOR_PORT], RGB], ...(pos.length ? [[[POSITION_PORT], pos] as [string[], string[]]] : [])]
}

function allInputPorts(b: Block, show?: Show): Port[] {
  if (hasDef(b)) return defOf(b).inputs(b, show, PORTS)
  return b.kind === 'tube' ? [typed(FIXTURE_PORT, 'pixels', b.name)] : []
}

export function outputPorts(b: Block, show?: Show, seen = new Set<string>()): Port[] {
  if (hasDef(b)) return defOf(b).outputs(b, show, seen, PORTS)
  return []
}

export const PORTS: Ports = { outputPorts, sourcePort, multiFeeds, combineOf }

export function hasInput(b: Block, port: string, show: Show) {
  return inputPorts(b, show).some((p) => p.id === port)
}

export function portOf(show: Show, w: Wire) {
  const b = show.blocks.find((x) => x.id === w.to)
  return b ? inputPorts(b, show).find((p) => p.id === w.port) : undefined
}

const byLabel = (ports: Port[]) => [...ports].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))

export const inputRail = (show: Show): Rail[] => show.blocks.filter((b) => SOURCE_KINDS.includes(b.kind)).map((b) => ({ title: b.name, ports: byLabel(outputPorts(b, show).map((p) => ({ ...p, id: `${b.id}${RAIL_SEP}${p.id}` }))) }))

export const outputRail = (show: Show): Rail[] => [
  ...allProfiles().map((f) => ({ title: f.label, ports: byLabel(show.blocks.filter((b) => b.kind === 'fixture' && b.profile === f.id).flatMap((b) => inputPorts(b, show).map((p) => ({ ...p, id: b.id })))) })),
  { title: 'LED tubes', ports: byLabel(show.blocks.filter((b) => b.kind === 'tube' && !b.set).flatMap((b) => inputPorts(b, show).map((p) => ({ ...p, id: b.id })))) },
  ...show.blocks.filter((b) => b.kind === 'tubeset').map((s) => ({ title: s.name, ports: byLabel(membersOf(show, s.id).map((t) => ({ ...typed(FIXTURE_PORT, 'pixels', t.name.slice(s.name.length + 1)), id: t.id }))) })),
].filter((r) => r.ports.length)

export function blockHeight(b: Block, show?: Show) {
  const ports = Math.max(inputPorts(b, show).length, outputPorts(b, show).length)
  return Math.max(NODE_H, 60 + ports * 16)
}
