import * as THREE from 'three'
import { fixtureMode, membersOf, profileOf, type Kind, type Placement, type Point, type Show } from '../model/show'
import { nearestRoom, rectOf, roomsOf, unitsOf } from '../model/units'
import { tubePatch, unitPatch } from '../model/patch'
import { chainOf, outputUniverses, pixelChain } from '../blocks'
import { range, tubeRows } from './rows'

export type XZ = [number, number]
export type Mark = 'fixture' | 'tubes' | 'device'
export type Item = { key: string; id: string; name: string; type: string; mark: Mark; at: XZ; height: number; room: string | null; info: string; tips: [string, XZ][]; patched: boolean }
export type End = { name: string; in: XZ; out: XZ; room: string | null }
export type Run = { n: number; type: 'dmx' | 'pixel' | 'other'; title: string; universes: number[]; stops: string[] }
export type Box = { x: number; y: number; w: number; h: number }

const COLORS = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#ff7f0e', '#17becf', '#8c564b', '#e377c2']
const DASHES = ['', '10 4', '3 3', '12 3 3 3', '6 6', '12 3 3 3 3 3']

const DEVICES: Partial<Record<Kind, string>> = { tubeset: 'Tube set', board: 'Pixel board', artnet: 'Art-Net node', dmxin: 'DMX controller', audiosource: 'Audio source', audio: 'Audio interface' }

export const orderOf = (runs: Run[]) => new Map(runs.flatMap((r) => (r.type === 'other' ? [] : r.stops.slice(1).map((key, i): [string, string] => [key, `${r.n}.${i + 1}`]))))

function lettersOf(types: string[]) {
  const used = new Set<string>()
  return new Map(types.map((t) => {
    const words = t.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => /^[A-Z]/.test(w))
    const rest = [...words.join('').slice(1)]
    const letter = [...words.map((w) => w[0]), ...rest, ...rest.map((c) => words[0][0] + c)].find((c) => !used.has(c)) ?? t
    used.add(letter)
    return [t, letter]
  }))
}

const span = (ns: number[]) => (ns.length > 1 && ns.at(-1)! - ns[0] === ns.length - 1 ? range(ns[0], ns.at(-1)!) : ns.join(','))

const euler = (p: Placement) => new THREE.Euler(...(p.rotation.map((d) => (d * Math.PI) / 180) as [number, number, number]))

const project = (p: Placement, at: Point): XZ => {
  const v = new THREE.Vector3(...at).applyEuler(euler(p))
  return [p.position[0] + v.x, p.position[2] + v.z]
}

export { roomsOf, rectOf }

function infoOf(show: Show, key: string, ids: Map<string, string>, order: Map<string, string>) {
  const b = show.blocks.find((x) => x.id === key)
  if (b?.kind === 'fixture') {
    const patch = unitPatch(show, b.id)
    return `${patch ? `U${patch.universe}.${b.address}` : 'unpatched'} · ${fixtureMode(b).channels.length} ch${order.has(key) ? ` · ${order.get(key)}` : ''}`
  }
  if (b?.kind === 'tubeset') {
    const tubes = membersOf(show, b.id)
    const patches = tubes.flatMap((t) => tubePatch(show, t.id) ?? [])
    const boards = [...new Set(patches.map((p) => p.board))].map((id) => `${ids.get(id) ?? '?'} out ${span([...new Set(patches.filter((p) => p.board === id).map((p) => p.output))].sort((x, y) => x - y))}`)
    const universes = [...new Set(tubeRows(show).filter((r) => r.jump === b.id).flatMap((r) => r.spans.map(([u]) => u)))].sort((x, y) => x - y)
    return `${boards.join(', ') || 'no pixel cable'}${universes.length ? ` · U${span(universes)}` : ''}`
  }
  if (b?.kind === 'artnet') return `${b.ip} · U${b.universes.join(',')}`
  if (b?.kind === 'board') return `${b.ip} · ${b.outputs} outs`
  if (b?.kind === 'dmxin') return `${b.channels} ch`
  if (b?.kind === 'audio') return b.device || 'audio in'
  return ''
}

