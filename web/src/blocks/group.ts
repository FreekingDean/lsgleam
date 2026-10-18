import { type Aims, type Base, type GroupPosition, type PatternAdvance, type PatternMode, type Show, NUDGE_PORT, PATTERN_PORT, POSITION_PORT, profileOf, typed } from '../model/show'
import { defaultValues, findProfile, valuePairs, type Values } from '../model/fixtures'
import { patternMasks } from '../model/catalog'
import type { BlockDef } from './types'
import { color, hasRgb, look } from './light'
import python from './group.py?raw'

export type GroupBlock = Base & { kind: 'group'; profile: string; size: number; values: Values; aims: Aims; positions: GroupPosition[]; mode: PatternMode; advance: PatternAdvance; every: number; floor: number }

export function fixturesOf(show: Show, port: string, member = false) {
  const id = port.split(':')[0]
  const out = show.blocks.find((b) => b.id === id)
  const wired = new Set(show.wires.filter((w) => out?.scene && w.from === out.scene && (w.fromPort === port || (member && w.fromPort.startsWith(`${port}:`)))).map((w) => w.to))
  return show.blocks.filter((b) => (b.kind === 'fixture' || b.kind === 'tube') && wired.has(b.id)).map((b) => b.id)
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
    return [look(), ...(hasRgb(b) ? [color()] : []), typed(PATTERN_PORT, 'signal'), typed('floor', 'signal', 'minimum'), ...advance, ...aim, ...ports]
  },
  outputs: () => [],
  subtitle: (b, _outputs, targets) => `${b.mode} → ${targets.length}× ${profileOf(b).label}`,
  lead: (b) => [valuePairs(profileOf(b), b.values), profileOf(b).position ?? []],
  args: (b) => {
    const members = Array.from({ length: b.size }, (_, i) => ({ id: String(i), aim: b.aims[i] ?? {} }))
    return [patternMasks(b.mode, members.length), members]
  },
}
