import { findProfile } from './fixtures'
import { NODE_W, NODE_H, type Placement, type TubeBlock, type TubeDesign, type Block, type Wire, type Show, LAYOUT_KINDS, SHOW_KINDS, isLight, scenesOf, type PaletteItem } from './show'
import { BLT_DEFAULTS, AUDIOSLICE_DEFAULTS } from './catalog'
import { pruneWires, outputPorts, hasInput, blockHeight } from './ports'
import { nextAddress } from './patch'
import { defOf, hasDef } from '../blocks'
import { pruneCables } from './units'

export function placeUnit(show: Show, key: string, sim: Placement, flip?: boolean): Show {
  const b = show.blocks.find((x) => x.id === key)
  return patchBlock(show, b?.kind === 'tube' && b.set ? b.set : key, { sim, ...(flip === undefined ? {} : { flip }) })
}

export type Clip = { blocks: Block[]; wires: Wire[] }

export function copyBlocks(show: Show, ids: string[]): Clip {
  const picked = withInner(show, ids)
  const blocks = show.blocks.filter((b) => picked.has(b.id))
  const fixture = (id: string) => show.blocks.some((b) => b.id === id && b.kind === 'fixture')
  const wires = show.wires.filter((w) => picked.has(w.from) && (picked.has(w.to) || fixture(w.to)))
  return { blocks: structuredClone(blocks), wires: structuredClone(wires) }
}

export function pasteBlocks(show: Show, clip: Clip, tab: string | null): [Show, string[]] {
  let n = show.nextId
  const ids = new Map<string, string>()
  const unscoped = (b: Block) => LAYOUT_KINDS.includes(b.kind) || SHOW_KINDS.includes(b.kind)
  const allowed = clip.blocks.filter((b) => (tab === null ? !b.scene || clip.blocks.some((s) => s.id === b.scene) : !unscoped(b) || clip.blocks.some((s) => s.id === b.scene)))
  for (const b of allowed) ids.set(b.id, `${b.id.replace(/\d+$/, '')}${n++}`)
  const remap = (id: string) => ids.get(id) ?? id
  const remapPort = (port: string) => (port.startsWith('s_') ? `s_${remap(port.slice(2))}` : port.split(':').map((p, i) => (i ? p : remap(p))).join(':'))
  const blocks: Block[] = allowed.map((b) => {
    const scene = b.scene ? (ids.has(b.scene) ? ids.get(b.scene) : tab ?? undefined) : unscoped(b) ? undefined : tab ?? undefined
    const sceneId = scene ? { scene } : {}
    const { scene: _old, ...rest } = b
    return { ...rest, ...sceneId, id: remap(b.id), name: `${b.name} copy`, x: b.x + 40, y: b.y - 40 } as Block
  })
  const fixture = (id: string) => show.blocks.some((b) => b.id === id && b.kind === 'fixture')
  const wires = clip.wires.filter((w) => ids.has(w.from) && (ids.has(w.to) || fixture(w.to))).map((w) => {
    const scene = w.scene ? (ids.has(w.scene) ? ids.get(w.scene) : tab ?? undefined) : undefined
    return { from: remap(w.from), fromPort: remapPort(w.fromPort), to: remap(w.to), port: remapPort(w.port), ...(scene ? { scene } : {}) }
  })
  return [syncSets(pruneWires({ ...show, nextId: n, blocks: [...show.blocks, ...blocks], wires: [...show.wires, ...wires] })), blocks.map((b) => b.id)]
}

const placementless = (b: Block) => {
  const { x: _x, y: _y, sim: _sim, ...rest } = b
  return JSON.stringify(rest)
}

export function diffShows(from: Show, to: Show) {
  const before = new Map(from.blocks.map((b) => [b.id, b]))
  const after = new Map(to.blocks.map((b) => [b.id, b]))
  const removed = from.blocks.filter((b) => !after.has(b.id)).map((b) => b.id)
  const rebuilt: string[] = []
  const moved: Block[] = []
  for (const b of to.blocks) {
    const old = before.get(b.id)
    if (!old) rebuilt.push(b.id)
    else if (placementless(old) !== placementless(b)) rebuilt.push(b.id)
    else if (old.x !== b.x || old.y !== b.y) moved.push(b)
  }
  const key = (w: Wire) => JSON.stringify(w)
  const a = new Set(from.wires.map(key))
  const z = new Set(to.wires.map(key))
  const wires = [...from.wires.filter((w) => !z.has(key(w))), ...to.wires.filter((w) => !a.has(key(w)))]
  const sceneOrder = (s: Show) => scenesOf(s).map((x) => x.id).join(',')
  return { removed, rebuilt, moved, wires, scenes: sceneOrder(from) !== sceneOrder(to), cables: JSON.stringify(from.cables) !== JSON.stringify(to.cables) }
}

