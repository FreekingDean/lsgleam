import { syncSets } from './edit'
import { FIXTURES, compiledOf, type StoredProfile, type Values } from './fixtures'
import type { ModeChannel, OflCapability, OflChannel, OflFixture, OflSlot } from './ofl'
import { type Point, type TubeBlock, type TubeDesign, EMPTY_SHOW, FIXTURE_PORT, memberPort, NODE_H, NODE_W, scenesOf, type Aims, type Block, type Cable, type ColorResponse, type FixtureBlock, type GroupBlock, type LightBlock, hasProfile, SOURCE_KINDS, type Kind, type Patch, type Placement, type Position, type Scene, type Show, type Wire } from './show'
import { blockHeight, hasInput, inputPorts, outputPorts } from './ports'
import { pathLength } from './geometry'
import { pruneCables } from './units'
import { FLOOR_1 } from './floors'

const LEGACY_KINDS: Record<string, Kind> = { scenes: 'looks' }
const LIGHT_KINDS = ['fixture', 'group']

type LegacyOutput = { id: string; universe: number; protocol: 'artnet' | 'sacn'; ip: string; active: boolean }
type Legacy = Omit<Show, 'cables'> & { cables?: Cable[]; scenes?: { id: string; name: string }[]; select?: unknown }
type LegacyMember = { name: string; address: number; aim: Record<string, number>; sim?: Placement; flip?: boolean }
type LegacyGroup = GroupBlock & { members?: LegacyMember[]; positions: { name: string; members: Record<string, number>[] }[] }
type LegacyFixture = FixtureBlock & { positions?: Position[] }
type LegacyDmxIn = Block & { node?: string; universe?: number }

function migrate(raw: Legacy): Show {
  const blocks = raw.blocks.map((b) => ({ ...b, kind: LEGACY_KINDS[b.kind] ?? b.kind }) as Block)
  const legacyOutput = (b: Block) => b.kind === 'output' && 'universe' in b
  const outputs = blocks.filter(legacyOutput) as unknown as LegacyOutput[]
  const patched = blocks.map((b) => {
    if (legacyOutput(b)) {
      const o = b as unknown as LegacyOutput
      return { id: b.id, name: b.name, x: b.x, y: b.y, w: b.w, h: b.h, kind: 'artnet', protocol: o.protocol, ip: o.ip, universes: [o.universe], inputs: [], active: o.active } as Block
    }
    if (LIGHT_KINDS.includes(b.kind)) {
      const { patch: _patch, ...rest } = b as Block & { patch?: Patch | null }
      return rest as Block
    }
    if (b.kind === 'dmxin' && (b as LegacyDmxIn).node === undefined && (b as LegacyDmxIn).universe !== undefined) {
      const { protocol: _protocol, ...rest } = b as Block & { protocol?: string }
      return { ...rest, node: outputs[0]?.id ?? '' } as unknown as Block
    }
    return b
  })
  const sceneBlocks: Block[] = (raw.scenes ?? []).filter((s) => !patched.some((b) => b.id === s.id)).map((s, i) => ({ id: s.id, name: s.name, kind: 'scene', fadeIn: 0.5, fadeOut: 0.5, x: -200, y: -200 - i * 160, w: NODE_W, h: NODE_H }))
  const all = [...patched, ...sceneBlocks]
  const main = all.find((b) => b.kind === 'scene')?.id
  const rigKinds = ['audio', 'dmxin', 'blt', 'audioslice', 'artnet', 'manual', 'scene']
  const legacy = !raw.blocks.some((b) => b.kind === 'scene')
  const withScene = all.map((b) => (!legacy || LIGHT_KINDS.includes(b.kind) || rigKinds.includes(b.kind) || b.scene || !main ? b : { ...b, scene: main }))
  const patchWires: Wire[] = blocks.flatMap((b) => {
    if (!LIGHT_KINDS.includes(b.kind)) return []
    const legacy = (b as Block & { patch?: Patch | null }).patch
    if (legacy) return [{ from: b.id, fromPort: 'dmx', to: legacy.node, port: `u${legacy.universe}` }]
    const old = raw.wires.find((w) => w.from === b.id && w.port === 'dmx' && w.fromPort === 'out')
    const out = old && outputs.find((o) => o.id === old.to)
    return out ? [{ from: b.id, fromPort: 'dmx', to: out.id, port: `u${out.universe}` }] : []
  })
  const wires = [...raw.wires.filter((w) => !(w.fromPort === 'out' && w.port === 'dmx')), ...patchWires.filter((pw) => !raw.wires.some((w) => w.from === pw.from && w.fromPort === 'dmx' && w.to === pw.to))]
  return { nextId: raw.nextId, blocks: withScene, wires: wires.filter((w) => w.fromPort !== 'dmx'), cables: raw.cables ?? chains(withScene, wires.filter((w) => w.fromPort === 'dmx')) }
}

