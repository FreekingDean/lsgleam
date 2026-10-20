import { strToU8, zipSync } from 'fflate'
import type { FixtureProfile } from './fixtures'
import type { Attribute, CompiledMode, ModeChannel, Slot } from './ofl'
import { el, gdtfName, uuidOf, xml, type Node } from './xml'

type Def = { name: string; feature: string; unit?: string; group?: string; main?: string }

const COLOR = (name: string): Def => ({ name, feature: 'Color.RGB', unit: 'ColorComponent', group: 'ColorRGB' })

const DEFS: Partial<Record<Attribute, Def>> = {
  intensity: { name: 'Dimmer', feature: 'Dimmer.Dimmer' },
  red: COLOR('ColorAdd_R'),
  green: COLOR('ColorAdd_G'),
  blue: COLOR('ColorAdd_B'),
  white: COLOR('ColorAdd_W'),
  amber: COLOR('ColorAdd_RY'),
  uv: COLOR('ColorAdd_UV'),
  cyan: COLOR('ColorSub_C'),
  magenta: COLOR('ColorSub_M'),
  yellow: COLOR('ColorSub_Y'),
  hue: { name: 'HSB_Hue', feature: 'Color.HSB', unit: 'Angle', group: 'ColorHSB' },
  saturation: { name: 'HSB_Saturation', feature: 'Color.HSB', unit: 'Percent', group: 'ColorHSB' },
  strobe: { name: 'Shutter1', feature: 'Beam.Beam' },
  pan: { name: 'Pan', feature: 'Position.PanTilt', unit: 'Angle', group: 'PanTilt' },
  tilt: { name: 'Tilt', feature: 'Position.PanTilt', unit: 'Angle', group: 'PanTilt' },
  panTiltSpeed: { name: 'PositionMSpeed', feature: 'Control.Control' },
  colorWheel: { name: 'Color1', feature: 'Color.Color', group: 'ColorRGB' },
  gobo: { name: 'Gobo1', feature: 'Gobo.Gobo', group: 'Gobo1' },
  zoom: { name: 'Zoom', feature: 'Focus.Focus', unit: 'Angle' },
  focus: { name: 'Focus1', feature: 'Focus.Focus' },
}
const STROBE: Def = { name: 'Shutter1Strobe', feature: 'Beam.Beam', unit: 'Frequency', main: 'Shutter1' }
const CONTROL = (n: number): Def => ({ name: `Control${n}`, feature: 'Control.Control' })

type Fn = { def: Def; from: number; dflt: number; phys?: [number, number]; wheel?: string; sets?: Slot[]; name?: string }
type Channel = { def: Def; offsets: number[]; bytes: number; geometry: string; fns: Fn[] }

export const gdtfFile = (p: FixtureProfile) => `lsgleam-${p.id.replace(/[^A-Za-z0-9_-]/g, '_')}.gdtf`
export const gdtfMode = (m: CompiledMode) => gdtfName(m.name)

function cie(hex: string) {
  const lin = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const [r, g, b] = lin
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
  const sum = X + Y + Z || 1
  return sum === 1 && !Y ? '0.312700,0.329000,0.000000' : `${(X / sum).toFixed(6)},${(Y / sum).toFixed(6)},${(Y * 100).toFixed(6)}`
}

function physOf(p: FixtureProfile, a: Attribute): [number, number] | undefined {
  const lens = p.fixture.physical?.lens?.degreesMinMax
  if (a === 'pan') return [-p.sim.pan / 2, p.sim.pan / 2]
  if (a === 'tilt') return [-p.sim.tilt / 2, p.sim.tilt / 2]
  if (a === 'zoom') return lens ? [lens[0], lens[1]] : [p.sim.beam, p.sim.beam]
  if (a === 'hue') return [0, 360]
  if (a === 'saturation') return [0, 100]
  return undefined
}

