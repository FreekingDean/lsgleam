import type { Edge, Connection } from '@xyflow/react'
import { RAIL_W, SCALE, flipY, railHeight, railSpots, unitSize } from '../td/spots'
import { membersOf, type Cable, INPUTS_ID, LAYOUT, NODE_H, ON_PORT, OUTPUTS_ID, RAIL_SEP, SELECTOR_ID, SOURCE_KINDS, FIXTURE_PORT, type Rail, type SceneBlock, profileOf, scenesOf, visibleBlocks, visibleWires, type Block, type Show, type Wire } from '../model/show'
import { roomsOf, unitsOf, type Unit } from '../model/units'
import { floorAt } from '../model/floors'
import { tubePatch, unitPatch, patchOf } from '../model/patch'
import { boardUniverses, fixturesOf } from '../blocks'
import { TYPE_COLORS } from '../model/catalog'
import { inputRail, outputRail, inputPorts, outputPorts, portOf } from '../model/ports'
import type { FlowNode, RailFlowNode, ZoneFlowNode } from './BlockNode'
import type { BoxFlowNode, UnitFlowNode } from './UnitNode'
import { portKey } from './connect'
import { liveKey } from './live'

export type AnyNode = FlowNode | UnitFlowNode | BoxFlowNode | RailFlowNode | ZoneFlowNode

export const DIRECTOR_ID = '__director'

function unitSub(show: Show, u: Unit) {
  const b = u.block
  if (b.kind === 'fixture') {
    const p = unitPatch(show, u.key)
    return `${profileOf(b).label} · ${p ? `U${p.universe} @${b.address}` : 'no DMX'}`
  }
  if (b.kind === 'artnet') return `${b.protocol} ${b.ip}`
  if (b.kind === 'audio') return b.device || 'default device'
  if (b.kind === 'dmxin') return `${b.channels} faders`
  if (b.kind === 'blt') return `OSC :${b.port}`
  if (b.kind === 'audioslice') return `OSC :${b.port}`
  if (b.kind === 'oscout') return `${b.address} → ${b.host}:${b.port}`
  if (b.kind === 'tube') {
    const p = tubePatch(show, b.id)
    return `${b.leds} ${b.protocol} · ${b.length.toFixed(2)} m · ${p ? `out ${p.output} @${p.offset + 1}` : 'no cable'}`
  }
  if (b.kind === 'tubeset') return `${show.designs?.find((d) => d.id === b.design)?.name ?? 'no design'} · ${membersOf(show, b.id).length === 1 ? '1 tube' : `${membersOf(show, b.id).length} tubes`}`
  if (b.kind === 'board') return `${b.ip} · U${b.startUniverse}–${b.startUniverse + boardUniverses(b).length - 1}`
  if (b.kind === 'box') return b.size.map((v) => `${Number((v / 0.3048).toFixed(1))}`).join(' × ') + ' ft'
  return b.kind
}

function railNodes(show: Show): RailFlowNode[] {
  const spots = railSpots(show)
  const node = (id: string, title: string, rails: Rail[], side: 'in' | 'out'): RailFlowNode => ({ id, type: 'rail', position: spots[id], style: { width: RAIL_W, height: railHeight(rails) }, deletable: false, selectable: false, data: { title, rails, side } })
  return [node(INPUTS_ID, 'Inputs', inputRail(show), 'in'), ...(show.blocks.some((b) => b.kind === 'oscout') || visibleWires(show, null).some((w) => isOutput(show, w.to) && !isScene(show, w.from)) ? [node(OUTPUTS_ID, 'Outputs', outputRail(show), 'out')] : [])]
}

function sceneRail(show: Show, tab: string): RailFlowNode {
  const rails = inputRail(show)
  const blocks = visibleBlocks(show, tab)
  const position = { x: Math.min(0, ...blocks.map((b) => b.x)) - RAIL_W - 160, y: Math.min(0, ...blocks.map((b) => flipY(b.y, b.h))) }
  return { id: INPUTS_ID, type: 'rail', position, style: { width: RAIL_W, height: railHeight(rails) }, deletable: false, selectable: false, draggable: false, data: { title: 'Inputs', rails, side: 'in' } }
}

const railTab = (show: Show, tab: string | null) => tab === null || isScene(show, tab)

const patchCount = (show: Show, scene: string) => new Set(show.wires.filter((w) => w.from === scene && w.port === FIXTURE_PORT && !w.scene).map((w) => w.to)).size

function roomNames(show: Show, b: SceneBlock) {
  const rooms = roomsOf(show)
  if (rooms.length < 2) return undefined
  const picked = rooms.filter((r) => b.rooms?.includes(r.id))
  return picked.length ? picked.map((r) => r.name).join(', ') : 'all rooms'
}