function chains(blocks: Block[], dmx: Wire[]): Cable[] {
  const runs = new Map<string, { key: string; address: number }[]>()
  for (const w of dmx) {
    const b = blocks.find((x) => x.id === w.from)
    const units = b?.kind === 'fixture' ? [{ key: b.id, address: b.address }] : b?.kind === 'group' ? ((b as LegacyGroup).members ?? []).map((m, i) => ({ key: `${b.id}:${i}`, address: m.address })) : []
    const run = `${w.to}|${w.port}`
    runs.set(run, [...(runs.get(run) ?? []), ...units])
  }
  return [...runs].flatMap(([run, units]) => {
    const [node, port] = run.split('|')
    return units.sort((a, b) => a.address - b.address).map((u, i, all) => (i === 0 ? { from: node, fromPort: port, to: u.key, port: 'in' } : { from: all[i - 1].key, fromPort: 'out', to: u.key, port: 'in' }))
  })
}

function controllers(show: Show): Show {
  let cables = show.cables
  const blocks = show.blocks.map((b) => {
    const d = b as LegacyDmxIn
    if (b.kind !== 'dmxin' || d.universe === undefined) return b
    const { node, universe, ...rest } = d
    const net = show.blocks.find((x) => x.id === node)
    if (net?.kind === 'artnet' && !cables.some((c) => c.to === net.id && c.port === `i${universe}`)) cables = [...cables, { from: b.id, fromPort: 'out', to: net.id, port: `i${universe}` }]
    return rest as Block
  })
  const inputs = (id: string) => cables.filter((c) => c.to === id && c.port.startsWith('i')).map((c) => Number(c.port.slice(1)))
  return { ...show, cables, blocks: blocks.map((b) => (b.kind === 'artnet' ? { ...b, inputs: [...new Set([...b.inputs, ...inputs(b.id)])] } : b)) }
}

function lift(show: Show, names: Record<string, string[]>): Show {
  const old = show.blocks.filter((b) => b.kind === 'fixture' || (b.kind === 'group' && !b.scene))
  const legacyWire = (w: Wire) => w.port !== FIXTURE_PORT && old.some((l) => l.id === w.to)
  const groups = old.filter((b): b is LegacyGroup => b.kind === 'group')
  if (!groups.length && !show.wires.some(legacyWire)) return show
  let n = show.nextId
  const blocks: Block[] = show.blocks.filter((b) => !groups.includes(b as LegacyGroup))
  let cables = show.cables
  const split = new Map<string, string[]>()
  for (const g of groups) {
    const channels = names[g.profile] ?? []
    split.set(g.id, (g.members ?? []).map((m, i) => {
      const id = `fix${n++}`
      const key = `${g.id}:${i}`
      blocks.push({ id, kind: 'fixture', name: `${g.name} ${m.name}`, profile: g.profile, address: m.address, values: channels.map((ch, k) => m.aim[ch] ?? (g.values as unknown as number[])[k]), x: g.x, y: g.y, w: NODE_W, h: NODE_H, ...(m.sim ? { sim: m.sim } : {}), ...(m.flip ? { flip: m.flip } : {}) } as unknown as Block)
      cables = cables.map((c) => ({ ...c, from: c.from === key ? id : c.from, to: c.to === key ? id : c.to }))
      return id
    }))
  }
  const wires: Wire[] = []
  const outs = new Map<string, string>()
  const outFor = (scene: string, l: Block) => {
    const key = `${scene}|${l.id}`
    const made = outs.get(key)
    if (made) return made
    const place = { x: l.x, y: l.y, w: NODE_W, h: NODE_H, scene, ...(l.hidden ? { hidden: l.hidden } : {}) }
    if (l.kind === 'group') {
      const g = l as LegacyGroup
      const ids = split.get(g.id) ?? []
      const id = `grp${n++}`
      const aims: Aims = Object.fromEntries(ids.map((_, i) => [i, g.members![i].aim]))
      blocks.push({ ...place, id, name: g.name, kind: 'group', profile: g.profile, size: ids.length, values: g.values, aims, positions: g.positions.map((p) => ({ name: p.name, members: Object.fromEntries(ids.map((_, i) => [i, p.members[i] ?? {}])) })), mode: g.mode, advance: g.advance, every: g.every ?? 1, floor: 0 })
      ids.forEach((f, i) => wires.push({ from: scene, fromPort: memberPort(id, i), to: f, port: FIXTURE_PORT }))
      outs.set(key, id)
      return id
    }
    const f = l as LegacyFixture
    const id = `lt${n++}`
    blocks.push({ ...place, id, name: f.name, kind: 'light', profile: f.profile, values: f.values, positions: f.positions ?? [] })
    wires.push({ from: scene, fromPort: id, to: f.id, port: FIXTURE_PORT })
    outs.set(key, id)
    return id
  }
  const main = scenesOf(show)[0]?.id
  for (const w of show.wires) {
    const l = old.find((x) => x.id === w.to)
    if (!l || !legacyWire(w)) {
      wires.push(w)
      continue
    }
    if (w.fromPort === 'lights') {
      outFor(w.from, l)
      continue
    }
    const scene = w.scene ?? show.blocks.find((b) => b.id === w.from)?.scene ?? main
    if (scene) wires.push({ ...w, scene, to: outFor(scene, l) })
  }
  const fixtures = blocks.map((b) => {
    if (b.kind !== 'fixture') return b
    const { positions: _positions, ...rest } = b as LegacyFixture
    return rest
  })
  return { ...show, nextId: n, blocks: fixtures, wires, cables }
}