export function moveScene(show: Show, id: string, dir: -1 | 1): Show {
  const scenes = scenesOf(show)
  const i = scenes.findIndex((s) => s.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= scenes.length) return show
  const a = show.blocks.indexOf(scenes[i])
  const b = show.blocks.indexOf(scenes[j])
  const blocks = [...show.blocks]
  ;[blocks[a], blocks[b]] = [blocks[b], blocks[a]]
  return { ...show, blocks }
}

export function newBlock(show: Show, item: PaletteItem, x: number, y: number, tab: string | null): [Show, Block] {
  const n = show.nextId
  const base = { x, y, w: NODE_W, h: NODE_H, ...(tab && !LAYOUT_KINDS.includes(item.kind) && !SHOW_KINDS.includes(item.kind) ? { scene: tab } : {}) }
  let block: Block
  if (hasDef(item)) block = defOf(item).create(base, n)
  else switch (item.kind) {
    case 'box':
      block = { ...base, id: `box${n}`, name: `Room ${n}`, kind: 'box', size: [30.48, 9.144, 4], locked: false }
      break
    case 'cdj':
      block = { ...base, id: `cdj${n}`, name: `CDJ ${n}`, kind: 'cdj', player: 1 }
      break
    case 'audio':
      block = { ...base, id: `audio${n}`, name: `audio${n}`, kind: 'audio', device: '', channels: 2, stereo: true }
      break
    case 'dmxin':
      block = { ...base, id: `dmxin${n}`, name: `DMX controller ${n}`, kind: 'dmxin', channels: 8 }
      break
    case 'blt':
      block = { ...base, id: `blt${n}`, name: 'Beat Link Trigger', kind: 'blt', port: 9001, decks: 2, master: true, signals: BLT_DEFAULTS, songs: [] }
      break
    case 'audioslice':
      block = { ...base, id: `as${n}`, name: `as${n}`, kind: 'audioslice', port: 9002, signals: AUDIOSLICE_DEFAULTS, apiPort: 8722, token: '', smoothing: 0 }
      break
    case 'level':
      block = { ...base, id: `level${n}`, name: `level${n}`, kind: 'level', gain: 4, attack: 0.05, release: 0.3 }
      break
    case 'steps':
      block = { ...base, id: `steps${n}`, name: `steps${n}`, kind: 'steps', steps: 4 }
      break
    case 'gate':
      block = { ...base, id: `gate${n}`, name: `gate${n}`, kind: 'gate', threshold: 0.3, rescale: true }
      break
    case 'drop':
      block = { ...base, id: `drop${n}`, name: `drop${n}`, kind: 'drop', threshold: 0.2, beats: 12, cooldown: 8 }
      break
    case 'hold':
      block = { ...base, id: `hold${n}`, name: `hold${n}`, kind: 'hold', beats: 32 }
      break
    case 'range':
      block = { ...base, id: `rng${n}`, name: `rng${n}`, kind: 'range', tame: [0.2, 0.5], wild: [0, 1] }
      break
    case 'sequence':
      block = { ...base, id: `seq${n}`, name: `seq${n}`, kind: 'sequence', values: [1, -1, 2, -1, 1, -2], unit: 0.05, center: 0.5, every: 1 }
      break
    case 'looks':
      block = { ...base, id: `look${n}`, name: `look${n}`, kind: 'looks', scenes: [{ name: 'Q1', color: '#ff4040', window: [0.1, 0.4] }, { name: 'Q2', color: '#4080ff', window: [0.2, 0.8] }], advance: 'trigger', every: 1 }
      break
    case 'pattern':
      block = { ...base, id: `pat${n}`, name: `pat${n}`, kind: 'pattern', slots: 4, mode: 'alternate', advance: 'step', every: 1, floor: 0 }
      break
    case 'fixture': {
      const profile = findProfile(item.profile)
      block = { ...base, id: `fix${n}`, name: `fix${n}`, kind: 'fixture', profile: profile.id, address: nextAddress(show), values: profile.channels.map((c) => c.default) }
      break
    }
    case 'light': {
      const profile = findProfile(item.profile)
      block = { ...base, id: `lt${n}`, name: `${profile.label} out`, kind: 'light', profile: profile.id, values: profile.channels.map((c) => c.default), positions: [] }
      break
    }
    case 'group': {
      const profile = findProfile(item.profile)
      block = { ...base, id: `grp${n}`, name: `${profile.label} group`, kind: 'group', profile: profile.id, size: 4, values: profile.channels.map((c) => c.default), aims: {}, positions: [], mode: 'alternate', advance: 'step', every: 1, floor: 0 }
      break
    }
    case 'artnet':
      block = { ...base, id: `net${n}`, name: `net${n}`, kind: 'artnet', protocol: 'artnet', ip: '255.255.255.255', universes: [0], inputs: [], active: true }
      break
    case 'scene':
      block = { ...base, id: `scene${n}`, name: `Scene ${n}`, kind: 'scene', fadeIn: 0.5, fadeOut: 0.5, w: 260 }
      break
    case 'input':
      block = { ...base, id: `in${n}`, name: `${item.type ?? 'signal'} ${n}`, kind: 'input', type: item.type ?? 'signal' }
      break
    case 'manual':
      block = { ...base, id: `manual${n}`, name: `manual${n}`, kind: 'manual', active: 0 }
      break
    case 'constant':
      block = { ...base, id: `const${n}`, name: `const${n}`, kind: 'constant', type: 'signal', value: 1, pulse: 0 }
      break
    case 'latch':
      block = { ...base, id: `latch${n}`, name: `latch${n}`, kind: 'latch' }
      break
    case 'and':
      block = { ...base, id: `and${n}`, name: `and${n}`, kind: 'and' }
      break
    case 'not':
      block = { ...base, id: `not${n}`, name: `not${n}`, kind: 'not' }
      break
    case 'mix':
      block = { ...base, id: `mix${n}`, name: `mix${n}`, kind: 'mix', type: 'signal' }
      break
    case 'fade':
      block = { ...base, id: `fade${n}`, name: `fade${n}`, kind: 'fade', rise: 0, fall: 4, curve: 'linear' }
      break
    case 'counter':
      block = { ...base, id: `count${n}`, name: `count${n}`, kind: 'counter', max: 3 }
      break
    case 'split':
      block = { ...base, id: `split${n}`, name: `split${n}`, kind: 'split' }
      break
    case 'strip':
      block = { ...base, id: `px${n}`, name: `Pixels ${n}`, kind: 'strip', mode: 'band', color: '#ffffff', stops: [{ at: 0, color: '#ff2060' }, { at: 1, color: '#2060ff' }], spread: 0, along: 'tube', dimmer: 1, position: 0.5, width: 0.2, speed: 0.5 }
      break
    case 'tubeset': {
      const design = show.designs?.find((d) => d.id === item.design)
      if (!design) show = { ...show, designs: [...(show.designs ?? []), { id: `design${n}`, name: `LED tubes ${n}`, tubes: [{ id: 't1', name: 'Tube 1', leds: 60, length: 1, protocol: 'sk9822', path: [[0, 0, 0], [1, 0, 0]] }] }] }
      block = { ...base, id: `tset${n}`, name: design ? `${design.name} ${n}` : `LED tubes ${n}`, kind: 'tubeset', design: design?.id ?? `design${n}` }
      break
    }
    case 'board':
      block = { ...base, id: `board${n}`, name: `Pixel board ${n}`, kind: 'board', protocol: 'sk9822', ip: '192.168.1.50', active: true, outputs: 8, ledsPerOutput: 300, ledsPerUniverse: 150, startUniverse: 0 }
      break
    case 'values':
      block = { ...base, id: `val${n}`, name: `values${n}`, kind: 'values', steps: 4, rows: [{ name: 'min', values: [0.2, 0.15, 0.1, 0] }, { name: 'max', values: [0.6, 0.75, 0.9, 1] }] }
      break
    case 'colors':
      block = { ...base, id: `col${n}`, name: `colours${n}`, kind: 'colors', steps: 4, rows: [{ name: 'main', colors: ['#ff4d00', '#2050ff', '#a040ff', '#ffd000'] }] }
      break
    case 'composite':
      block = { ...base, id: `comp${n}`, name: `Composite ${n}`, kind: 'composite' }
      break
    case 'output':
      block = { ...base, id: `out${n}`, name: `${item.type ?? 'signal'} out ${n}`, kind: 'output', type: item.type ?? 'signal' }
      break
    case 'equals':
      block = { ...base, id: `eq${n}`, name: `eq${n}`, kind: 'equals', value: 0 }
  }
  block.h = blockHeight(block, show)
  const next = { ...show, nextId: n + 1, blocks: [...show.blocks, block] }
  return [syncSets({ ...next, blocks: next.blocks.map((b) => (b.id === block.scene ? { ...b, h: blockHeight(b, next) } : b)) }), block]
}

