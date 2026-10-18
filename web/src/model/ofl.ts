export const ATTRIBUTES = ['intensity', 'red', 'green', 'blue', 'white', 'amber', 'uv', 'cyan', 'magenta', 'yellow', 'hue', 'saturation', 'strobe', 'pan', 'tilt', 'panTiltSpeed', 'colorWheel', 'gobo', 'zoom', 'focus', 'raw'] as const
export type Attribute = (typeof ATTRIBUTES)[number]

export type Slot = { name: string; from: number; to: number; color?: string }
export type Part = 'coarse' | 'fine'
export type Encoding =
  | { type: 'plain' | 'dimmed' | 'hue' | 'saturation' | 'brightness'; part?: Part; from: number; to: number }
  | { type: 'wheel'; slots: Slot[] }
  | { type: 'strobe'; off: number; from: number; to: number }
  | { type: 'fixed'; dmx: number }
export type ModeChannel = { key: string; attribute: Attribute; encoding: Encoding; default: number; label: string }
export type CompiledMode = { name: string; channels: ModeChannel[] }
export type Attr = { key: string; attribute: Attribute; label: string; default: number; options?: string[] }
export type Sim = { kind: 'par' | 'head' | 'bar'; beam: number; pan: number; tilt: number }

export type OflCapability = { type: string; dmxRange?: [number, number]; color?: string; shutterEffect?: string; slotNumber?: number; wheel?: string; angleStart?: string; angleEnd?: string; speedStart?: string; speedEnd?: string; comment?: string }
export type OflChannel = { name?: string; defaultValue?: number | string; fineChannelAliases?: string[]; dmxValueResolution?: string; capability?: OflCapability; capabilities?: OflCapability[] }
export type OflSlot = { type: string; name?: string; colors?: string[] }
export type OflInsert = { insert: 'matrixChannels'; repeatFor: string | string[]; channelOrder: 'perPixel' | 'perChannel'; templateChannels: (string | null)[] }
export type OflMode = { name: string; shortName?: string; channels: (string | null | OflInsert)[] }
export type OflMatrix = { pixelCount?: [number, number, number]; pixelKeys?: (string | null)[][][]; pixelGroups?: Record<string, unknown> }
export type OflFixture = {
  $schema?: string
  name: string
  shortName?: string
  categories: string[]
  meta?: Record<string, unknown>
  links?: Record<string, string[]>
  physical?: { dimensions?: number[]; lens?: { degreesMinMax?: [number, number] }; [k: string]: unknown }
  wheels?: Record<string, { slots: OflSlot[] }>
  availableChannels?: Record<string, OflChannel>
  templateChannels?: Record<string, OflChannel>
  matrix?: OflMatrix
  modes: OflMode[]
}

export const COLOR_NAMES: Partial<Record<Attribute, string>> = { red: 'Red', green: 'Green', blue: 'Blue', white: 'White', amber: 'Amber', uv: 'UV', cyan: 'Cyan', magenta: 'Magenta', yellow: 'Yellow' }
const BY_COLOR = Object.fromEntries(Object.entries(COLOR_NAMES).map(([a, c]) => [c, a as Attribute]))
const SINGLE: Record<string, Attribute> = { Intensity: 'intensity', Pan: 'pan', Tilt: 'tilt', PanTiltSpeed: 'panTiltSpeed', Zoom: 'zoom', Focus: 'focus' }
const MIXED = new Set<Attribute>(['red', 'green', 'blue', 'white', 'amber', 'uv', 'cyan', 'magenta', 'yellow'])
const RGB: Attribute[] = ['red', 'green', 'blue']

type Lookup = { key: string; channel: OflChannel; fine: number }
type Classified = { attribute: Attribute; encoding: Encoding; default: number; options?: string[]; angle?: number }