export function itemsOf(show: Show): Item[] {
  const runs = runsOf(show)
  const owner = (key: string) => {
    const b = show.blocks.find((x) => x.id === key)
    return b?.kind === 'tube' && b.set ? b.set : key
  }
  const rigged = runs.flatMap((r) => r.stops.map(owner))
  const rank = (key: string) => (rigged.includes(key) ? rigged.indexOf(key) : rigged.length)
  const placed = unitsOf(show).flatMap((u): Omit<Item, 'id' | 'info'>[] => {
    const b = u.block
    const at: XZ = [u.placement.position[0], u.placement.position[2]]
    const base = { key: u.key, name: u.name, at, height: u.placement.position[1], room: nearestRoom(show, at, u.placement.position[1]), tips: [], patched: true }
    if (b.kind === 'fixture') return [{ ...base, type: profileOf(b).label, mark: 'fixture', patched: !!unitPatch(show, b.id) }]
    if (b.kind === 'tubeset') return [{ ...base, type: DEVICES.tubeset!, mark: 'tubes', tips: membersOf(show, b.id).map((t): [string, XZ] => [t.name.slice(b.name.length + 1), project(u.placement, t.path.at(-1)!)]) }]
    const type = DEVICES[b.kind]
    return type ? [{ ...base, type, mark: 'device' }] : []
  })
  const types = [...new Set(placed.filter((i) => i.mark === 'fixture').map((i) => i.type)), ...Object.values(DEVICES).filter((t) => placed.some((i) => i.type === t))]
  const letters = lettersOf(types)
  const count = new Map<string, number>()
  const ids = new Map([...placed].sort((a, b) => rank(a.key) - rank(b.key)).map((i): [string, string] => {
    count.set(i.type, (count.get(i.type) ?? 0) + 1)
    return [i.key, `${letters.get(i.type)}${count.get(i.type)}`]
  }))
  const order = orderOf(runs)
  return placed.map((i) => ({ ...i, id: ids.get(i.key)!, info: infoOf(show, i.key, ids, order) }))
}

export function endsOf(show: Show): Map<string, End> {
  return new Map(unitsOf(show).map((u) => {
    const b = u.block
    const at: XZ = [u.placement.position[0], u.placement.position[2]]
    const path = b.kind === 'tube' ? b.path.map((p) => project(u.placement, p)) : [at]
    const set = b.kind === 'tube' ? show.blocks.find((x) => x.id === b.set) : undefined
    return [u.key, { name: set ? `${set.name} · ${b.name.slice(set.name.length + 1)}` : u.name, in: path[0], out: path.at(-1)!, room: nearestRoom(show, at, u.placement.position[1]) }]
  }))
}

export function runsOf(show: Show): Run[] {
  const runs: Omit<Run, 'n'>[] = []
  for (const b of show.blocks) {
    if (b.kind === 'artnet') for (const u of b.universes) {
      const keys = chainOf(show, b.id, u)
      if (keys.length) runs.push({ type: 'dmx', title: `${b.name} · U${u} out`, universes: [u], stops: [b.id, ...keys] })
    }
    if (b.kind === 'board') for (let o = 1; o <= b.outputs; o++) {
      const tubes = pixelChain(show, b.id, o)
      if (tubes.length) runs.push({ type: 'pixel', title: `${b.name} · out ${o}`, universes: outputUniverses(b, o), stops: [b.id, ...tubes.map((t) => t.id)] })
    }
  }
  const covered = (from: string, to: string) => runs.some((r) => r.stops.some((s, i) => s === from && r.stops[i + 1] === to))
  for (const c of show.cables) {
    if (covered(c.from, c.to)) continue
    const from = show.blocks.find((b) => b.id === c.from)
    const to = show.blocks.find((b) => b.id === c.to)
    runs.push({ type: 'other', title: `${from?.name ?? c.from} → ${to?.name ?? c.to}`, universes: [], stops: [c.from, c.to] })
  }
  return runs.map((r, i) => ({ ...r, n: i + 1 }))
}

export function styles(runs: Run[]) {
  const universes = [...new Set(runs.flatMap((r) => r.universes.slice(0, 1)))].sort((a, b) => a - b)
  return (r: Run) => {
    const i = r.universes.length ? universes.indexOf(r.universes[0]) : -1
    return i < 0 ? { color: '#666', dash: '1 3', width: 1.5 } : { color: COLORS[i % COLORS.length], dash: DASHES[i % DASHES.length], width: 2 }
  }
}