export function patchBlock(show: Show, id: string, patch: Partial<Block>): Show {
  const blocks = show.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b))
  const block = blocks.find((b) => b.id === id)
  if (!block) return show
  if (block.kind === 'tubeset') return syncSets({ ...show, blocks })
  const next = { ...show, blocks }
  block.h = blockHeight(block, next)
  const outs = outputPorts(block, next)
  const scene = isLight(block) || ['strip', 'input', 'output'].includes(block.kind) ? next.blocks.find((b) => b.id === block.scene) : undefined
  const sceneOuts = scene ? outputPorts(scene, next) : []
  const stale = (w: Wire) => scene !== undefined && w.from === scene.id && w.fromPort.split(':')[0] === id && !sceneOuts.some((p) => p.id === w.fromPort)
  const sized = scene ? next.blocks.map((b) => (b === scene ? { ...b, h: blockHeight(b, next) } : b)) : next.blocks
  return pruneCables(pruneWires({ ...next, blocks: sized, wires: show.wires.filter((w) => (w.from !== id || outs.some((p) => p.id === w.fromPort)) && (w.to !== id || hasInput(block, w.port, next)) && !stale(w)) }))
}

export function removeBlocks(show: Show, ids: string[]): Show {
  const gone = withInner(show, ids)
  const blocks = show.blocks.filter((b) => !gone.has(b.id))
  const scene = (id: string) => show.blocks.some((b) => b.id === id && (b.kind === 'scene' || b.kind === 'composite'))
  return pruneCables(pruneWires({
    ...show,
    blocks,
    wires: show.wires.filter((w) => !gone.has(w.from) && !gone.has(w.to) && !(w.scene && gone.has(w.scene)) && !(scene(w.to) && gone.has(w.port)) && !(scene(w.from) && gone.has(w.fromPort.split(':')[0]))),
  }))
}

