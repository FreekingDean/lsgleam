import type { FixtureProfile } from './fixtures'
import type { CompiledMode } from './ofl'
import { type Placement, type BoxBlock, type Point, type TubeBlock, type BoardBlock, type Block, type Kind, type Cable, type Show, VIRTUAL_KINDS, type Port, fixtureMode, profileOf, membersOf } from './show'
import { audioInputs } from '../blocks'
import { typed } from './show'
import { unitPatch, tubePatch, pixelAddress } from './patch'
import { floorAt } from './floors'

export type Unit = { key: string; block: Block; name: string; placement: Placement; flip: boolean; inputs: Port[]; outputs: Port[] }

const DMX_IN = typed('in', 'dmx', 'in')
const DMX_OUT = typed('out', 'dmx', 'out')
const lightSpot = (i: number): Placement => ({ position: [(i - 3) * 1.5, 3, 0], rotation: [0, 0, 0] })
const floorSpot = (i: number): Placement => ({ position: [(i - 1) * 2, 0, 5], rotation: [0, 0, 0] })

export function unitsOf(show: Show): Unit[] {
  const out: Omit<Unit, 'flip'>[] = []
  let lights = 0
  let devices = 0
  for (const b of show.blocks) {
    if (b.kind === 'fixture') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? lightSpot(lights++), inputs: [DMX_IN], outputs: [DMX_OUT] })
    if (b.kind === 'artnet') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: b.inputs.map((u) => typed(`i${u}`, 'dmx', `U${u} in`)), outputs: b.universes.map((u) => typed(`u${u}`, 'dmx', `U${u} out`)) })
    if (b.kind === 'audio') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: audioInputs(b), outputs: [] })
    if (b.kind === 'box') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? { position: [0, 0, 0], rotation: [0, 0, 0] }, inputs: [], outputs: [] })
    if (b.kind === 'dmxin') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: [], outputs: [DMX_OUT] })
    if (b.kind === 'audiosource') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: [], outputs: [typed('out', 'audio', 'audio out')] })
    if (b.kind === 'tube') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? lightSpot(lights++), inputs: [{ ...typed('in', 'pixel', 'in'), profile: b.protocol }], outputs: [{ ...typed('out', 'pixel', 'out'), profile: b.protocol }] })
    if (b.kind === 'board') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: [], outputs: Array.from({ length: b.outputs }, (_, i) => ({ ...typed(`o${i + 1}`, 'pixel', `out ${i + 1}`), profile: b.protocol })) })
    if (b.kind === 'tubeset') {
      const members = membersOf(show, b.id)
      const port = (dir: string, t: TubeBlock) => ({ ...typed(`${dir}:${t.id}`, 'pixel', `${t.name.slice(b.name.length + 1)} ${dir === 'i' ? 'in' : 'out'}`), profile: t.protocol })
      out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? lightSpot(lights++), inputs: members.map((t) => port('i', t)), outputs: members.map((t) => port('o', t)) })
    }
    if (VIRTUAL_KINDS.includes(b.kind)) out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: [], outputs: [] })
  }
  const sets = new Map(out.filter((u) => u.block.kind === 'tubeset').map((u) => [u.key, u.placement]))
  return out.map((u) => ({ ...u, ...(u.block.kind === 'tube' && u.block.set ? { placement: sets.get(u.block.set) ?? u.placement } : {}), flip: u.block.flip ?? false }))
}

export function pruneCables(show: Show): Show {
  const units = new Map(unitsOf(show).map((u) => [u.key, u]))
  const cables = show.cables.filter((c) => units.get(c.from)?.outputs.some((p) => p.id === c.fromPort) && units.get(c.to)?.inputs.some((p) => p.id === c.port))
  return cables.length === show.cables.length ? show : { ...show, cables }
}

export function canCable(show: Show, from: string, fromPort: string, to: string, port: string) {
  if (from === to) return false
  const units = unitsOf(show)
  const ua = units.find((u) => u.key === from)
  const ub = units.find((u) => u.key === to)
  const a = ua?.outputs.find((p) => p.id === fromPort)
  const b = ub?.inputs.find((p) => p.id === port)
  if (!a || !b || a.type !== b.type || a.profile !== b.profile || (ua!.block.kind === 'dmxin') !== (ub!.block.kind === 'artnet')) return false
  if (show.cables.some((c) => (c.from === from && c.fromPort === fromPort) || (c.to === to && c.port === port))) return false
  for (let k: string | undefined = from, n = 0; k && n < 1000; n++) {
    if (k === to) return false
    const up: string | undefined = show.cables.find((c) => c.to === k && c.port === 'in')?.from
    k = up
  }
  return true
}

export const addCable = (show: Show, c: Cable): Show => ({ ...show, cables: [...show.cables, c] })
const sameCable = (a: Cable, b: Cable) => a.from === b.from && a.fromPort === b.fromPort && a.to === b.to && a.port === b.port
export const removeCables = (show: Show, cables: Cable[]): Show => ({ ...show, cables: show.cables.filter((c) => !cables.some((r) => sameCable(r, c))) })