const capsOf = (ch: OflChannel) => ch.capabilities ?? (ch.capability ? [{ ...ch.capability, dmxRange: [0, 2 ** bitsOf(ch) - 1] as [number, number] }] : [])
const degrees = (s?: string) => Number.parseFloat(s ?? '') || 0
const SPEED_WORDS: Record<string, number> = { 'slow': 1, 'slow reverse': -1, 'fast': 2, 'fast reverse': -2, 'stop': 0 }
const speed = (s?: string) => SPEED_WORDS[s ?? ''] ?? Number.parseFloat(s ?? '')

export const rawKey = (key: string) => {
  const k = key.replace(/[^A-Za-z0-9]/g, '')
  return /^[A-Za-z]/.test(k) ? k[0].toUpperCase() + k.slice(1) : `Ch${k}`
}

function bitsOf(ch: OflChannel) {
  const res = ch.dmxValueResolution ?? `${8 * ((ch.fineChannelAliases?.length ?? 0) + 1)}bit`
  return Number.parseInt(res)
}

function byte(ch: OflChannel, v: number) {
  return Math.round(v / 2 ** (bitsOf(ch) - 8))
}

function defaultOf(ch: OflChannel) {
  const d = ch.defaultValue
  if (typeof d === 'string') return Math.max(0, Math.min(1, Number.parseFloat(d) / 100))
  return typeof d === 'number' ? d / (2 ** bitsOf(ch) - 1) : 0
}

function slotsOf(fixture: OflFixture, key: string, ch: OflChannel): { slots: Slot[]; colored: boolean } {
  const caps = capsOf(ch).filter((c) => c.type === 'WheelSlot' && Number.isInteger(c.slotNumber))
  let colored = false
  const slots = caps.map((c) => {
    const wheel = fixture.wheels?.[c.wheel ?? ch.name ?? key]
    const slot = wheel?.slots[c.slotNumber! - 1]
    if (slot?.type === 'Color') colored = true
    const name = slot?.name ?? (slot?.type === 'Open' ? 'Open' : `${slot?.type ?? 'Slot'} ${c.slotNumber}`)
    const color = slot?.type === 'Open' ? '#ffffff' : slot?.colors?.[0]
    return { name, from: byte(ch, c.dmxRange![0]), to: byte(ch, c.dmxRange![1]), ...(color ? { color } : {}) }
  })
  return { slots, colored }
}

function strobeOf(ch: OflChannel): Encoding | null {
  const all = capsOf(ch)
  const caps = all.filter((c) => c.type === 'ShutterStrobe')
  const strobes = caps.filter((c) => c.shutterEffect === 'Strobe')
  if (!strobes.length) return null
  const s = strobes.reduce((a, b) => (b.dmxRange![1] - b.dmxRange![0] > a.dmxRange![1] - a.dmxRange![0] ? b : a))
  const open = caps.find((c) => c.shutterEffect === 'Open') ?? all.find((c) => c.type === 'NoFunction')
  const [lo, hi] = [byte(ch, s.dmxRange![0]), byte(ch, s.dmxRange![1])]
  const backwards = speed(s.speedStart) > speed(s.speedEnd)
  const off = open ? byte(ch, open.dmxRange![0]) : lo
  if (off === lo && lo === 0 && hi === 255 && !backwards) return { type: 'plain', from: 0, to: 255 }
  return { type: 'strobe', off, from: backwards ? hi : lo, to: backwards ? lo : hi }
}