export function syncSets(show: Show): Show {
  const wanted = new Map<string, TubeBlock>()
  for (const s of show.blocks) {
    if (s.kind !== 'tubeset') continue
    for (const t of show.designs?.find((d) => d.id === s.design)?.tubes ?? []) {
      const id = `${s.id}${t.id}`
      wanted.set(id, { id, x: s.x, y: s.y, w: NODE_W, h: NODE_H, kind: 'tube', name: `${s.name} ${t.name}`, leds: t.leds, length: t.length, protocol: t.protocol, path: t.path, set: s.id, member: t.id })
    }
  }
  const stale = show.blocks.filter((b) => b.kind === 'tube' && b.set && !wanted.has(b.id)).map((b) => b.id)
  const kept = stale.length ? removeBlocks(show, stale) : show
  const have = new Set(kept.blocks.map((b) => b.id))
  const blocks = [...kept.blocks.map((b) => wanted.get(b.id) ?? b), ...[...wanted.values()].filter((t) => !have.has(t.id))]
  return pruneCables({ ...kept, blocks })
}

export const setDesign = (show: Show, design: TubeDesign): Show => syncSets({ ...show, designs: (show.designs ?? []).map((d) => (d.id === design.id ? design : d)) })

export function withInner(show: Show, ids: string[]) {
  const all = new Set(ids)
  for (let size = -1; size !== all.size;) {
    size = all.size
    for (const b of show.blocks) if ((b.scene && all.has(b.scene)) || (b.kind === 'tube' && b.set && all.has(b.set))) all.add(b.id)
  }
  return all
}