function channelsOf(p: FixtureProfile, mode: CompiledMode, head: boolean) {
  const out: Channel[] = []
  const seen = new Map<string, number>()
  let controls = 0
  const top = head ? 'Base' : 'Body'
  const place = (def: Def, a: Attribute) => {
    const n = (seen.get(def.name) ?? 0) + 1
    seen.set(def.name, n)
    return n > 1 ? `Beam${n}` : a === 'pan' && head ? 'Yoke' : a === 'tilt' && head ? 'Head' : top
  }
  mode.channels.forEach((ch: ModeChannel, i) => {
    const e = ch.encoding
    if (e.type !== 'fixed' && e.type !== 'wheel' && e.type !== 'strobe' && e.part === 'fine') {
      const coarse = out.find((c) => c.bytes === 2 && c.offsets.length === 1 && c.def === DEFS[ch.attribute])
      if (coarse) return void coarse.offsets.push(i + 1)
    }
    const known = e.type !== 'fixed' && ch.attribute !== 'raw' ? DEFS[ch.attribute] : undefined
    const def = known ?? CONTROL(++controls)
    const geometry = place(def, ch.attribute)
    const byte = Math.round(ch.default * 255)
    if (e.type === 'fixed' || !known) return void out.push({ def, offsets: [i + 1], bytes: 1, geometry, fns: [{ def, from: 0, dflt: e.type === 'fixed' ? e.dmx : byte }] })
    if (e.type === 'wheel') {
      const at = e.slots[Math.round(ch.default * (e.slots.length - 1))]?.from ?? 0
      return void out.push({ def, offsets: [i + 1], bytes: 1, geometry, fns: [{ def, from: 0, dflt: at, wheel: geometry === top ? def.name : `${def.name}_${geometry}`, sets: e.slots }] })
    }
    const strobe = e.type === 'strobe' ? e : ch.attribute === 'strobe' && e.type === 'plain' && !e.part ? { off: 0, from: Math.max(1, e.from), to: e.to } : null
    if (strobe) {
      const lo = Math.min(strobe.from, strobe.to)
      const fns: Fn[] = [{ def, from: strobe.off, dflt: strobe.off, name: 'Open' }, { def: STROBE, from: lo, dflt: lo, phys: strobe.from < strobe.to ? [1, 25] : [25, 1], name: 'Strobe' }]
      return void out.push({ def, offsets: [i + 1], bytes: 1, geometry, fns: fns.filter((f, k) => k || f.from !== lo).sort((a, b) => a.from - b.from) })
    }
    const wide = e.type !== 'strobe' && e.part === 'coarse'
    out.push({ def, offsets: [i + 1], bytes: wide ? 2 : 1, geometry, fns: [{ def, from: wide ? 0 : e.from, dflt: wide ? Math.round(ch.default * 65535) : byte, phys: physOf(p, ch.attribute) }] })
  })
  return out
}

const dmx = (v: number, bytes: number) => `${v}/${bytes}`

function channelNode(c: Channel): Node {
  const fns = c.fns.map((f, k) => el('ChannelFunction', {
    Name: f.name ?? `${f.def.name} ${k + 1}`,
    Attribute: f.def.name,
    DMXFrom: dmx(f.from, c.bytes),
    Default: dmx(f.dflt, c.bytes),
    PhysicalFrom: f.phys?.[0],
    PhysicalTo: f.phys?.[1],
    Wheel: f.wheel,
  }, (f.sets ?? []).map((s, j) => el('ChannelSet', { Name: gdtfName(s.name), DMXFrom: dmx(s.from, 1), WheelSlotIndex: j + 1 }))))
  return el('DMXChannel', { DMXBreak: 1, Offset: c.offsets.join(','), Highlight: 'None', Geometry: c.geometry }, [el('LogicalChannel', { Attribute: c.def.name }, fns)])
}

const at = (z: number) => `{1,0,0,0}{0,1,0,0}{0,0,1,${z}}{0,0,0,1}`

function geometriesOf(p: FixtureProfile, head: boolean, extra: string[]) {
  const angle = p.sim.beam
  const beam = (name: string, z: number) => el('Beam', { Name: name, Model: 'Beam', Position: at(z), LampType: 'LED', PowerConsumption: 100, LuminousFlux: 10000, BeamAngle: angle, FieldAngle: angle, BeamRadius: 0.05, BeamType: head ? 'Spot' : 'Wash' })
  const beams = (z: number) => [beam('Beam', z), ...extra.map((n) => beam(n, z))]
  if (head) return el('Geometries', {}, [el('Geometry', { Name: 'Base', Model: 'Base' }, [el('Axis', { Name: 'Yoke', Model: 'Yoke', Position: at(-0.05) }, [el('Axis', { Name: 'Head', Model: 'Head', Position: at(-0.25) }, beams(-0.151))])])])
  return el('Geometries', {}, [el('Geometry', { Name: 'Body', Model: 'Body' }, beams(p.sim.kind === 'bar' ? -0.061 : -0.111))])
}