export const directorHeight = (show: Show, b: Block) => Math.max(NODE_H, 84 + inputPorts(b, show, null).length * 16)

const ZONE_PAD = 40

function zoneNode(show: Show): ZoneFlowNode[] {
  const scenes = scenesOf(show)
  if (!scenes.length) return []
  const left = Math.min(...scenes.map((b) => b.x)) - ZONE_PAD
  const top = Math.min(...scenes.map((b) => flipY(b.y, b.h))) - ZONE_PAD - 30
  const right = Math.max(...scenes.map((b) => b.x + b.w)) + ZONE_PAD
  const bottom = Math.max(...scenes.map((b) => flipY(b.y, b.h) + directorHeight(show, b))) + ZONE_PAD
  return [{ id: DIRECTOR_ID, type: 'zone', position: { x: left, y: top }, style: { width: right - left, height: bottom - top }, zIndex: -1, deletable: false, selectable: false, draggable: false, data: { title: 'Scenes', rooms: roomsOf(show).length > 1 } }]
}

export function alignScenes(show: Show): [string, number, number][] {
  const others = visibleBlocks(show, null).filter((b) => b.kind !== 'scene')
  const x = others.length ? Math.max(...others.map((b) => b.x + b.w)) + 240 : 0
  let top = Math.min(0, ...others.map((b) => flipY(b.y, b.h)))
  return scenesOf(show).map((b) => {
    const y = flipY(top, b.h)
    top += directorHeight(show, b) + 40
    return [b.id, x, y]
  })
}

export type FloorView = { id: string; all: boolean }

export function toNodes(show: Show, prev: AnyNode[], tab: string | null, floor?: FloorView): AnyNode[] {
  const selected = new Set(prev.filter((n) => n.selected).map((n) => n.id))
  const here = (u: Unit) => !floor || floorAt(show, u.placement.position[1]).id === floor.id
  if (tab === LAYOUT) return unitsOf(show).filter((u) => !(u.block.kind === 'tube' && u.block.set) && (floor?.all || here(u))).map((u) => {
    const [w, h] = unitSize(u)
    const box = u.block.kind === 'box'
    return {
      id: u.key,
      type: box ? 'box' : 'unit',
      position: { x: u.placement.position[0] * SCALE - w / 2, y: u.placement.position[2] * SCALE - h / 2 },
      style: { width: w, height: h },
      zIndex: box ? 0 : 2,
      ...(here(u) ? {} : { className: 'other-floor' }),
      draggable: !(u.block.kind === 'box' && u.block.locked),
      selected: selected.has(u.key),
      data: { unit: u, block: u.block, sub: unitSub(show, u) },
    } as AnyNode
  })
  const blocks = visibleBlocks(show, tab)
  const nodes: AnyNode[] = blocks.map((b) => {
    const director = tab === null && b.kind === 'scene'
    const inputs = inputPorts(b, show, tab)
    return {
      id: b.id,
      type: 'block',
      position: { x: b.x, y: flipY(b.y, b.h) },
      style: { width: b.w, height: director ? directorHeight(show, b) : b.h },
      selected: selected.has(b.id),
      data: { block: b, keys: liveKeys(show, b), inputs, outputs: director ? [] : outputPorts(b, show), patch: patchOf(show, b.id), targets: fixturesOf(show, b.id, true).map((id) => show.blocks.find((x) => x.id === id)?.name ?? id), ...(director ? { patched: patchCount(show, b.id), rooms: b.kind === 'scene' ? roomNames(show, b) : undefined } : {}) },
    }
  })
  if (tab === null) return [...zoneNode(show), ...railNodes(show), ...nodes]
  return isScene(show, tab) ? [sceneRail(show, tab), ...nodes] : nodes
}

function liveKeys(show: Show, b: Block) {
  const keys: Record<string, string | null> = {}
  for (const p of inputPorts(b, show)) keys[`in:${p.id}`] = liveKey(show, b, p.id, true)
  for (const p of outputPorts(b, show)) keys[`out:${p.id}`] = liveKey(show, b, p.id, false)
  return keys
}

const isSource = (show: Show, id: string) => SOURCE_KINDS.includes(show.blocks.find((b) => b.id === id)?.kind ?? 'scene')
const isOutput = (show: Show, id: string) => show.blocks.some((b) => b.id === id && (b.kind === 'fixture' || b.kind === 'tube' || b.kind === 'oscout'))
const isScene = (show: Show, id: string) => show.blocks.some((b) => b.id === id && b.kind === 'scene')