function explode(show: Show): Show {
  let wires = show.wires
  const blocks = show.blocks.map((b) => {
    if (b.kind !== 'group' || b.size !== undefined) return b
    const wired = new Set(show.wires.filter((w) => w.from === b.scene && w.fromPort === b.id).map((w) => w.to))
    const ids = show.blocks.filter((f) => f.kind === 'fixture' && wired.has(f.id)).map((f) => f.id)
    const byIndex = (m: Aims) => Object.fromEntries(ids.map((f, i) => [i, m[f] ?? {}]))
    wires = wires.map((w) => (w.from === b.scene && w.fromPort === b.id ? { ...w, fromPort: memberPort(b.id, ids.indexOf(w.to)) } : w))
    return { ...b, size: Math.max(1, ids.length), aims: byIndex(b.aims ?? {}), positions: (b.positions ?? []).map((p) => ({ ...p, members: byIndex(p.members) })) }
  })
  return { ...show, blocks, wires }
}

function setsFromTubes(show: Show): Show {
  const single = show.blocks.filter((b): b is TubeBlock => b.kind === 'tube' && !b.set)
  const designs: TubeDesign[] = [
    ...(show.designs ?? []),
    ...single.map((t) => ({ id: `${t.id}d`, name: t.name, tubes: [{ id: 't1', name: 'Tube 1', leds: t.leds, length: t.length, protocol: t.protocol, path: t.path.map((p) => p.map((v, a) => v - t.path[0][a]) as Point) }] })),
  ]
  for (const b of show.blocks) if (b.kind === 'tubeset' && !designs.some((d) => d.id === b.design)) designs.push({ id: b.design, name: b.name, tubes: [{ id: 't1', name: 'Tube 1', leds: 60, length: 1, protocol: 'sk9822', path: [[0, 0, 0], [1, 0, 0]] }] })
  const moved = new Set(single.map((t) => t.id))
  const remap = (id: string) => (moved.has(id) ? `${id}t1` : id)
  const blocks = show.blocks.map((b): Block => (b.kind === 'tube' && moved.has(b.id) ? { id: b.id, name: b.name, x: b.x, y: b.y, w: b.w, h: b.h, sim: b.sim, flip: b.flip, kind: 'tubeset', design: `${b.id}d` } : b))
  return syncSets({ ...show, designs, blocks, cables: show.cables.map((c) => ({ ...c, from: remap(c.from), to: remap(c.to) })), wires: show.wires.map((w) => ({ ...w, to: remap(w.to) })) })
}

type OldResponse = Partial<ColorResponse> & { strength?: [number, number, number]; compensate?: boolean }

function multiplierOf({ multiplier, gamma = 1, strength, compensate }: OldResponse): ColorResponse {
  if (multiplier) return { multiplier, gamma }
  return { multiplier: compensate && strength ? strength.map((s) => Math.min(...strength) / s) as ColorResponse['multiplier'] : [1, 1, 1], gamma }
}