const level = (show: Show, y?: number) => (y === undefined ? () => true : (b: BoxBlock) => floorAt(show, b.sim?.position[1] ?? 0).id === floorAt(show, y).id)

export const roomAt = (show: Show, x: number, z: number, y?: number) => roomsOf(show).filter(level(show, y)).find((b) => Math.abs(x - (b.sim?.position[0] ?? 0)) <= b.size[0] / 2 && Math.abs(z - (b.sim?.position[2] ?? 0)) <= b.size[1] / 2)

export function ceilingAt(show: Show, x: number, z: number, y?: number) {
  const room = roomAt(show, x, z, y)
  return room ? (room.sim?.position[1] ?? 0) + room.size[2] : null
}

export function onWall(show: Show, p: Placement): Placement | null {
  const [x, y, z] = p.position
  const room = roomAt(show, x, z, y)
  if (!room) return null
  const [cx, , cz] = room.sim?.position ?? [0, 0, 0]
  const [w, d] = room.size
  const walls: [number, Placement][] = [
    [x - (cx - w / 2), { position: [cx - w / 2, y, z], rotation: [p.rotation[0], 90, p.rotation[2]] }],
    [cx + w / 2 - x, { position: [cx + w / 2, y, z], rotation: [p.rotation[0], -90, p.rotation[2]] }],
    [z - (cz - d / 2), { position: [x, y, cz - d / 2], rotation: [p.rotation[0], 0, p.rotation[2]] }],
    [cz + d / 2 - z, { position: [x, y, cz + d / 2], rotation: [p.rotation[0], 180, p.rotation[2]] }],
  ]
  return walls.sort((a, b) => a[0] - b[0])[0][1]
}

export type SimFixture = { key: string; name: string; profile: FixtureProfile; mode: CompiledMode; placement: Placement; address: number; node: string | null; universe: number | null }
export type SimTube = { key: string; name: string; placement: Placement; path: Point[]; leds: number; addresses: [string, number][] | null; label: string }
export type SimDevice = { key: string; name: string; kind: Kind; placement: Placement; size?: [number, number, number] }

export function simFixtures(show: Show): SimFixture[] {
  return unitsOf(show).flatMap((u) => u.block.kind === 'fixture' ? [{ key: u.key, name: u.name, profile: profileOf(u.block), mode: fixtureMode(u.block), placement: u.placement, address: u.block.address, node: unitPatch(show, u.key)?.node ?? null, universe: unitPatch(show, u.key)?.universe ?? null }] : [])
}

export function simTubes(show: Show): SimTube[] {
  return unitsOf(show).flatMap((u) => {
    if (u.block.kind !== 'tube') return []
    const t = u.block
    const p = tubePatch(show, t.id)
    const board = show.blocks.find((b): b is BoardBlock => b.kind === 'board' && b.id === p?.board)
    const addresses = p && board ? Array.from({ length: t.leds }, (_, i): [string, number] => {
      const a = pixelAddress(board, p.output, p.offset + i)
      return [`${board.id}:${a.universe}`, a.channel]
    }) : null
    const label = p && board ? `${board.name} out ${p.output} · LEDs ${p.offset + 1}–${p.offset + t.leds}` : 'no pixel cable'
    return [{ key: t.id, name: t.name, placement: u.placement, path: t.path, leds: t.leds, addresses, label }]
  })
}

export const simDevices = (show: Show): SimDevice[] => unitsOf(show).filter((u) => u.block.kind !== 'fixture' && u.block.kind !== 'tube' && u.block.kind !== 'tubeset' && !VIRTUAL_KINDS.includes(u.block.kind)).map((u) => ({ key: u.key, name: u.name, kind: u.block.kind, placement: u.placement, ...(u.block.kind === 'box' ? { size: u.block.size } : {}) }))

export const roomsOf = (show: Show) => show.blocks.filter((b): b is BoxBlock => b.kind === 'box')

export function rectOf(b: BoxBlock) {
  const [cx, , cz] = b.sim?.position ?? [0, 0, 0]
  return { x: cx - b.size[0] / 2, z: cz - b.size[1] / 2, w: b.size[0], d: b.size[1], h: b.size[2] }
}

export function nearestRoom(show: Show, [x, z]: [number, number], y?: number) {
  const away = (b: BoxBlock) => {
    const r = rectOf(b)
    return Math.hypot(Math.max(r.x - x, 0, x - r.x - r.w), Math.max(r.z - z, 0, z - r.z - r.d))
  }
  return roomsOf(show).filter(level(show, y)).sort((a, b) => away(a) - away(b))[0]?.id ?? null
}

export function roomOf(show: Show, key: string) {
  const u = unitsOf(show).find((x) => x.key === key)
  return u ? nearestRoom(show, [u.placement.position[0], u.placement.position[2]], u.placement.position[1]) : null
}

export function inRooms(show: Show, rooms: string[] | undefined, key: string) {
  const live = (rooms ?? []).filter((id) => roomsOf(show).some((r) => r.id === id))
  return !live.length || live.includes(roomOf(show, key) ?? '')
}