function classify(fixture: OflFixture, key: string, ch: OflChannel): Classified {
  const caps = capsOf(ch)
  const def = defaultOf(ch)
  const plain = (attribute: Attribute): Classified => ({ attribute, encoding: { type: 'plain', from: 0, to: 255 }, default: def })
  const types = new Set(caps.filter((c) => c.type !== 'NoFunction').map((c) => c.type))
  const only = types.size === 1 ? [...types][0] : null
  const name = (ch.name ?? key).toLowerCase()
  if (only && SINGLE[only] && caps.length === 1) {
    const c = caps[0]
    const lit = only === 'Intensity' && ch.defaultValue === undefined ? { default: 1 } : {}
    return { ...plain(SINGLE[only]), ...lit, angle: degrees(c.angleEnd) - degrees(c.angleStart) }
  }
  if (only === 'ColorIntensity' && caps.length === 1 && BY_COLOR[caps[0].color ?? '']) return plain(BY_COLOR[caps[0].color!])
  if (only === 'Generic' && caps.length === 1 && (name === 'hue' || name === 'saturation')) return plain(name)
  if (only === 'Generic' && caps.length === 1 && (name === 'value' || name === 'brightness')) return plain('intensity')
  if (only === 'ShutterStrobe') {
    const encoding = strobeOf(ch)
    if (encoding) return { attribute: 'strobe', encoding, default: 0 }
  }
  if (types.has('WheelSlot')) {
    const { slots, colored } = slotsOf(fixture, key, ch)
    if (slots.length > 1) {
      const at = Math.round(def * 255)
      const index = Math.max(0, slots.findIndex((s) => at >= s.from && at <= s.to))
      return { attribute: colored ? 'colorWheel' : 'gobo', encoding: { type: 'wheel', slots }, default: index / (slots.length - 1), options: slots.map((s) => s.name) }
    }
  }
  return plain('raw')
}

function pixelKeys(fixture: OflFixture, repeatFor: string | string[]) {
  if (Array.isArray(repeatFor)) return repeatFor
  const m = fixture.matrix ?? {}
  if (repeatFor === 'eachPixelGroup') return Object.keys(m.pixelGroups ?? {})
  const [nx, ny, nz] = m.pixelCount ?? [m.pixelKeys?.[0]?.[0]?.length ?? 1, m.pixelKeys?.[0]?.length ?? 1, m.pixelKeys?.length ?? 1]
  const axes = [nx > 1, ny > 1, nz > 1].filter(Boolean).length
  const auto = (x: number, y: number, z: number) => (axes === 1 ? `${Math.max(x, y, z)}` : axes === 2 ? `(${nx > 1 ? x : y}, ${nz > 1 ? z : y})` : `(${x}, ${y}, ${z})`)
  const all: { key: string; at: number[] }[] = []
  for (let z = 1; z <= nz; z++) for (let y = 1; y <= ny; y++) for (let x = 1; x <= nx; x++) {
    const key = m.pixelKeys ? m.pixelKeys[z - 1]?.[y - 1]?.[x - 1] : auto(x, y, z)
    if (key) all.push({ key, at: [x, y, z] })
  }
  if (repeatFor === 'eachPixelABC') return all.map((p) => p.key).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const order = repeatFor.replace('eachPixel', '').split('').map((a) => 'XYZ'.indexOf(a))
  return [...all].sort((a, b) => a.at[order[2]] - b.at[order[2]] || a.at[order[1]] - b.at[order[1]] || a.at[order[0]] - b.at[order[0]]).map((p) => p.key)
}

function channelKeys(fixture: OflFixture, mode: OflMode): (string | null)[] {
  return mode.channels.flatMap((c) => {
    if (c === null || typeof c === 'string') return [c]
    const pixels = pixelKeys(fixture, c.repeatFor)
    const fill = (t: string | null, p: string) => (t === null ? null : t.replaceAll('$pixelKey', p))
    return c.channelOrder === 'perPixel' ? pixels.flatMap((p) => c.templateChannels.map((t) => fill(t, p))) : c.templateChannels.flatMap((t) => pixels.map((p) => fill(t, p)))
  })
}