type LegacyChannel = { name: string; label: string; default: number; options?: string[] }
export type LegacyProfile = { id: string; label: string; channels: LegacyChannel[]; position?: string[]; sim: { kind: 'par' } | { kind: 'head'; pan: number; tilt: number } }

const BUILT_IN: Record<string, string[]> = {
  par7: ['Dimmer', 'Red', 'Green', 'Blue', 'Strobe', 'Automode', 'Speed'],
  mh11: ['Pan', 'Panfine', 'Tilt', 'Tiltfine', 'Colorwheel', 'Gobo', 'Strobe', 'Dimmer', 'Ptspeed', 'Automode', 'Reset'],
}
const COLOR_CHANNELS: Record<string, string> = { Red: 'Red', Green: 'Green', Blue: 'Blue', White: 'White', Amber: 'Amber', Uv: 'UV', UV: 'UV', Cyan: 'Cyan', Magenta: 'Magenta', Yellow: 'Yellow' }
const NAMED: Record<string, OflCapability> = { Dimmer: { type: 'Intensity' }, Strobe: { type: 'ShutterStrobe', shutterEffect: 'Strobe' }, Ptspeed: { type: 'PanTiltSpeed' }, Zoom: { type: 'Zoom' }, Focus: { type: 'Focus' }, Hue: { type: 'Generic' }, Saturation: { type: 'Generic' } }

export const isLegacy = (p: unknown): p is LegacyProfile => !!p && typeof p === 'object' && Array.isArray((p as LegacyProfile).channels)

export function legacyFixture(p: LegacyProfile): OflFixture {
  const head = p.sim.kind === 'head' ? p.sim : null
  const names = p.channels.map((c) => c.name)
  const fineOf = (n: string) => (/fine$/i.test(n) && names.includes(n.slice(0, -4)) ? n.slice(0, -4) : null)
  const wheels: Record<string, { slots: OflSlot[] }> = {}
  const channels: Record<string, OflChannel> = {}
  for (const c of p.channels) {
    if (fineOf(c.name)) continue
    const fine = names.filter((n) => fineOf(n) === c.name)
    const base: OflChannel = { name: NAMED[c.name]?.type === 'Generic' ? c.name : c.label, defaultValue: `${c.default * 100}%`, ...(fine.length ? { fineChannelAliases: fine } : {}) }
    const wheel = c.options && /colou?r|gobo/i.test(c.name) ? (/gobo/i.test(c.name) ? 'Gobo' : 'Color') : null
    if (c.options && wheel) {
      const n = c.options.length
      const starts = c.options.map((_, k) => Math.round((255 * k) / Math.max(1, n - 1)))
      wheels[base.name!] = { slots: c.options.map((name, k) => (wheel === 'Gobo' && k === 0 ? { type: 'Open' } : { type: wheel, name })) }
      channels[c.name] = { ...base, capabilities: starts.map((from, k): OflCapability => ({ dmxRange: [from, k === n - 1 ? 255 : starts[k + 1] - 1], type: 'WheelSlot', slotNumber: k + 1 })) }
      continue
    }
    const color = COLOR_CHANNELS[c.name]
    const angle = c.name === 'Pan' ? head?.pan ?? 540 : c.name === 'Tilt' ? head?.tilt ?? 270 : null
    channels[c.name] = { ...base, capability: color ? { type: 'ColorIntensity', color } : angle ? { type: c.name, angleStart: '0deg', angleEnd: `${angle}deg` } : NAMED[c.name] ?? { type: 'Generic' } }
  }
  return {
    name: p.label,
    categories: head ? ['Moving Head'] : ['Color Changer'],
    physical: { lens: { degreesMinMax: head ? [20, 20] : [72, 72] } },
    ...(Object.keys(wheels).length ? { wheels } : {}),
    availableChannels: channels,
    modes: [{ name: `${names.length}-channel`, channels: names }],
  }
}

export const migrateProfiles = (raw: unknown[]): StoredProfile[] => raw.map((p) => (isLegacy(p) ? { id: p.id, fixture: legacyFixture(p) } : p as StoredProfile))

const legacyNames = (raw: unknown[]): Record<string, string[]> => ({ ...BUILT_IN, ...Object.fromEntries(raw.filter(isLegacy).map((p) => [p.id, p.channels.map((c) => c.name)])) })

const partOf = (ch: ModeChannel) => ('part' in ch.encoding ? ch.encoding.part : undefined)

