import { type Patch, type BoardBlock, type StripMode, type StripAlong, type Wire, type Show, SELECTOR_ID, SCENE_PORT, ON_PORT, FIXTURE_PORT, CHANNELS_PORT, isLight, scenesOf, profileOf } from './show'
import { outputPorts, portOf } from './ports'
import { blockDef, boardPlan, chainOf, universesPerOutput } from '../blocks'

export type Source = { from: string; chan: string | null; port: string; scene: number | null; strip?: string; mode?: StripMode; along?: StripAlong; keep?: boolean }

export function sourcesOf(show: Show, id: string): Source[] {
  const block = show.blocks.find((b) => b.id === id)
  if (!block) return []
  const scenes = scenesOf(show)
  if (block.kind === 'input') {
    return show.wires.filter((w) => w.to === block.scene && w.port === id).map((w) => ({ ...via(show, w), port: 'in', scene: null }))
  }
  if (block.kind === 'artnet') {
    return show.blocks.flatMap((f) => {
      const p = patchOf(show, f.id)
      return p?.node === id && block.universes.includes(p.universe) ? [{ from: f.id, chan: null, port: `u${p.universe}`, scene: null }] : []
    })
  }
  if (block.kind === 'tube') {
    const feeds = show.wires.filter((w) => w.to === id && w.port === FIXTURE_PORT).flatMap((w): Source[] => {
      const out = show.blocks.find((b) => b.id === w.fromPort)
      const scene = scenes.findIndex((sc) => sc.id === w.from)
      return out?.kind === 'strip' && scene >= 0 ? [{ from: out.id, chan: null, port: CHANNELS_PORT, scene, mode: out.mode, along: out.along }] : []
    })
    return feeds.length ? [...feeds, { from: SELECTOR_ID, chan: null, port: SCENE_PORT, scene: scenes.length }] : []
  }
  if (block.kind === 'board') return boardPlan(show, block).sources
  if (block.kind === 'fixture') {
    const feeds = show.wires.filter((w) => w.to === id && w.port === FIXTURE_PORT).flatMap((w): Source[] => {
      const [outId, member] = w.fromPort.split(':')
      const out = show.blocks.find((b) => b.id === outId)
      const scene = scenes.findIndex((sc) => sc.id === w.from)
      if (!out || !isLight(out) || scene < 0) return []
      if (out.kind === 'light') return [{ from: out.id, chan: null, port: CHANNELS_PORT, scene }]
      const m = `m${Number(member) + 1}_`
      return [{ from: out.id, chan: `${m}*`, strip: m, port: CHANNELS_PORT, scene }]
    })
    return feeds.length ? [...feeds, { from: SELECTOR_ID, chan: null, port: SCENE_PORT, scene: scenes.length }] : []
  }
  return show.wires.filter((w) => w.to === id).map((w) => ({ ...via(show, w), port: w.port, scene: null, ...(blockDef(block.kind)?.slotted || ['color', 'multi'].includes(portOf(show, w)?.type ?? '') ? { keep: true } : {}) }))
}

function chanOf(show: Show, w: Wire) {
  const from = show.blocks.find((b) => b.id === w.from)
  if (!from) return null
  const outs = outputPorts(from, show)
  const port = outs.find((p) => p.id === w.fromPort)
  return port?.chans ?? (outs.length > 1 ? w.fromPort : null)
}

function stripOf(show: Show, w: Wire) {
  const from = show.blocks.find((b) => b.id === w.from)
  const strip = from && outputPorts(from, show).find((p) => p.id === w.fromPort)?.strip
  return strip ? { strip } : {}
}

export function unitPatch(show: Show, key: string, seen = new Set<string>()): Patch | null {
  const c = show.cables.find((x) => x.to === key && x.port === 'in')
  if (!c || seen.has(c.from)) return null
  seen.add(c.from)
  if (show.blocks.find((b) => b.id === c.from)?.kind === 'artnet') return { node: c.from, universe: Number(c.fromPort.slice(1)) }
  return unitPatch(show, c.from, seen)
}

export type PixelPatch = { board: string; output: number; offset: number }

export function tubePatch(show: Show, id: string): PixelPatch | null {
  let offset = 0
  for (let key = id, n = 0; n < 1000; n++) {
    const c = show.cables.find((x) => x.to === key && x.port === 'in')
    const from = c && show.blocks.find((b) => b.id === c.from)
    if (from?.kind === 'board') return { board: from.id, output: Number(c!.fromPort.slice(1)), offset }
    if (from?.kind !== 'tube') return null
    offset += from.leds
    key = from.id
  }
  return null
}

export function pixelAddress(b: BoardBlock, output: number, led: number) {
  return { universe: b.startUniverse + (output - 1) * universesPerOutput(b) + Math.floor(led / b.ledsPerUniverse), channel: (led % b.ledsPerUniverse) * 3 + 1 }
}

export function patchOf(show: Show, id: string): Patch | null {
  return show.blocks.find((x) => x.id === id)?.kind === 'fixture' ? unitPatch(show, id) : null
}

export function selectorSources(show: Show) {
  return scenesOf(show).map((s, k) => show.wires.filter((w) => w.to === s.id && w.port === ON_PORT).map((w) => ({ ...via(show, w), port: `on${k}`, scene: null as number | null })))
}

export function dependentsOf(show: Show, id: string): string[] {
  const out = new Set<string>()
  for (const b of show.blocks) if (sourcesOf(show, b.id).some((src) => src.from === id)) out.add(b.id)
  if (selectorSources(show).some((srcs) => srcs.some((src) => src.from === id))) out.add(SELECTOR_ID)
  return [...out]
}

export function downstream(show: Show, ids: string[]): string[] {
  const closure = new Set(ids)
  const queue = [...ids]
  while (queue.length) for (const d of dependentsOf(show, queue.shift()!)) if (!closure.has(d)) { closure.add(d); queue.push(d) }
  const deps = (id: string) => {
    if (id === SELECTOR_ID) return selectorSources(show).flat().map((src) => src.from)
    return sourcesOf(show, id).map((src) => src.from)
  }
  const order: string[] = []
  const pending = new Set(closure)
  while (pending.size) {
    const ready = [...pending].filter((id) => !deps(id).some((d) => pending.has(d) && d !== id))
    for (const id of ready.length ? ready : [...pending]) { order.push(id); pending.delete(id) }
  }
  return order
}

export function repatch(show: Show): Show {
  const addresses = new Map<string, number>()
  for (const node of show.blocks) {
    if (node.kind !== 'artnet') continue
    for (const u of node.universes) {
      let next = 1
      for (const key of chainOf(show, node.id, u)) {
        const b = show.blocks.find((x) => x.id === key)
        if (b?.kind !== 'fixture') continue
        addresses.set(key, next)
        next += profileOf(b).channels.length
      }
    }
  }
  const blocks = show.blocks.map((b) => {
    return b.kind === 'fixture' ? { ...b, address: addresses.get(b.id) ?? b.address } : b
  })
  return { ...show, blocks }
}

function via(show: Show, w: Wire) {
  const from = show.blocks.find((b) => b.id === w.from)
  return from?.kind === 'composite' ? { from: w.fromPort, chan: null } : { from: w.from, chan: chanOf(show, w), ...stripOf(show, w) }
}
