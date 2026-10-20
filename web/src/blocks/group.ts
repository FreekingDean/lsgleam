import { type Aims, type Base, memberPort, type GroupPosition, type PatternAdvance, type PatternMode, type Show, NUDGE_PORT, PATTERN_PORT, POSITION_PORT, profileOf, typed } from '../model/show'
import { defaultValues, findProfile, valuePairs, type Values } from '../model/fixtures'
import { patternMasks } from '../model/catalog'
import type { BlockDef } from './types'
import { color, hasRgb, look } from './light'
import { hexToRgb } from '../model/format'
import { unitsOf } from '../model/units'
import python from './group.py?raw'

export type WipeOrder = 'members' | 'leftright' | 'rightleft' | 'frontback' | 'backfront' | 'centreout' | 'outsidein'
export type Wipe = { on: boolean; order: WipeOrder; softness: number; colorB: string; progress: number }
export type GroupBlock = Base & { kind: 'group'; profile: string; size: number; values: Values; aims: Aims; positions: GroupPosition[]; mode: PatternMode; advance: PatternAdvance; every: number; floor: number; wipe?: Wipe }

export const WIPE_OFF: Wipe = { on: false, order: 'members', softness: 0, colorB: '#0000ff', progress: 0 }
export const WIPE_ORDERS: Record<WipeOrder, string> = { members: 'member order', leftright: 'left → right', rightleft: 'right → left', frontback: 'front → back', backfront: 'back → front', centreout: 'centre out', outsidein: 'outside in' }
export const COLOR_B_PORT = 'colorB'
export const PROGRESS_PORT = 'progress'

export const wipeOn = (b: GroupBlock) => !!b.wipe?.on && !!hasRgb(b)

export function fixturesOf(show: Show, port: string, member = false) {
  const id = port.split(':')[0]
  const out = show.blocks.find((b) => b.id === id)
  const wired = new Set(show.wires.filter((w) => out?.scene && w.from === out.scene && (w.fromPort === port || (member && w.fromPort.startsWith(`${port}:`)))).map((w) => w.to))
  return show.blocks.filter((b) => (b.kind === 'fixture' || b.kind === 'tube') && wired.has(b.id)).map((b) => b.id)
}

function memberSpots(show: Show, b: GroupBlock) {
  const at = new Map(unitsOf(show).map((u) => [u.key, u.placement.position]))
  return Array.from({ length: b.size }, (_, k) => {
    const spots = fixturesOf(show, memberPort(b.id, k)).map((id) => at.get(id)).filter((p) => p !== undefined)
    return spots.length ? [spots.reduce((s, p) => s + p[0], 0) / spots.length, spots.reduce((s, p) => s + p[2], 0) / spots.length] : null
  })
}

export function wipeRanks(show: Show, b: GroupBlock) {
  const order = b.wipe?.order ?? 'members'
  const members = Array.from({ length: b.size }, (_, k) => k)
  if (order === 'members') return members
  const spots = memberSpots(show, b)
  const placed = spots.filter((p) => p !== null)
  const [cx, cz] = [0, 1].map((i) => placed.reduce((s, p) => s + p[i], 0) / Math.max(placed.length, 1))
  const key = ([x, z]: number[]) => ({ leftright: x, rightleft: -x, frontback: -z, backfront: z, centreout: Math.hypot(x - cx, z - cz), outsidein: -Math.hypot(x - cx, z - cz) })[order]
  const sorted = [...members].sort((i, j) => {
    const a = spots[i]
    const c = spots[j]
    if (!a || !c) return Number(!a) - Number(!c) || i - j
    return key(a) - key(c) || i - j
  })
  return members.map((k) => sorted.indexOf(k))
}

export function wipesMoved(prev: Show, next: Show) {
  const before = new Map(prev.blocks.filter((b) => b.kind === 'group').map((b) => [b.id, b]))
  return next.blocks.filter((b): b is GroupBlock => b.kind === 'group' && wipeOn(b) && b.wipe!.order !== 'members' && before.get(b.id) !== undefined && JSON.stringify(memberSpots(prev, before.get(b.id) as GroupBlock)) !== JSON.stringify(memberSpots(next, b))).map((b) => b.id)
}

export function wipeMix(b: GroupBlock, rank: number, a: number[], progress = b.wipe?.progress ?? 0) {
  const s = Math.max(b.wipe?.softness ?? 0, 1e-4)
  const t = Math.max(0, Math.min(1, (progress * b.size - rank - 1) / s + 1))
  const bb = hexToRgb(b.wipe?.colorB ?? WIPE_OFF.colorB)
  return a.map((v, i) => v + (bb[i] - v) * t)
}

export const group: BlockDef<GroupBlock> = {
  kind: 'group',
  label: 'Fixture group out',
  info: 'Spreads a pattern and positions over the fixtures wired to it on the show tab',
  tab: 'Outputs',
  python,
  create: (base, n, item) => {
    const profile = findProfile(item.profile)
    return { ...base, id: `grp${n}`, name: `${profile.label} group`, kind: 'group', profile: profile.id, size: 4, values: defaultValues(profile), aims: {}, positions: [], mode: 'alternate', advance: 'step', every: 1, floor: 0 }
  },
  inputs: (b) => {
    const profile = profileOf(b)
    const ports = profile.attrs.map((a) => typed(a.key, 'signal', a.label))
    const advance = b.advance === 'step' ? [typed('step', 'index', 'pattern step')] : [typed('trigger', 'signal', 'pattern next')]
    const aim = profile.position ? [typed(POSITION_PORT, 'index'), typed(NUDGE_PORT, 'signal', `nudge ${profile.position[0]}`)] : []
    const wipe = wipeOn(b) ? [{ ...color(), id: COLOR_B_PORT, label: 'color B' }, typed(PROGRESS_PORT, 'signal')] : []
    return [look(), ...(hasRgb(b) ? [color()] : []), ...wipe, typed(PATTERN_PORT, 'signal'), typed('floor', 'signal', 'minimum'), ...advance, ...aim, ...ports]
  },
  outputs: () => [],
  subtitle: (b, _outputs, targets) => `${b.mode} → ${targets.length}× ${profileOf(b).label}`,
  lead: (b) => [valuePairs(profileOf(b), b.values), profileOf(b).position ?? [], profileOf(b).wheel ?? null],
  args: (b, show) => {
    const members = Array.from({ length: b.size }, (_, i) => ({ id: String(i), aim: b.aims[i] ?? {} }))
    const wipe = wipeOn(b) ? [{ ranks: wipeRanks(show, b), softness: b.wipe!.softness, color: hexToRgb(b.wipe!.colorB), progress: b.wipe!.progress }] : []
    return [patternMasks(b.mode, members.length), members, ...wipe]
  },
}