function attributes(show: Show, names: Record<string, string[]>, profiles: StoredProfile[]): Show {
  const legacy = show.blocks.filter((b): b is FixtureBlock | LightBlock | GroupBlock => hasProfile(b) && Array.isArray(b.values))
  if (!legacy.length) return show
  const compiled = (id: string) => {
    const p = [...FIXTURES, ...profiles].find((x) => x.id === id)
    return p && compiledOf(p)
  }
  const channelsOf = (id: string) => new Map((names[id] ?? []).map((n, i) => [n, compiled(id)?.modes[0].channels[i]]))
  const keyed = (id: string, v: Values) => {
    const chans = channelsOf(id)
    return Object.fromEntries(Object.entries(v).flatMap(([n, x]) => {
      const ch = chans.get(n)
      return ch && (ch.encoding.type === 'fixed' || partOf(ch) === 'fine') ? [] : [[ch?.key ?? n, x]]
    }))
  }
  const valuesOf = (id: string, arr: number[]) => {
    const chans = channelsOf(id)
    const out: Values = {}
    const fine: Values = {}
    ;(names[id] ?? []).forEach((n, i) => {
      const ch = chans.get(n)
      if (!ch || ch.encoding.type === 'fixed' || arr[i] === undefined) return
      if (partOf(ch) === 'fine') fine[ch.key] = arr[i]
      else out[ch.key] = arr[i]
    })
    for (const [k, f] of Object.entries(fine)) if (f > 0 && out[k] !== undefined) out[k] = (Math.round(out[k] * 255) * 256 + Math.round(f * 255)) / 65535
    return out
  }
  const blocks = show.blocks.map((b): Block => {
    if (!hasProfile(b) || !legacy.includes(b)) return b
    const arr = b.values as unknown as number[]
    const values = valuesOf(b.profile, arr)
    if (b.kind === 'fixture') {
      const modes = compiled(b.profile)?.modes ?? []
      return { ...b, values, mode: (modes.find((m) => m.channels.length === arr.length) ?? modes[0])?.name ?? '' }
    }
    const hidden = b.hidden ? { hidden: b.hidden.map((h) => channelsOf(b.profile).get(h)?.key ?? h) } : {}
    if (b.kind === 'light') return { ...b, ...hidden, values, positions: (b.positions ?? []).map((p) => ({ ...p, values: keyed(b.profile, p.values) })) }
    const members = (m: Aims) => Object.fromEntries(Object.entries(m ?? {}).map(([k, a]) => [k, keyed(b.profile, a)]))
    return { ...b, ...hidden, values, aims: members(b.aims), positions: (b.positions ?? []).map((p) => ({ ...p, members: members(p.members) })) }
  })
  const wires = show.wires.map((w) => {
    const to = legacy.find((b) => b.id === w.to)
    const key = to && to.kind !== 'fixture' ? channelsOf(to.profile).get(w.port)?.key : undefined
    return key ? { ...w, port: key } : w
  })
  return { ...show, blocks, wires }
}

