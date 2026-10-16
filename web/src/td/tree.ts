import { railSpot, unitSpot, type Spot } from './spots'
import { INPUTS_ID, NODE_H, NODE_W, OUTPUTS_ID, RAIL_SEP, SOURCE_KINDS, type Kind, membersOf, ownersOf, type Block, type Show, type TubeBlock } from '../model/show'
import { inputPorts, inputRail, outputPorts, outputRail } from '../model/ports'
import { unitsOf } from '../model/units'
import { j } from './prelude'

type Dir = { name: string; label: string; tint: number[]; order: string[]; rail?: [string, string, string | null][] } & Spot
export const TINTS = { dir: [0.3, 0.3, 0.34], hardware: [0.36, 0.56, 0.84], source: [0.88, 0.42, 0.42], fixture: [0.31, 0.7, 0.75], scene: [0.69, 0.49, 0.86], composite: [0.45, 0.62, 0.55], output: [0.95, 0.71, 0.27], input: [0.42, 0.72, 0.42], logic: [0.55, 0.55, 0.6] }
const HARDWARE: Kind[] = ['artnet', 'dmxin', 'board']
const ROW = 200

function tintOf(b: Block) {
  if (HARDWARE.includes(b.kind)) return TINTS.hardware
  if (SOURCE_KINDS.includes(b.kind)) return TINTS.source
  if (b.kind === 'fixture' || b.kind === 'tube') return TINTS.fixture
  if (b.kind === 'light' || b.kind === 'group' || b.kind === 'strip') return TINTS.output
  if (b.kind === 'input') return TINTS.input
  return TINTS.logic
}

const sources = (show: Show) => show.blocks.filter((b) => SOURCE_KINDS.includes(b.kind))
const inLayout = (b: Block) => HARDWARE.includes(b.kind) || SOURCE_KINDS.includes(b.kind)
const isOutput = (b: Block) => b.kind === 'fixture' || b.kind === 'tube'

function outputOrder(show: Show) {
  const seen = new Set<string>()
  return outputRail(show).flatMap((r) => r.ports.map((p) => p.id)).flatMap((id) => {
    const set = show.blocks.find((b): b is TubeBlock => b.id === id && b.kind === 'tube')?.set
    if (!set || seen.has(set)) return [id]
    seen.add(set)
    return [set, id]
  })
}

function railPorts(show: Show): [string, string, string | null][] {
  return inputRail(show).flatMap((r) => r.ports.map((p): [string, string, string | null] => {
    const [id, port] = p.id.split(RAIL_SEP)
    const outs = outputPorts(show.blocks.find((b) => b.id === id)!, show)
    return [id, port, p.chans ?? (outs.length > 1 ? port : null)]
  }))
}

export const showDir = (show: Show): Dir => ({ name: 'show', x: 300, y: 0, w: NODE_W, h: NODE_H, label: 'Show: the show tab', tint: TINTS.dir, order: sources(show).map((b) => b.id) })
const layoutDir = (show: Show): Dir => ({ name: 'layout', x: -300, y: 0, w: NODE_W, h: NODE_H, label: 'Layout: Art-Net nodes, pixel boards and sources', tint: TINTS.dir, order: sources(show).map((b) => b.id) })
export const inputsDir = (show: Show): Dir => ({ name: 'inputs', ...railSpot(show, INPUTS_ID), label: 'Inputs: layout sources used on the show tab', tint: TINTS.source, order: [...sources(show).map((b) => b.id), ...railPorts(show).map(([id, port]) => `${id}_${port}`)], rail: railPorts(show) })
export const outputsDir = (show: Show): Dir => ({ name: 'outputs', ...railSpot(show, OUTPUTS_ID), label: 'Outputs: fixtures and LED tubes', tint: TINTS.fixture, order: outputOrder(show) })

export function spotOf(show: Show, b: Block): Spot {
  const size = { w: b.w, h: b.h }
  if (inLayout(b)) {
    const u = unitsOf(show).find((u) => u.key === b.id)
    return u ? unitSpot(u) : { x: b.x, y: b.y, ...size }
  }
  if (b.kind === 'tube' && b.set) return { x: 0, y: -membersOf(show, b.set).findIndex((t) => t.id === b.id) * ROW, ...size }
  if (isOutput(b) || b.kind === 'tubeset') return { x: 0, y: -outputOrder(show).filter((id) => show.blocks.find((x) => x.id === id && !(x.kind === 'tube' && x.set))).indexOf(b.id) * ROW, ...size }
  return { x: b.x, y: b.y, ...size }
}

function ownerDir(show: Show, o: Block): Dir {
  const tint = o.kind === 'scene' ? TINTS.scene : o.kind === 'composite' ? TINTS.composite : TINTS.fixture
  const order = o.kind === 'tubeset' ? membersOf(show, o.id).map((t) => t.id) : [...inputPorts(o, show).map((p) => p.id), ...outputPorts(o, show).map((p) => p.id.split(':')[0])]
  return { name: o.id, ...spotOf(show, o), label: o.name, tint, order: [...new Set(order)] }
}

function dirsOf(show: Show, b: Block): Dir[] {
  if (inLayout(b)) return [layoutDir(show)]
  return [showDir(show), ...(isOutput(b) ? [outputsDir(show)] : []), ...ownersOf(show, b).map((o) => ownerDir(show, o))]
}

export function placed(show: Show, b: Block) {
  return { ...b, ...spotOf(show, b), _dirs: dirsOf(show, b), _tint: tintOf(b) }
}

export const railCode = (show: Show) => `RAIL = ${j([showDir(show), inputsDir(show)])}`
