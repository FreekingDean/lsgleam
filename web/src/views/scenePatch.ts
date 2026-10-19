import { FIXTURE_PORT, type SceneBlock, type Show, type Wire } from '../model/show'
import { inputPorts, outputPorts, outputRail } from '../model/ports'
import { addWire, canWire, removeWires } from '../model/wiring'
import { itemsOf, roomsOf } from './plan'
import { inRooms } from '../model/units'
import { fixtureRows, tubeRows } from './rows'

export type Target = { id: string; name: string; plot: string; info: string; section: string }
export type Driver = { port: string; block: string; name: string; member: number | null; label: string }

export function targetsOf(show: Show, scene: string): Target[] {
  const items = new Map(itemsOf(show).map((i) => [i.key, i]))
  const fixtures = new Map(fixtureRows(show).map((r) => [r.id, r]))
  const tubes = new Map(tubeRows(show).map((r) => [r.id, r]))
  const names = new Map(roomsOf(show).map((r) => [r.id, r.name]))
  const rooms = sceneRooms(show, scene)
  const mine = patched(show, scene)
  const rows = outputRail(show).flatMap((rail) => rail.ports.filter((p) => mine.has(p.id) || inRooms(show, rooms, p.id)).map((p) => {
    const b = show.blocks.find((x) => x.id === p.id)
    const item = items.get(b?.kind === 'tube' && b.set ? b.set : p.id)
    const f = fixtures.get(p.id)
    const t = tubes.get(p.id)
    const info = f ? (f.universe === null ? 'no DMX' : `U${f.universe}.${f.address}`) : t?.output != null ? `out ${t.output} @${t.offset + 1}` : 'no cable'
    return { id: p.id, name: p.label, plot: item?.id ?? '', info, rail: rail.title, room: item?.room ? names.get(item.room) : undefined }
  }))
  const split = new Set(rows.map((r) => r.room)).size > 1
  const sectioned = rows.map(({ rail, room, ...r }) => ({ ...r, section: split && room ? `${rail} · ${room}` : rail }))
  return [...new Set(sectioned.map((r) => r.section))].flatMap((s) => sectioned.filter((r) => r.section === s))
}

export function driversOf(show: Show, scene: string): Driver[] {
  const b = show.blocks.find((x) => x.id === scene)
  return b ? outputPorts(b, show).map((p) => {
    const [block, member] = p.id.split(':')
    return { port: p.id, block, name: show.blocks.find((x) => x.id === block)?.name ?? block, member: member === undefined ? null : Number(member), label: p.label }
  }) : []
}

const sceneRooms = (show: Show, scene: string) => show.blocks.find((b): b is SceneBlock => b.id === scene && b.kind === 'scene')?.rooms

const patchWires = (show: Show, scene: string, to?: string) => show.wires.filter((w) => w.from === scene && w.port === FIXTURE_PORT && !w.scene && (to === undefined || w.to === to))

export const patched = (show: Show, scene: string) => new Map(patchWires(show, scene).map((w) => [w.to, w.fromPort]))

export function repatch(show: Show, scene: string, pairs: [string, string | null][]): Show {
  let next = show
  for (const [to, port] of pairs) {
    const old = patchWires(next, scene, to)
    if (old.some((w) => w.fromPort === port)) continue
    const cleared = old.length ? removeWires(next, old) : next
    if (port === null) next = cleared
    else if (canWire(cleared, scene, port, to, FIXTURE_PORT, null)) next = addWire(cleared, { from: scene, fromPort: port, to, port: FIXTURE_PORT })
  }
  return next
}

export function options(show: Show, scene: string, targets: Target[], drivers: Driver[]) {
  const unpatched = { ...show, wires: show.wires.filter((w) => !patchWires(show, scene).includes(w)) }
  const byProfile = new Map<string, Set<string>>()
  return new Map(targets.map((t) => {
    const b = show.blocks.find((x) => x.id === t.id)
    const port = b && inputPorts(b, show).find((p) => p.id === FIXTURE_PORT)
    const key = `${port?.type}|${port?.profile}`
    const ok = byProfile.get(key) ?? new Set(drivers.filter((d) => canWire(unpatched, scene, d.port, t.id, FIXTURE_PORT, null)).map((d) => d.port))
    byProfile.set(key, ok)
    return [t.id, ok]
  }))
}

const loose = (name: string) => name.replace(/(\s+copy)+$/i, '').trim().toLowerCase()
const keyOf = (d: Driver, plain: boolean) => `${plain ? d.name : loose(d.name)}#${d.member}`

export function copyPatch(show: Show, from: string, to: string) {
  const theirs = driversOf(show, from)
  const mine = driversOf(show, to)
  const match = (d: Driver) => mine.find((m) => keyOf(m, true) === keyOf(d, true)) ?? mine.find((m) => keyOf(m, false) === keyOf(d, false))
  const missing = new Set<string>()
  const pairs: [string, string][] = []
  const rooms = sceneRooms(show, to)
  let outside = 0
  for (const w of patchWires(show, from)) {
    if (!inRooms(show, rooms, w.to)) {
      outside++
      continue
    }
    const d = theirs.find((x) => x.port === w.fromPort)
    const m = d && match(d)
    if (m) pairs.push([w.to, m.port])
    else missing.add(d?.name ?? w.fromPort)
  }
  const next = repatch(show, to, pairs)
  const got = patched(next, to)
  const name = (id: string) => show.blocks.find((b) => b.id === id)?.name ?? id
  const refused = pairs.filter(([t, p]) => got.get(t) !== p).map(([t]) => name(t))
  return { show: next, missing: [...missing], refused, outside }
}

export const changedWires = (a: Show, b: Show): Wire[] => [...a.wires.filter((w) => !b.wires.includes(w)), ...b.wires.filter((w) => !a.wires.includes(w))]