export function normalize(raw: Partial<Show>): Show {
  const profiles = migrateProfiles(raw.profiles ?? [])
  const names = legacyNames(raw.profiles ?? [])
  const migrated = attributes(explode(lift(controllers(migrate({ ...EMPTY_SHOW, ...raw } as Legacy)), names)), names, profiles)
  const blocks = migrated.blocks.map((b) => {
    const sized = { ...b, w: b.w ?? NODE_W }
    if (sized.kind === 'light' || sized.kind === 'group') sized.positions = sized.positions ?? []
    if (sized.kind === 'group') sized.aims = sized.aims ?? {}
    if (sized.kind === 'fade') sized.curve = sized.curve ?? 'linear'
    if (sized.kind === 'scene' && sized.fadeIn === undefined) {
      const { fade, ...rest } = sized as typeof sized & { fade?: number }
      return { ...rest, fadeIn: fade ?? 0.5, fadeOut: fade ?? 0.5 }
    }
    if (sized.kind === 'pattern' || sized.kind === 'looks' || sized.kind === 'sequence' || sized.kind === 'group') sized.every = sized.every ?? 1
    if (sized.kind === 'pattern') sized.advance = sized.advance ?? 'step'
    if (sized.kind === 'pattern' || sized.kind === 'group') sized.floor = sized.floor ?? 0
    if (sized.kind === 'blt') Object.assign(sized, { songs: sized.songs ?? [], master: sized.master ?? true })
    if (sized.kind === 'drop') sized.beats = sized.beats ?? 12
    if (sized.kind === 'strip') Object.assign(sized, { stops: sized.stops ?? [{ at: 0, color: '#ff2060' }, { at: 1, color: '#2060ff' }], spread: sized.spread ?? 0, along: sized.along ?? 'tube' })
    if (sized.kind === 'tube') sized.length = sized.length ?? Math.round(pathLength(sized.path) * 1000) / 1000
    if (sized.kind === 'looks') sized.scenes = sized.scenes.map(({ level, ...s }: Scene & { level?: number }) => ({ ...s, window: s.window ?? [0, level ?? 1] }))
    if (sized.kind === 'audio') Object.assign(sized, { channels: sized.channels ?? Math.max(2, raw.cables?.filter((c) => c.to === sized.id).length ?? 0), stereo: sized.stereo ?? false })
    if (sized.kind === 'combine' || sized.kind === 'split') {
      const { channels: _channels, names, ...rest } = sized as typeof sized & { channels?: number; names?: string[] | Record<string, string> }
      return (sized.kind === 'split' ? rest : { ...rest, names: Array.isArray(names) ? Object.fromEntries(names.flatMap((n, i) => (n.trim() ? [[`s${i + 1}`, n]] : []))) : names ?? {} }) as Block
    }
    if (sized.kind === 'audioslice') Object.assign(sized, { apiPort: sized.apiPort ?? 8722, token: sized.token ?? '', smoothing: sized.smoothing ?? 0 })
    return sized
  })
  const draft: Show = setsFromTubes({ ...migrated, blocks, ...(raw.rails ? { rails: raw.rails } : {}), ...(profiles.length ? { profiles } : {}), ...(raw.responses ? { responses: Object.fromEntries(Object.entries(raw.responses).map(([id, r]) => [id, multiplierOf(r)])) } : {}), designs: raw.designs ?? [], floors: raw.floors?.length ? raw.floors : [FLOOR_1], ...(raw.visualiser ? { visualiser: raw.visualiser } : {}) })
  const used = new Map<string, number>()
  const cables = draft.cables.map((c) => {
    if (c.port !== 'in' || draft.blocks.find((b) => b.id === c.to)?.kind !== 'audio') return c
    const k = (used.get(c.to) ?? 0) + 1
    used.set(c.to, k)
    return { ...c, port: `in${k}` }
  })
  const sized: Show = { ...draft, cables, blocks: draft.blocks.map((b) => ({ ...b, h: blockHeight(b, draft) })) }
  const audioOut = (w: Wire) => w.fromPort === 'out' && sized.blocks.find((b) => b.id === w.from)?.kind === 'audio'
  const wires = sized.wires.flatMap((w) => {
    const target = sized.blocks.find((b) => b.id === w.to)
    const source = sized.blocks.find((b) => b.id === w.from)
    if (!target || !source) return []
    const ports = inputPorts(target, sized)
    const port = w.port ?? (ports.length === 1 ? ports[0].id : undefined)
    const fromPort = audioOut(w) ? outputPorts(source, sized)[0]?.id ?? 'out' : w.fromPort ?? 'out'
    if (!port || !hasInput(target, port, sized) || !outputPorts(source, sized).some((p) => p.id === fromPort)) return []
    const scene = w.scene ?? source.scene ?? target.scene
    return [{ ...w, port, fromPort, ...(scene ? { scene } : {}) }]
  })
  return railInputs(pruneCables({ ...sized, wires }))
}

function railInputs(show: Show): Show {
  let next = show
  for (const x of show.blocks) {
    const scene = show.blocks.find((b) => b.id === x.scene)
    if (x.kind !== 'input' || scene?.kind !== 'scene') continue
    const feeds = next.wires.filter((w) => w.to === scene.id && w.port === x.id)
    const src = feeds.length === 1 && !feeds[0].scene ? next.blocks.find((b) => b.id === feeds[0].from) : undefined
    if (!src || src.scene || !SOURCE_KINDS.includes(src.kind) || outputPorts(src, next).find((p) => p.id === feeds[0].fromPort)?.type !== x.type) continue
    const wires = next.wires.flatMap((w) => (w === feeds[0] ? [] : w.from === x.id ? [{ ...w, from: src.id, fromPort: feeds[0].fromPort }] : [w]))
    const blocks = next.blocks.filter((b) => b.id !== x.id)
    next = { ...next, wires, blocks: blocks.map((b) => (b.id === scene.id ? { ...b, h: blockHeight(b, { ...next, blocks }) } : b)) }
  }
  return next
}
