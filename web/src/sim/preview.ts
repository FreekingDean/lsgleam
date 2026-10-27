import { COLOR_ATTRS, FIXTURE_PORT, isLight, profileOf, type FixtureBlock, type LightBlock, type GroupBlock, type Show, type StripBlock, type TubeBlock } from '../model/show'
import { valuePairs } from '../model/fixtures'
import { encode } from '../model/ofl'
import { hexToRgb } from '../model/format'
import { simFixtures, simTubes } from '../model/units'
import { tubeGeometry } from '../model/geometry'
import type { DmxValues } from '../td/td'
import { wipeMix, wipeOn, wipeRanks } from '../blocks/group'

export const LAYOUT_DEFAULTS = ''

type Rgb = [number, number, number]

const clip = (v: number) => Math.max(0, Math.min(1, v))
const byte = (v: number) => Math.round(clip(v) * 255)

function interp(x: number, at: number[], ys: number[]) {
  if (x <= at[0]) return ys[0]
  for (let i = 1; i < at.length; i++) if (x <= at[i]) return at[i] === at[i - 1] ? ys[i] : ys[i - 1] + ((x - at[i - 1]) / (at[i] - at[i - 1])) * (ys[i] - ys[i - 1])
  return ys[ys.length - 1]
}

function stripPixels(show: Show, s: StripBlock, t: TubeBlock): Rgb[] {
  const geo = tubeGeometry(show, t)
  const n = t.leds
  const coord = (i: number) => (s.along === 'height' ? geo.height[i] : s.along === 'distance' ? geo.distance[i] : (i + 0.5) / n)
  let pos = s.position + s.spread * (geo.index / Math.max(geo.count, 1))
  if (s.mode !== 'fill') pos = ((pos % 1) + 1) % 1
  const width = Math.max(s.width, 0.001)
  if (s.mode === 'ramp') {
    const stops = s.stops.map((st) => ({ at: st.at, rgb: hexToRgb(st.color) })).sort((a, b) => a.at - b.at)
    return Array.from({ length: n }, (_, i): Rgb => {
      if (!stops.length) return [0, 0, 0]
      const x = (((coord(i) - pos) % 1) + 1) % 1
      return [0, 1, 2].map((ch) => interp(x, stops.map((st) => st.at), stops.map((st) => st.rgb[ch] * s.dimmer))) as Rgb
    })
  }
  const rgb = hexToRgb(s.color).map((v) => v * s.dimmer)
  return Array.from({ length: n }, (_, i): Rgb => {
    const u = coord(i)
    const d = Math.abs(u - pos)
    const mask = s.mode === 'solid' ? 1 : s.mode === 'fill' ? clip(1 - (u - pos) / width) : clip(1 - (s.mode === 'chase' ? Math.min(d, 1 - d) : d) / width)
    return [rgb[0] * mask, rgb[1] * mask, rgb[2] * mask]
  })
}

const valuesOf = (b: FixtureBlock | LightBlock | GroupBlock) => Object.fromEntries(valuePairs(profileOf(b), b.values))

export function previewDmx(show: Show, scene: string): DmxValues {
  const dmx: DmxValues = {}
  const universe = (key: string) => (dmx[key] ??= new Array(512).fill(0))
  const wires = show.wires.filter((w) => scene && w.from === scene && w.port === FIXTURE_PORT)
  for (const f of simFixtures(show)) {
    const fixture = show.blocks.find((b) => b.id === f.key)
    if (fixture?.kind !== 'fixture' || f.universe === null) continue
    const w = wires.find((x) => x.to === f.key)
    const [outId, member] = w ? w.fromPort.split(':') : []
    const out = show.blocks.find((b) => b.id === outId)
    const light = out && isLight(out) ? out : null
    const aims = light?.kind === 'group' && member !== undefined ? light.aims[member] ?? {} : {}
    const aimed = light ? profileOf(light).position ?? [] : []
    const values = { ...valuesOf(fixture), ...(light ? valuesOf(light) : {}), ...Object.fromEntries(aimed.flatMap((k) => (aims[k] === undefined ? [] : [[k, aims[k]]]))) }
    if (light?.kind === 'group' && member !== undefined && wipeOn(light)) wipeMix(light, wipeRanks(show, light)[Number(member)], COLOR_ATTRS.map((a, i) => values[a] ?? (i < 3 ? 1 : 0))).forEach((v, i) => { values[COLOR_ATTRS[i]] = v })
    const u = universe(`${f.node}:${f.universe}`)
    encode(f.mode, values).forEach((v, i) => {
      const at = f.address - 1 + i
      if (at < 512) u[at] = v
    })
  }
  for (const s of simTubes(show)) {
    const tube = show.blocks.find((b): b is TubeBlock => b.id === s.key && b.kind === 'tube')
    if (!tube || !s.addresses) continue
    const strips = wires.filter((w) => w.to === s.key).map((w) => show.blocks.find((b) => b.id === w.fromPort)).filter((b): b is StripBlock => b?.kind === 'strip')
    if (!strips.length) continue
    const layers = strips.map((strip) => stripPixels(show, strip, tube))
    s.addresses.forEach(([key, channel], i) => {
      const u = universe(key)
      for (let ch = 0; ch < 3; ch++) if (channel - 1 + ch < 512) u[channel - 1 + ch] = byte(layers.reduce((sum, l) => sum + l[i][ch], 0) / layers.length)
    })
  }
  return dmx
}