function lookupTable(fixture: OflFixture) {
  const table = new Map<string, Lookup>()
  const add = (key: string, channel: OflChannel) => {
    table.set(key, { key, channel, fine: 0 })
    channel.fineChannelAliases?.forEach((alias, i) => table.set(alias, { key, channel, fine: i + 1 }))
  }
  for (const [key, channel] of Object.entries(fixture.availableChannels ?? {})) add(key, channel)
  return (key: string): Lookup | undefined => {
    const hit = table.get(key)
    if (hit) return hit
    for (const [tkey, channel] of Object.entries(fixture.templateChannels ?? {})) {
      const pattern = new RegExp(`^${tkey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\$pixelKey', '(.+)')}$`)
      const m = key.match(pattern)
      if (!m) continue
      const fill = (s: string) => s.replaceAll('$pixelKey', m[1])
      add(key, { ...channel, ...(channel.name ? { name: fill(channel.name) } : {}), fineChannelAliases: channel.fineChannelAliases?.map(fill) })
      return table.get(key)
    }
    for (const [tkey, channel] of Object.entries(fixture.templateChannels ?? {})) {
      for (const [i, alias] of (channel.fineChannelAliases ?? []).entries()) {
        const pattern = new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\$pixelKey', '(.+)')}$`)
        const m = key.match(pattern)
        if (m) return { key: tkey.replaceAll('$pixelKey', m[1]), channel, fine: i + 1 }
      }
    }
    return undefined
  }
}

export function attributeOf(fixture: OflFixture, key: string): Attribute {
  const ch = fixture.availableChannels?.[key]
  return ch ? classify(fixture, key, ch).attribute : 'raw'
}

export function channelFor(attribute: Attribute, name: string, slots: string[], range: number): { channel: OflChannel; wheel?: OflSlot[] } {
  if (attribute === 'colorWheel' || attribute === 'gobo') {
    const n = Math.max(2, slots.length)
    const names = Array.from({ length: n }, (_, k) => slots[k] || (attribute === 'gobo' && !k ? 'Open' : `Slot ${k + 1}`))
    const starts = names.map((_, k) => Math.round((256 * k) / n))
    return {
      channel: { name, capabilities: starts.map((from, k): OflCapability => ({ dmxRange: [from, k === n - 1 ? 255 : starts[k + 1] - 1], type: 'WheelSlot', slotNumber: k + 1 })) },
      wheel: names.map((s, k) => (attribute === 'gobo' ? (k ? { type: 'Gobo', name: s } : { type: 'Open' }) : { type: 'Color', name: s, ...(CSS[s.toLowerCase()] ? { colors: [CSS[s.toLowerCase()]] } : {}) })),
    }
  }
  const color = COLOR_NAMES[attribute]
  const single: Partial<Record<Attribute, OflCapability>> = {
    intensity: { type: 'Intensity' },
    strobe: { type: 'ShutterStrobe', shutterEffect: 'Strobe' },
    pan: { type: 'Pan', angleStart: '0deg', angleEnd: `${range}deg` },
    tilt: { type: 'Tilt', angleStart: '0deg', angleEnd: `${range}deg` },
    panTiltSpeed: { type: 'PanTiltSpeed' },
    zoom: { type: 'Zoom' },
    focus: { type: 'Focus' },
  }
  if (attribute === 'hue' || attribute === 'saturation') return { channel: { name: attribute === 'hue' ? 'Hue' : 'Saturation', capability: { type: 'Generic' } } }
  return { channel: { name, capability: color ? { type: 'ColorIntensity', color } : single[attribute] ?? { type: 'Generic' } } }
}

