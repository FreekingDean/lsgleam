import { FIXTURE_PORT, fixtureMode, profileOf, type BoardBlock, type Show } from '../model/show'
import { pixelAddress, tubePatch, unitPatch } from '../model/patch'
import { pixelChain } from '../blocks'
import { roomAt, unitsOf } from '../model/units'

export type Row = { id: string; jump: string; warn: boolean }
export type Column<T> = { label: string; text: (r: T) => string; sort?: (r: T) => number | string }
export type FixtureRow = Row & { name: string; type: string; channels: number; node: string; universe: number | null; address: number; x: number; height: number; z: number; turn: number; tilt: number; room: string; scenes: string[] }
export type TubeRow = Row & { set: string; name: string; protocol: string; leds: number; length: number; board: string; output: number | null; offset: number; spans: [number, [number, number]][] }

export const num = (v: number) => `${Number(v.toFixed(2))}`
export const range = (from: number, to: number) => `${from}–${to}`

function drivers(show: Show, id: string) {
  return show.wires.filter((w) => w.to === id && w.port === FIXTURE_PORT).flatMap((w) => {
    const scene = show.blocks.find((b) => b.id === w.from && b.kind === 'scene')
    const [outId, member] = w.fromPort.split(':')
    const out = show.blocks.find((b) => b.id === outId)
    return scene && out ? [`${scene.name}: ${out.name}${member === undefined ? '' : ` ${Number(member) + 1}`}`] : []
  })
}

export function fixtureRows(show: Show): FixtureRow[] {
  return unitsOf(show).flatMap((u) => {
    const b = u.block
    if (b.kind !== 'fixture') return []
    const p = unitPatch(show, b.id)
    const node = show.blocks.find((x) => x.id === p?.node)
    const [x, height, z] = u.placement.position
    return [{
      id: b.id, jump: b.id, warn: !p, name: b.name, type: profileOf(b).label, channels: fixtureMode(b).channels.length,
      node: node?.kind === 'artnet' ? `${node.name} · ${node.ip} · ${node.protocol}` : '', universe: p?.universe ?? null, address: b.address,
      x, height, z, turn: u.placement.rotation[1], tilt: u.placement.rotation[0], room: roomAt(show, x, z)?.name ?? '', scenes: drivers(show, b.id),
    }]
  })
}

function spansOf(board: BoardBlock, output: number, offset: number, leds: number) {
  const spans = new Map<number, [number, number]>()
  for (let i = offset; i < offset + leds; i++) {
    const a = pixelAddress(board, output, i)
    spans.set(a.universe, [spans.get(a.universe)?.[0] ?? a.channel, a.channel + 2])
  }
  return [...spans]
}

export function tubeRows(show: Show): TubeRow[] {
  return show.blocks.flatMap((t) => {
    if (t.kind !== 'tube') return []
    const set = show.blocks.find((b) => b.id === t.set)
    const p = tubePatch(show, t.id)
    const board = show.blocks.find((b): b is BoardBlock => b.kind === 'board' && b.id === p?.board)
    return [{
      id: t.id, jump: t.set ?? t.id, warn: !board, set: set?.name ?? '', name: set ? t.name.slice(set.name.length + 1) : t.name, protocol: t.protocol, leds: t.leds, length: t.length,
      board: board ? `${board.name} · ${board.ip}` : '', output: p && board ? p.output : null, offset: p?.offset ?? 0, spans: p && board ? spansOf(board, p.output, p.offset, t.leds) : [],
    }]
  })
}

export function compare(a: number | string, b: number | string) {
  return typeof a === 'number' && typeof b === 'number' ? (a === b ? 0 : a < b ? -1 : 1) : `${a}`.localeCompare(`${b}`, undefined, { numeric: true })
}

export function summary(show: Show, fixtures: FixtureRow[], tubes: TubeRow[]) {
  const types = new Map<string, number>()
  for (const f of fixtures) types.set(f.type, (types.get(f.type) ?? 0) + 1)
  const claims = new Map<string, { label: string; order: [string, number]; channels: Map<number, string[]> }>()
  const claim = (key: string, label: string, order: [string, number], from: number, to: number, name: string) => {
    const u = claims.get(key) ?? { label, order, channels: new Map() }
    claims.set(key, u)
    for (let c = from; c <= to; c++) u.channels.set(c, [...(u.channels.get(c) ?? []), name])
  }
  const warnings: string[] = []
  for (const f of fixtures) {
    if (f.universe === null) continue
    const end = f.address + f.channels - 1
    claim(`${f.node}:${f.universe}`, `${f.node.split(' · ')[0]} U${f.universe}`, [f.node, f.universe], f.address, end, f.name)
    if (end > 512) warnings.push(`${f.name} ends at channel ${end}, past 512 in U${f.universe}`)
  }
  for (const t of tubes) for (const [u, [a, b]] of t.spans) claim(`${t.board}:${u}`, `${t.board.split(' · ')[0]} U${u}`, [t.board, u], a, b, `${t.set} ${t.name}`)
  const universes = [...claims.values()].sort((a, b) => compare(a.order[0], b.order[0]) || a.order[1] - b.order[1])
  for (const u of universes) {
    const clash = new Set([...u.channels.values()].filter((names) => names.length > 1).flat())
    if (clash.size) warnings.push(`${u.label}: addresses overlap between ${[...clash].join(', ')}`)
  }
  for (const n of new Set(universes.map((u) => u.order[1]))) {
    const owners = new Set(universes.filter((u) => u.order[1] === n).map((u) => u.order[0].split(' · ')[0]))
    if (owners.size > 1) warnings.push(`U${n} is sent by ${[...owners].join(' and ')}`)
  }
  const boards = show.blocks.flatMap((b) => {
    if (b.kind !== 'board') return []
    const used = Array.from({ length: b.outputs }, (_, i) => i + 1).flatMap((o) => {
      const leds = pixelChain(show, b.id, o).reduce((sum, t) => sum + t.leds, 0)
      if (leds > b.ledsPerOutput) warnings.push(`${b.name} out ${o}: ${leds} LEDs on a ${b.ledsPerOutput}-LED output`)
      return leds ? [leds] : []
    })
    return [`${b.name} · ${b.ip}: ${used.length}/${b.outputs} outputs, ${used.reduce((a, n) => a + n, 0)} LEDs`]
  })
  const unpatched = fixtures.filter((f) => f.universe === null)
  if (unpatched.length) warnings.push(`Unpatched fixtures: ${unpatched.map((f) => f.name).join(', ')}`)
  const loose = tubes.filter((t) => t.output === null)
  if (loose.length) warnings.push(`Tubes without a pixel cable: ${loose.map((t) => `${t.set} ${t.name}`).join(', ')}`)
  return { types: [...types], universes: universes.map((u) => `${u.label}: ${u.channels.size}/512`), boards, warnings }
}