function modelsOf(p: FixtureProfile, head: boolean) {
  const m = (Name: string, Length: number, Width: number, Height: number, PrimitiveType: string) => el('Model', { Name, Length, Width, Height, PrimitiveType })
  if (head) return [m('Base', 0.3, 0.3, 0.1, 'Base'), m('Yoke', 0.34, 0.06, 0.26, 'Yoke'), m('Head', 0.22, 0.22, 0.3, 'Head'), m('Beam', 0.16, 0.16, 0.002, 'Cylinder')]
  if (p.sim.kind === 'bar') return [m('Body', 1, 0.14, 0.12, 'Cube'), m('Beam', 0.9, 0.1, 0.002, 'Cube')]
  return [m('Body', 0.32, 0.32, 0.22, 'Cylinder'), m('Beam', 0.24, 0.24, 0.002, 'Cylinder')]
}

export function gdtfXml(p: FixtureProfile, modes: CompiledMode[]) {
  const head = p.sim.kind === 'head'
  const built = modes.map((mode) => ({ mode, channels: channelsOf(p, mode, head) }))
  const all = built.flatMap((b) => b.channels)
  const defs = [...new Map(all.flatMap((c) => c.fns.map((f) => f.def)).map((d) => [d.name, d])).values()]
  const groups = [...new Set(defs.map((d) => d.feature.split('.')[0]))]
  const activation = [...new Set(defs.flatMap((d) => d.group ?? []))]
  const extra = [...new Set(all.map((c) => c.geometry).filter((g) => g.startsWith('Beam')))]
  const wheels = [...new Map(all.flatMap((c) => c.fns.flatMap((f) => (f.wheel ? [[f.wheel, f.sets!] as const] : [])))).entries()]
  const name = gdtfName(p.label)
  const ft = el('FixtureType', { Name: name, ShortName: p.fixture.shortName ?? p.label, LongName: p.label, Manufacturer: 'lsgleam', Description: `${p.label}, exported by lsgleam from its Open Fixture Library profile`, FixtureTypeID: uuidOf(`lsgleam:gdtf:${p.id}`), CanHaveChildren: 'No' }, [
    el('AttributeDefinitions', {}, [
      el('ActivationGroups', {}, activation.map((n) => el('ActivationGroup', { Name: n }))),
      el('FeatureGroups', {}, groups.map((g) => el('FeatureGroup', { Name: g, Pretty: g }, [...new Set(defs.filter((d) => d.feature.startsWith(`${g}.`)).map((d) => d.feature.split('.')[1]))].map((f) => el('Feature', { Name: f }))))),
      el('Attributes', {}, defs.map((d) => el('Attribute', { Name: d.name, Pretty: d.name, ActivationGroup: d.group, Feature: d.feature, MainAttribute: d.main, PhysicalUnit: d.unit ?? 'None' }))),
    ]),
    el('Wheels', {}, wheels.map(([w, slots]) => el('Wheel', { Name: w }, slots.map((s, k) => el('Slot', { Name: gdtfName(s.name) || `Slot ${k + 1}`, Color: cie(s.color ?? '#ffffff') }))))),
    el('PhysicalDescriptions'),
    el('Models', {}, modelsOf(p, head)),
    geometriesOf(p, head, extra),
    el('DMXModes', {}, built.map(({ mode, channels }) => el('DMXMode', { Name: gdtfMode(mode), Geometry: head ? 'Base' : 'Body' }, [el('DMXChannels', {}, channels.map(channelNode)), el('Relations'), el('FTMacros')]))),
  ])
  return xml(el('GDTF', { DataVersion: '1.2' }, [ft]))
}

export const gdtfOf = (p: FixtureProfile, modes: CompiledMode[]) => zipSync({ 'description.xml': strToU8(gdtfXml(p, modes)) })