export function toEdges(show: Show, tab: string | null): Edge[] {
  if (tab === LAYOUT) return show.cables.map((c) => ({
    id: `cable:${c.from}#${c.fromPort}->${c.to}#${c.port}`,
    source: cableEnd(show, c.from, c.fromPort, 'o')[0],
    sourceHandle: cableEnd(show, c.from, c.fromPort, 'o')[1],
    target: cableEnd(show, c.to, c.port, 'i')[0],
    targetHandle: cableEnd(show, c.to, c.port, 'i')[1],
    data: { cable: c },
    zIndex: 1,
    style: { stroke: TYPE_COLORS[unitsOf(show).find((u) => u.key === c.from)?.outputs.find((p) => p.id === c.fromPort)?.type ?? ''] },
  }))
  return visibleWires(show, tab).filter((w) => tab !== null || !(isScene(show, w.from) && isOutput(show, w.to))).map((w) => {
    const rail = railTab(show, tab) && isSource(show, w.from)
    const out = tab === null && isOutput(show, w.to)
    return {
      id: `${w.scene ?? 'show'}:${w.from}#${w.fromPort}->${w.to}#${w.port}`,
      source: rail ? INPUTS_ID : w.from,
      sourceHandle: rail ? `${w.from}${RAIL_SEP}${w.fromPort}` : w.fromPort,
      target: out ? OUTPUTS_ID : w.to,
      targetHandle: out ? w.to : w.port,
      data: { scene: w.scene },
      style: { stroke: TYPE_COLORS[portOf(show, w)?.type ?? ''] },
    }
  })
}

function cableEnd(show: Show, id: string, port: string, dir: 'o' | 'i'): [string, string] {
  const b = show.blocks.find((x) => x.id === id)
  return b?.kind === 'tube' && b.set ? [b.set, `${dir}:${id}`] : [id, port]
}

const fromHandle = (id: string, handle: string): [string, string] => (handle.startsWith('o:') ? [handle.slice(2), 'out'] : handle.startsWith('i:') ? [handle.slice(2), 'in'] : [id, handle])

export const toCable = (c: { source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null }): Cable => {
  const [from, fromPort] = fromHandle(c.source, c.sourceHandle ?? '')
  const [to, port] = fromHandle(c.target, c.targetHandle ?? '')
  return { from, fromPort, to, port }
}

export function connectPairs(c: Connection, picked: Set<string>): Connection[] {
  const side = (type: 'source' | 'target', node: string, handle: string) => {
    const key = portKey({ type, node, id: handle })
    if (!picked.has(key)) return [[node, handle]]
    const keys = [...picked].map((k) => JSON.parse(k) as string[]).filter((k) => k[0] === type)
    const y = ([, n, h]: string[]) => document.querySelector(`.react-flow__handle[data-nodeid="${CSS.escape(n)}"][data-handleid="${CSS.escape(h)}"]`)?.getBoundingClientRect() ?? { top: 0, left: 0 }
    return keys.sort((a, b) => y(a).top - y(b).top || y(a).left - y(b).left).map(([, n, h]) => [n, h])
  }
  const sources = side('source', c.source, c.sourceHandle ?? '')
  const targets = side('target', c.target, c.targetHandle ?? '')
  const pairs = sources.length > 1 && targets.length > 1 ? sources.slice(0, targets.length).map((s, i) => [s, targets[i]]) : sources.flatMap((s) => targets.map((t) => [s, t]))
  return pairs.map(([[source, sourceHandle], [target, targetHandle]]) => ({ source, sourceHandle, target, targetHandle }))
}

type Ends = { source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null; data?: Record<string, unknown> }

export function toWire(e: Ends, tab?: string | null): Wire {
  const scene = tab === undefined ? (e.data?.scene as string | undefined) : tab ?? undefined
  const [from, fromPort] = e.source === INPUTS_ID ? (e.sourceHandle ?? '').split(RAIL_SEP) : [e.source, e.sourceHandle ?? 'out']
  const [to, port] = e.target === OUTPUTS_ID ? [e.targetHandle ?? '', FIXTURE_PORT] : [e.target, e.targetHandle ?? '']
  return { from, fromPort, to, port, ...(scene ? { scene } : {}) }
}

export const cabled = (show: Show) => show.blocks.filter((b) => b.kind === 'artnet' || b.kind === 'dmxin' || b.kind === 'board').map((b) => b.id)

export function wireTargets(show: Show, wires: Wire[]) {
  return [...new Set(wires.flatMap((w) => {
    const to = show.blocks.find((b) => b.id === w.to)
    if (to?.kind === 'composite') return [w.port]
    if (to?.kind !== 'scene') return [w.to]
    return [w.port === ON_PORT ? SELECTOR_ID : w.port]
  }))]
}
