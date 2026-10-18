import * as THREE from 'three'
import { membersOf, profileOf, type BoxBlock, type Kind, type Placement, type Point, type Show } from '../model/show'
import { unitsOf } from '../model/units'
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

const DEVICES: Partial<Record<Kind, string>> = { tubeset: 'Tube set', board: 'Pixel board', artnet: 'Art-Net node', dmxin: 'DMX controller', cdj: 'CDJ', audio: 'Audio interface' }

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

export const roomsOf = (show: Show) => show.blocks.filter((b): b is BoxBlock => b.kind === 'box')

export function rectOf(b: BoxBlock) {
  const [cx, , cz] = b.sim?.position ?? [0, 0, 0]
  return { x: cx - b.size[0] / 2, z: cz - b.size[1] / 2, w: b.size[0], d: b.size[1], h: b.size[2] }
}

export function nearestRoom(show: Show, [x, z]: XZ) {
  const away = (b: BoxBlock) => {
    const r = rectOf(b)
    return Math.hypot(Math.max(r.x - x, 0, x - r.x - r.w), Math.max(r.z - z, 0, z - r.z - r.d))
  }
  return roomsOf(show).sort((a, b) => away(a) - away(b))[0]?.id ?? null
}

function infoOf(show: Show, key: string, ids: Map<string, string>, order: Map<string, string>) {
  const b = show.blocks.find((x) => x.id === key)
  if (b?.kind === 'fixture') {
    const patch = unitPatch(show, b.id)
    return `${patch ? `U${patch.universe}.${b.address}` : 'unpatched'} · ${profileOf(b).channels.length} ch${order.has(key) ? ` · ${order.get(key)}` : ''}`
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
  if (b?.kind === 'cdj') return `player ${b.player}`
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
    const base = { key: u.key, name: u.name, at, height: u.placement.position[1], room: nearestRoom(show, at), tips: [], patched: true }
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
    return [u.key, { name: set ? `${set.name} · ${b.name.slice(set.name.length + 1)}` : u.name, in: path[0], out: path.at(-1)!, room: nearestRoom(show, at) }]
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

const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const inside = (a: Box, f: Box) => a.x >= f.x && a.y >= f.y && a.x + a.w <= f.x + f.w && a.y + a.h <= f.y + f.h
const RINGS = [0, 8, 18, 30, 46, 64, 86, 112, 144, 180, 220, 270]
const ANGLES = [0, 180, 90, 270, 45, 135, 225, 315, 22.5, 157.5, 202.5, 337.5, 67.5, 112.5, 247.5, 292.5]

export const nearest = (b: Box, [x, y]: XZ): XZ => [Math.max(b.x, Math.min(x, b.x + b.w)), Math.max(b.y, Math.min(y, b.y + b.h))]

const side = (a: XZ, b: XZ, c: XZ) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
const crosses = ([a, b]: [XZ, XZ], [c, d]: [XZ, XZ]) => side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0

export function placeLabels(labels: { at: XZ; r: number; w: number; h: number }[], blocked: Box[], soft: Box[], frame: Box) {
  const taken = [...blocked]
  const leaders: [XZ, XZ][] = []
  const crowd = (i: number) => labels.filter((l) => Math.hypot(l.at[0] - labels[i].at[0], l.at[1] - labels[i].at[1]) < 60).length
  const order = labels.map((_, i) => i).sort((a, b) => crowd(b) - crowd(a))
  const out: { box: Box; ring: number }[] = []
  for (const i of order) {
    const { at: [x, y], r, w, h } = labels[i]
    const candidates = RINGS.flatMap((ring) => ANGLES.map((a) => {
      const [ux, uy] = [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]
      const d = r + 3 + ring
      const box = { x: x + ux * d + (ux * w) / 2 - w / 2, y: y + uy * d + (uy * h) / 2 - h / 2, w, h }
      return { box, ring, leader: [[x + ux * r, y + uy * r], nearest(box, [x, y])] as [XZ, XZ] }
    }))
    const cost = (c: (typeof candidates)[number]) => {
      const [[ax, ay], [bx, by]] = c.leader
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4)
      const dots = Array.from({ length: Math.max(0, n - 1) }, (_, k) => ({ x: ax + ((bx - ax) * (k + 1)) / n, y: ay + ((by - ay) * (k + 1)) / n, w: 0, h: 0 }))
      const tangled = leaders.filter((l) => crosses(l, c.leader)).length + (dots.some((d) => taken.some((t) => hit(d, t))) ? 1 : 0)
      return c.ring * 2 + 80 * tangled + 45 * soft.filter((t) => hit(c.box, t)).length ** 0.5
    }
    const free = candidates.filter((c) => inside(c.box, frame) && !taken.some((t) => hit(c.box, t)))
    const best = free.reduce<(typeof candidates)[number] | null>((m, c) => (m && cost(m) <= cost(c) ? m : c), null) ?? candidates[0]
    taken.push(best.box)
    if (best.ring) leaders.push(best.leader)
    out[i] = best
  }
  return out
}