const CSS: Record<string, string> = { white: '#ffffff', red: '#ff0000', orange: '#ff8000', yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', blue: '#0000ff', magenta: '#ff00ff', pink: '#ff80c0', purple: '#8000ff', amber: '#ffbf00', uv: '#6000ff' }

export function unresolved(fixture: OflFixture) {
  const lookup = lookupTable(fixture)
  return fixture.modes.flatMap((m) => channelKeys(fixture, m).filter((k): k is string => k !== null && !lookup(k)).map((k) => `${m.name}: unknown channel ${k}`))
}

export type Wheel = { key: string; colors: number[][] }
export type Compiled = { label: string; attrs: Attr[]; modes: CompiledMode[]; sim: Sim; position?: string[]; color: boolean; wheel?: Wheel }

export function compile(fixture: OflFixture): Compiled {
  const lookup = lookupTable(fixture)
  const angles: Partial<Record<Attribute, number>> = {}
  const attrs: Attr[] = []
  const rawKeys = new Map<string, string>()
  const keyOf = (oflKey: string, attribute: Attribute) => {
    if (attribute !== 'raw') return attribute
    if (!rawKeys.has(oflKey)) {
      const base = rawKey(oflKey)
      let k = base
      for (let n = 2; [...rawKeys.values()].includes(k) || (ATTRIBUTES as readonly string[]).includes(k); n++) k = `${base}${n}`
      rawKeys.set(oflKey, k)
    }
    return rawKeys.get(oflKey)!
  }
  const want = (a: Attr) => { if (!attrs.some((x) => x.key === a.key)) attrs.push(a) }
  const modes = fixture.modes.map((mode): CompiledMode => {
    const keys = channelKeys(fixture, mode)
    const found = keys.map((k) => (k === null ? undefined : lookup(k)))
    const channels = keys.map((k, i): ModeChannel => {
      const hit = found[i]
      const label = k ?? 'unused'
      if (!hit) return { key: rawKey(label), attribute: 'raw', encoding: { type: 'fixed', dmx: 0 }, default: 0, label }
      const c = classify(fixture, hit.key, hit.channel)
      if (c.angle) angles[c.attribute] = c.angle
      const key = keyOf(hit.key, c.attribute)
      const coarse = found.some((f) => f && f.key === hit.key && f.fine === 0)
      const wide = hit.channel.fineChannelAliases?.some((alias) => keys.includes(alias))
      if (hit.fine > 1 || (hit.fine && (!coarse || c.encoding.type !== 'plain'))) return { key, attribute: c.attribute, encoding: { type: 'fixed', dmx: 0 }, default: 0, label }
      const encoding: Encoding = c.encoding.type === 'plain' && (hit.fine || wide) ? { ...c.encoding, part: hit.fine ? 'fine' : 'coarse' } : c.encoding
      if (!hit.fine) want({ key, attribute: c.attribute, label: hit.channel.name ?? hit.key, default: c.default, ...(c.options ? { options: c.options } : {}) })
      return { key, attribute: c.attribute, encoding, default: c.default, label }
    })
    const has = (a: Attribute) => channels.some((ch) => ch.attribute === a)
    const hsv = has('hue')
    if ((hsv || channels.some((ch) => MIXED.has(ch.attribute))) && !has('intensity')) want({ key: 'intensity', attribute: 'intensity', label: 'Intensity', default: 1 })
    if (hsv) {
      const hue = channels.find((ch) => ch.attribute === 'hue')!.default
      const sat = channels.find((ch) => ch.attribute === 'saturation')?.default ?? 0
      hsvToRgb(hue, sat, 1).forEach((v, i) => want({ key: RGB[i], attribute: RGB[i], label: COLOR_NAMES[RGB[i]]!, default: v }))
    }
    return {
      name: mode.name,
      channels: channels.map((ch) => {
        const e = ch.encoding
        if (e.type !== 'plain') return ch
        if (hsv && (ch.attribute === 'hue' || ch.attribute === 'saturation')) return { ...ch, encoding: { ...e, type: ch.attribute } }
        if (hsv && ch.attribute === 'intensity') return { ...ch, encoding: { ...e, type: 'brightness' } }
        if (!has('intensity') && MIXED.has(ch.attribute)) return { ...ch, encoding: { ...e, type: 'dimmed' } }
        return ch
      }),
    }
  })
  const engine = attrs.filter((a) => a.attribute !== 'hue' && a.attribute !== 'saturation')
  const position = engine.filter((a) => a.attribute === 'pan' || a.attribute === 'tilt').map((a) => a.key)
  const mixes = RGB.every((a) => engine.some((x) => x.attribute === a))
  const slots = modes.flatMap((m) => m.channels).find((ch) => ch.attribute === 'colorWheel')?.encoding
  const wheel = slots?.type === 'wheel' && slots.slots.every((s) => s.color) ? { key: 'colorWheel', colors: slots.slots.map((s) => hexRgb(s.color!)) } : undefined
  const cats = fixture.categories ?? []
  const kind = position.length || cats.includes('Moving Head') || cats.includes('Scanner') ? 'head' : cats.includes('Pixel Bar') ? 'bar' : 'par'
  const lens = fixture.physical?.lens?.degreesMinMax
  return {
    label: fixture.name,
    attrs: engine,
    modes,
    sim: { kind, beam: lens ? (lens[0] + lens[1]) / 2 : kind === 'head' ? 20 : 72, pan: angles.pan || 540, tilt: angles.tilt || 270 },
    ...(position.length ? { position } : {}),
    color: mixes,
    ...(wheel && !mixes ? { wheel } : {}),
  }
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h * 6) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [f(5), f(3), f(1)]
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const v = Math.max(r, g, b)
  const d = v - Math.min(r, g, b)
  const h = !d ? 0 : v === r ? ((g - b) / d + 6) % 6 : v === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, v ? d / v : 0, v]
}

const clip = (v: number) => Math.max(0, Math.min(1, v))

export function encode(mode: CompiledMode, values: Record<string, number>): number[] {
  const at = (k: string) => clip(values[k] ?? 0)
  const [h, s] = rgbToHsv(at('red'), at('green'), at('blue'))
  return mode.channels.map(({ key, encoding: e }) => {
    if (e.type === 'fixed') return e.dmx
    if (e.type === 'wheel') return e.slots[Math.round(at(key) * (e.slots.length - 1))]?.from ?? 0
    if (e.type === 'strobe') return at(key) > 0 ? Math.round(e.from + at(key) * (e.to - e.from)) : e.off
    const f = e.type === 'dimmed' ? at(key) * at('intensity') : e.type === 'hue' ? h : e.type === 'saturation' ? s : e.type === 'brightness' ? at('intensity') * Math.max(at('red'), at('green'), at('blue')) : at(key)
    const n = Math.round(f * 65535)
    return e.part === 'coarse' ? n >> 8 : e.part === 'fine' ? n & 255 : Math.round(e.from + f * (e.to - e.from))
  })
}

export function decode(mode: CompiledMode, dmx: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  const wide: Record<string, number> = {}
  const hsv = [0, 0, 1]
  let wheel: string | undefined
  mode.channels.forEach(({ key, attribute, encoding: e }, i) => {
    const d = dmx[i] ?? 0
    if (e.type === 'fixed') return
    if (e.type === 'wheel') {
      const k = Math.max(0, e.slots.findIndex((s) => d >= s.from && d <= s.to))
      out[key] = k / Math.max(1, e.slots.length - 1)
      if (attribute === 'colorWheel') wheel = e.slots[k]?.color
      return
    }
    if (e.type === 'strobe') {
      out[key] = d === e.off ? 0 : clip((d - e.from) / (e.to - e.from || 1))
      return
    }
    if (e.part) wide[key] = (wide[key] ?? 0) + (e.part === 'coarse' ? d * 256 : d)
    const v = e.part ? wide[key] / 65535 : clip((d - e.from) / (e.to - e.from || 1))
    if (e.type === 'hue') hsv[0] = v
    else if (e.type === 'saturation') hsv[1] = v
    else out[key] = v
  })
  if (mode.channels.some((ch) => ch.encoding.type === 'hue')) [out.red, out.green, out.blue] = hsvToRgb(hsv[0], hsv[1], 1)
  if (wheel && out.red === undefined) [out.red, out.green, out.blue] = hexRgb(wheel)
  if (out.white) for (const a of RGB) out[a] = clip((out[a] ?? 0) + out.white)
  return out
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
