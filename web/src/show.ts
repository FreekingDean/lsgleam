import { allProfiles, findProfile, type FixtureProfile } from './fixtures'

export const NODE_W = 160
export const NODE_H = 130

type Base = { id: string; name: string; x: number; y: number; w: number; h: number; scene?: string; hidden?: string[]; sim?: Placement; flip?: boolean }

export type Position = { name: string; values: Record<string, number> }

export type AudioBlock = Base & { kind: 'audio'; device: string; channels: number; stereo: boolean }
export type DmxInBlock = Base & { kind: 'dmxin'; channels: number }
export type BltBlock = Base & { kind: 'blt'; port: number; decks: number; master: boolean; signals: string[]; songs: string[] }
export type AudioSliceBlock = Base & { kind: 'audioslice'; port: number; signals: string[]; apiPort: number; token: string; smoothing: number }
export type LevelBlock = Base & { kind: 'level'; gain: number; attack: number; release: number }
export type StepsBlock = Base & { kind: 'steps'; steps: number }
export type GateBlock = Base & { kind: 'gate'; threshold: number; rescale: boolean }
export type PatternMode = 'all' | 'alternate' | 'alternate2' | 'chase' | 'outsidein' | 'fillin' | 'fillout'
export type PatternAdvance = 'step' | 'trigger'
export type DropBlock = Base & { kind: 'drop'; threshold: number; beats: number; cooldown: number }
export type Scene = { name: string; color: string; window: [number, number] }
export type LooksBlock = Base & { kind: 'looks'; scenes: Scene[]; advance: PatternAdvance; every: number }
export type HoldBlock = Base & { kind: 'hold'; beats: number }
export type RangeBlock = Base & { kind: 'range'; tame: [number, number]; wild: [number, number] }
export type SequenceBlock = Base & { kind: 'sequence'; values: number[]; unit: number; center: number; every: number }
export type PatternBlock = Base & { kind: 'pattern'; slots: number; mode: PatternMode; advance: PatternAdvance; every: number; floor: number }
export type Placement = { position: [number, number, number]; rotation: [number, number, number] }
export type Patch = { node: string; universe: number }
export type FixtureBlock = Base & { kind: 'fixture'; profile: string; address: number; values: number[] }
export type LightBlock = Base & { kind: 'light'; profile: string; values: number[]; positions: Position[] }
export type Aims = Record<string, Record<string, number>>
export type GroupPosition = { name: string; members: Aims }
export type GroupBlock = Base & { kind: 'group'; profile: string; size: number; values: number[]; aims: Aims; positions: GroupPosition[]; mode: PatternMode; advance: PatternAdvance; every: number; floor: number }
export type ArtnetBlock = Base & { kind: 'artnet'; protocol: 'artnet' | 'sacn'; ip: string; universes: number[]; inputs: number[]; active: boolean }
export type SceneBlock = Base & { kind: 'scene'; fadeIn: number; fadeOut: number }
export type InputType = 'signal' | 'index' | 'audio' | 'number' | 'color'
export const INPUT_TYPES: InputType[] = ['signal', 'index', 'audio', 'number', 'color']
export type ColorRow = { name: string; colors: string[] }
export type ColorsBlock = Base & { kind: 'colors'; steps: number; rows: ColorRow[] }
export type ValueRow = { name: string; values: number[] }
export type ValuesBlock = Base & { kind: 'values'; steps: number; rows: ValueRow[] }
export type InputBlock = Base & { kind: 'input'; type: InputType }
export type OutputBlock = Base & { kind: 'output'; type: InputType }
export type CompositeBlock = Base & { kind: 'composite' }
export type ManualBlock = Base & { kind: 'manual'; active: number }
export type EqualsBlock = Base & { kind: 'equals'; value: number }
export type LatchBlock = Base & { kind: 'latch' }
export type AndBlock = Base & { kind: 'and' }
export type NotBlock = Base & { kind: 'not' }
export type MixBlock = Base & { kind: 'mix'; type: 'signal' | 'color' }
export type FadeBlock = Base & { kind: 'fade'; rise: number; fall: number; curve: 'linear' | 'smooth' }
export type CounterBlock = Base & { kind: 'counter'; max: number }
export type ConstantBlock = Base & { kind: 'constant'; type: 'signal' | 'index'; value: number; pulse: number }
export type CdjBlock = Base & { kind: 'cdj'; player: number }
export type BoxBlock = Base & { kind: 'box'; size: [number, number, number]; locked: boolean }
export type Point = [number, number, number]
export type TubeBlock = Base & { kind: 'tube'; leds: number; length: number; protocol: string; path: Point[]; set?: string; member?: string }
export type DesignTube = { id: string; name: string; leds: number; length: number; protocol: string; path: Point[] }
export type TubeDesign = { id: string; name: string; tubes: DesignTube[] }
export type TubeSetBlock = Base & { kind: 'tubeset'; design: string }
export type BoardBlock = Base & { kind: 'board'; protocol: string; ip: string; active: boolean; outputs: number; ledsPerOutput: number; ledsPerUniverse: number; startUniverse: number }
export const PIXEL_PROTOCOLS = ['sk9822', 'apa102', 'ws2812', 'ws2811']
export type StripMode = 'solid' | 'band' | 'fill' | 'chase' | 'ramp'
export const STRIP_MODES: StripMode[] = ['solid', 'band', 'fill', 'chase', 'ramp']
export type ColorStop = { at: number; color: string }
export type StripAlong = 'tube' | 'height' | 'distance'
export const STRIP_ALONG: Record<StripAlong, string> = { tube: 'each tube, from its start', height: 'height, across the whole design', distance: 'distance from the base' }
const STRIP_USES: Record<StripMode, string[]> = { solid: ['color', 'dimmer'], band: ['color', 'dimmer', 'position', 'width', 'spread'], fill: ['color', 'dimmer', 'position', 'width', 'spread'], chase: ['color', 'dimmer', 'position', 'width', 'speed', 'spread'], ramp: ['dimmer', 'position', 'speed', 'spread', 'stop', 'at'] }
export const stripParams = (b: { stops: ColorStop[] }): Port[] => [color(), typed('dimmer', 'signal'), typed('position', 'signal'), typed('width', 'signal'), typed('speed', 'signal', 'speed (laps/s)'), typed('spread', 'signal', 'spread across tubes'), ...b.stops.flatMap((_, k) => [typed(`stop${k}`, 'color', `stop ${k + 1} colour`), typed(`at${k}`, 'signal', `stop ${k + 1} spot`)])]
export type StripBlock = Base & { kind: 'strip'; mode: StripMode; color: string; stops: ColorStop[]; spread: number; along: StripAlong; dimmer: number; position: number; width: number; speed: number }

export type Block = CompositeBlock | OutputBlock | ValuesBlock | MixBlock | FadeBlock | NotBlock | GateBlock | AudioBlock | DmxInBlock | BltBlock | AudioSliceBlock | LevelBlock | StepsBlock | DropBlock | HoldBlock | RangeBlock | SequenceBlock | LooksBlock | PatternBlock | FixtureBlock | LightBlock | GroupBlock | ArtnetBlock | SceneBlock | InputBlock | ManualBlock | EqualsBlock | ConstantBlock | LatchBlock | AndBlock | CounterBlock | CdjBlock | BoxBlock | ColorsBlock | TubeBlock | TubeSetBlock | BoardBlock | StripBlock
export type Kind = Block['kind']
export type Wire = { from: string; fromPort: string; to: string; port: string; scene?: string }
export type Cable = { from: string; fromPort: string; to: string; port: string }
export type Show = { nextId: number; blocks: Block[]; wires: Wire[]; cables: Cable[]; rails?: Record<string, { x: number; y: number }>; designs?: TubeDesign[]; profiles?: FixtureProfile[]; responses?: Record<string, ColorResponse> }
export type ColorResponse = { multiplier: [number, number, number]; gamma: number }
export const NO_RESPONSE: ColorResponse = { multiplier: [1, 1, 1], gamma: 1 }

export const EMPTY_SHOW: Show = { nextId: 1, blocks: [], wires: [], cables: [] }
export const SELECTOR_ID = 'lsgleam_scene'
export const SCENE_PORT = '__scene'
export const ON_PORT = 'on'
export const FIXTURE_PORT = 'in'
export const CHANNELS_PORT = 'channels'
export const LAYOUT = '__layout'
export const INPUTS_ID = '__inputs'
export const OUTPUTS_ID = '__outputs'
export const SOURCE_KINDS: Kind[] = ['audio', 'dmxin', 'blt', 'audioslice']
export const LAYOUT_KINDS: Kind[] = ['artnet', 'fixture', 'cdj', 'box', 'tube', 'tubeset', 'board', ...SOURCE_KINDS]
const SHOW_KINDS: Kind[] = ['scene', 'manual']
const VIRTUAL_KINDS: Kind[] = ['blt', 'audioslice']
export const isLight = (b: Block): b is LightBlock | GroupBlock => b.kind === 'light' || b.kind === 'group'
export const hasProfile = (b: Block): b is FixtureBlock | LightBlock | GroupBlock => b.kind === 'fixture' || isLight(b)
export const scenesOf = (show: Show) => show.blocks.filter((b): b is SceneBlock => b.kind === 'scene')

export type Port = { id: string; label: string; type: string; hint?: string; chans?: string; strip?: string; profile?: string }

export const TYPE_COLORS: Record<string, string> = { audio: '#e06c6c', signal: '#6cb86c', index: '#f39c12', number: '#9aa5b1', look: '#b07ddc', color: '#ff8fd0', fixture: '#4fb3bf', dmx: '#5c8ed6', pixel: '#ffd24a', pixels: '#ffd24a' }

export const KIND_INFO: Record<Kind, string> = {
  audio: 'Audio device input',
  dmxin: 'DMX controller: cable it into an Art-Net input universe; one signal per fader',
  blt: 'Pioneer decks via Beat Link Trigger (OSC)',
  audioslice: 'Stem energy, hits and beats from AudioSlice (OSC)',
  level: 'Audio loudness (RMS) as a 0–1 signal',
  steps: 'Quantise a signal into N index steps',
  gate: 'Zero below a threshold; above it pass through or rescale to 0–1',
  drop: 'Fires when the kick returns after a quiet stretch',
  hold: 'Holds 1 for N beats after a trigger',
  range: 'Remaps a signal into a min–max window that widens with amount',
  sequence: 'Steps through a list of values on each trigger',
  looks: 'Looks (colour + brightness window), switched by index or trigger',
  pattern: 'Spreads one signal over N slots by a pattern',
  fixture: 'A light in the room, patched on a DMX chain',
  light: 'What this scene sends to every fixture wired to it on the show tab',
  group: 'Spreads a pattern and positions over the fixtures wired to it on the show tab',
  artnet: 'Art-Net / sACN interface: the universes it sends and listens to',
  scene: 'Turns its inputs into fixture outputs, weighted by on',
  input: 'A value this scene or composite takes from outside: one input port on its node',
  output: 'A value this composite sends out: one output port on its node',
  composite: 'Your own block: double-click to build it from inputs, transformers and outputs inside',
  manual: 'Scene select: buttons, or an index that picks scene N',
  equals: '1 when the index equals a value',
  constant: 'A fixed value for testing, optionally pulsing on and off',
  latch: '1 from set until reset',
  and: 'Both signals multiplied: 1 only when both are on',
  not: '1 − signal: on becomes off and off becomes on',
  mix: 'Crossfades two signals or colours: a × (1 − mix) + b × mix',
  fade: 'Ramps a signal linearly: up over the rise time, down over the fall time',
  counter: 'Counts triggers into an index, clamped at max',
  cdj: 'A player sending audio into an audio input',
  box: 'A room, stage or other space with width, depth and height',
  tube: 'An LED tube or strip: LED count, pixel protocol and a 3D shape',
  tubeset: 'LED tubes: one or more tubes in a shape (tree, burst, fan or your own), placed as one; each tube cables separately',
  strip: 'Pixel output: an effect (solid, band, fill, chase, ramp) for every LED tube wired to it on the show tab',
  board: 'Art-Net pixel controller: outputs drive cabled tubes, mapped onto universes',
  values: 'A table of named numbers, one column per index (e.g. per-season minimums)',
  colors: 'A table of named colours, one column per index (e.g. per season)',
}

export const TYPE_INFO: Record<string, string> = {
  audio: 'audio samples',
  signal: '0–1 signal',
  index: 'integer index',
  number: 'raw number',
  look: 'colour + brightness',
  color: 'Red, Green, Blue',
  pixels: 'colour for every LED of a tube',
  dmx: '512 DMX channels',
  fixture: 'every channel of a fixture',
}

const PORT_HINTS: Record<string, string> = {
  position: 'index of a stored position',
  pattern: 'brightness to spread over members',
  nudge: 'added to Pan, 0.5 = no change',
  step: 'which step is active',
  trigger: 'rising edge advances one step (or starts the hold)',
  reset: 'rising edge jumps to the first value',
  next: 'rising edge goes to the next scene',
  scene: 'which scene is active',
  drop: '1 while the drop hits',
  signal: 'input signal',
  drops: 'count of drops so far',
  armed: '1 once the kick has been quiet long enough',
  set: 'rising edge turns the latch on',
  offset: 'added to the look index',
  a: 'first signal',
  b: 'second signal',
  amount: '0 = tame window, 1 = wild window',
  look: 'Red, Green, Blue and Dimmer together',
  dimmer: 'brightness before the look window',
  wild: 'widens the window toward 0–1',
  hold: '1 while holding',
  on: 'scene weight 0–1; unwired takes whatever weight is left',
  in: 'scene outputs driving this fixture, blended by scene weight',
  beat: 'beat within bar, 0–3',
  bpm: 'effective tempo',
  pitch: 'pitch multiplier, 1 = original',
  progress: 'position in the track',
  song: 'index of the playing title in the song list',
  playing: '1 while playing',
  onair: '1 while on air at the mixer',
  master: '1 while this deck is tempo master',
}

export function portHint(p: Port) {
  const key = p.id.replace(/^(d\d+|master)_/, '')
  return `${p.label} · ${TYPE_INFO[p.type] ?? p.type}${PORT_HINTS[key] ? ` · ${PORT_HINTS[key]}` : ''}`
}


export type PaletteItem = { kind: 'light'; profile: string } | { kind: 'box' } | { kind: 'cdj' } | { kind: 'audio' } | { kind: 'dmxin' } | { kind: 'blt' } | { kind: 'audioslice' } | { kind: 'level' } | { kind: 'steps' } | { kind: 'gate' } | { kind: 'drop' } | { kind: 'hold' } | { kind: 'range' } | { kind: 'sequence' } | { kind: 'looks' } | { kind: 'pattern' } | { kind: 'fixture'; profile: string } | { kind: 'group'; profile: string } | { kind: 'artnet' } | { kind: 'scene' } | { kind: 'input'; type?: InputType } | { kind: 'output'; type?: InputType } | { kind: 'composite' } | { kind: 'manual' } | { kind: 'equals' } | { kind: 'constant' } | { kind: 'latch' } | { kind: 'and' } | { kind: 'not' } | { kind: 'mix' } | { kind: 'fade' } | { kind: 'counter' } | { kind: 'colors' } | { kind: 'values' } | { kind: 'tubeset'; design?: string } | { kind: 'board' } | { kind: 'strip' }


export const POSITION_PORT = 'position'
export const PATTERN_PORT = 'pattern'
export const LOOK_PORT = 'look'
export const LOOK_CHANS = 'Red Green Blue Dimmer'
export const COLOR_PORT = 'color'
const RGB = ['Red', 'Green', 'Blue']
const hasRgb = (b: LightBlock | GroupBlock) => profileOf(b).channels.some((ch) => ch.name === 'Red')
const color = (): Port => ({ id: COLOR_PORT, label: 'color', type: 'color' })
const LOOK_CHANNELS = ['Red', 'Green', 'Blue', 'Dimmer']
const look = (): Port => ({ id: LOOK_PORT, label: 'look', type: 'look', chans: LOOK_CHANS })
export const NUDGE_PORT = 'nudge'

const FOOT = 0.3048
export function parseLength(text: string) {
  const m = text.trim().toLowerCase().match(/^(-?[\d.]+)\s*(ft|feet|foot|'|m)?$/)
  if (!m || Number.isNaN(Number(m[1]))) return null
  return m[2] && m[2] !== 'm' ? Number(m[1]) * FOOT : Number(m[1])
}
export const formatLength = (m: number) => `${Number(m.toFixed(2))} m (${Number((m / FOOT).toFixed(1))} ft)`

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]
}
export const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`
export const isRgb = (p: FixtureProfile) => RGB.every((n) => p.channels.some((ch) => ch.name === n))
export const responseOf = (show: Show, profile: string) => show.responses?.[profile] ?? NO_RESPONSE
export const toSrgb = (l: number) => (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055)
export const previewLight = (rgb: number[], r: ColorResponse) => {
  const light = rgb.map((v, c) => v ** r.gamma * r.multiplier[c])
  const level = Math.max(...light)
  return { light: light.map((l) => l / Math.max(1, level)), level }
}
export const sequenceValues = (b: SequenceBlock) => (b.values.length ? b.values : [0]).map((v) => b.center + v * b.unit)

export const PATTERN_MODES: PatternMode[] = ['all', 'alternate', 'alternate2', 'chase', 'outsidein', 'fillin', 'fillout']
export const PATTERN_LABELS: Record<PatternMode, string> = { all: 'all', alternate: 'alternate (1 on, 1 off)', alternate2: 'alternate ×2 (2 on, 2 off)', chase: 'chase', outsidein: 'outside in (one pair at a time)', fillin: 'fill in (from the ends to the middle)', fillout: 'fill out (from the middle to the ends)' }

export function patternMasks(mode: PatternMode, slots: number): number[][] {
  const mask = (on: (slot: number) => boolean) => Array.from({ length: slots }, (_, i) => (on(i) ? 1 : 0))
  switch (mode) {
    case 'all': return [mask(() => true)]
    case 'alternate': return [mask((i) => i % 2 === 0), mask((i) => i % 2 === 1)]
    case 'alternate2': return [mask((i) => Math.floor(i / 2) % 2 === 0), mask((i) => Math.floor(i / 2) % 2 === 1)]
    case 'chase': return Array.from({ length: slots }, (_, k) => mask((i) => i === k))
    case 'outsidein': {
      const depth = Math.ceil(slots / 2)
      const ring = (k: number) => mask((i) => i === k || i === slots - 1 - k)
      const inward = Array.from({ length: depth }, (_, k) => ring(k))
      return [...inward, ...inward.slice(1, -1).reverse()]
    }
    case 'fillin': {
      const depth = Math.ceil(slots / 2)
      return Array.from({ length: depth }, (_, k) => mask((i) => Math.min(i, slots - 1 - i) <= k))
    }
    case 'fillout': {
      const depth = Math.ceil(slots / 2)
      return Array.from({ length: depth }, (_, k) => mask((i) => Math.min(i, slots - 1 - i) >= depth - 1 - k))
    }
  }
}

export const BLT_SIGNALS: { id: string; type: string }[] = [
  { id: 'playing', type: 'signal' },
  { id: 'onair', type: 'signal' },
  { id: 'master', type: 'signal' },
  { id: 'beat', type: 'index' },
  { id: 'bpm', type: 'number' },
  { id: 'pitch', type: 'number' },
  { id: 'progress', type: 'signal' },
  { id: 'song', type: 'index' },
]
export const bltDecks = (b: BltBlock) => [...(b.master ? ['master'] : []), ...Array.from({ length: b.decks }, (_, d) => `d${d + 1}`)]
export const BLT_DEFAULTS = ['playing', 'onair', 'beat', 'bpm']

export const AUDIOSLICE_STEMS = ['vocals', 'bass', 'other', 'drums', 'kick', 'snare', 'hihat', 'perc', 'tom', 'audio', 'beat', 'beat_ramp', 'is_music', 'model_beat', 'model_downbeat']
export const AUDIOSLICE_STREAMS: Record<string, number> = { energy: 1, pan: 2, onset: 3, spread: 4, pitch: 5 }
export const AUDIOSLICE_SOURCES: { stem: string; streams: string[] }[] = [
  { stem: 'kick', streams: ['energy', 'onset'] },
  { stem: 'snare', streams: ['energy', 'onset', 'pan', 'spread'] },
  { stem: 'hihat', streams: ['energy', 'onset', 'pan', 'spread'] },
  { stem: 'tom', streams: ['energy', 'onset', 'pan', 'spread'] },
  { stem: 'perc', streams: ['energy', 'onset', 'pan', 'spread'] },
  { stem: 'drums', streams: ['energy'] },
  { stem: 'audio', streams: ['energy', 'onset'] },
  { stem: 'vocals', streams: ['energy', 'pan', 'spread', 'pitch'] },
  { stem: 'bass', streams: ['energy', 'pitch'] },
  { stem: 'other', streams: ['energy', 'pan', 'spread'] },
  { stem: 'beat', streams: ['energy'] },
  { stem: 'beat_ramp', streams: ['energy'] },
  { stem: 'model_beat', streams: ['energy'] },
  { stem: 'model_downbeat', streams: ['energy'] },
]
export const AUDIOSLICE_BEAT_STEMS = ['beat', 'model_beat', 'model_downbeat']
export const AUDIOSLICE_DEFAULTS = ['kick/energy', 'kick/onset', 'snare/energy', 'snare/onset', 'hihat/energy', 'bass/energy', 'vocals/energy', 'beat/energy']
export const audioSlicePath = (signal: string) => `/as/${signal}`
const AUDIOSLICE_FRAME_MS = 11.6099
export const audioSliceAlpha = (ms: number) => (ms > 0 ? AUDIOSLICE_FRAME_MS / (ms + AUDIOSLICE_FRAME_MS) : 1)

export function profileOf(b: FixtureBlock | LightBlock | GroupBlock) {
  return findProfile(b.profile)
}

const typed = (id: string, type: string, label = id): Port => ({ id, label, type })

export function inputPorts(b: Block, show?: Show, tab?: string | null): Port[] {
  const hidden = new Set(b.hidden ?? [])
  if (show && tab !== undefined) {
    const wired = new Set(show.wires.filter((w) => w.to === b.id && (w.scene ?? null) === tab).map((w) => w.port))
    for (const [a, z] of alternatives(b)) {
      if (a.some((p) => wired.has(p))) z.forEach((p) => hidden.add(p))
      if (z.some((p) => wired.has(p))) a.forEach((p) => hidden.add(p))
    }
  }
  return allInputPorts(b, show).filter((p) => !hidden.has(p.id))
}

function alternatives(b: Block): [string[], string[]][] {
  if (!isLight(b)) return []
  const pos = profileOf(b).position ?? []
  const brightness = b.kind === 'group' ? [...LOOK_CHANNELS, PATTERN_PORT] : LOOK_CHANNELS
  return [[[LOOK_PORT], brightness], [[LOOK_PORT], [COLOR_PORT]], [[COLOR_PORT], RGB], ...(pos.length ? [[[POSITION_PORT], pos] as [string[], string[]]] : [])]
}

function allInputPorts(b: Block, show?: Show): Port[] {
  switch (b.kind) {
    case 'audio':
    case 'cdj':
    case 'box':
    case 'tubeset':
    case 'board':
    case 'artnet':
    case 'dmxin':
    case 'blt':
    case 'audioslice':
    case 'input':
    case 'constant':
      return []
    case 'manual': return [typed('index', 'index', 'scene index')]
    case 'scene': return [typed(ON_PORT, 'signal'), ...innerInputs(b, show)]
    case 'composite': return innerInputs(b, show)
    case 'output': return [typed('value', b.type)]
    case 'equals': return [typed('index', 'index')]
    case 'latch': return [typed('set', 'signal'), typed('reset', 'signal')]
    case 'and': return [typed('a', 'signal'), typed('b', 'signal')]
    case 'not': return [typed('signal', 'signal')]
    case 'mix': return [typed('a', b.type), typed('b', b.type), typed('mix', 'signal', 'mix (0 = a, 1 = b)')]
    case 'fade': return [typed('signal', 'signal')]
    case 'counter': return [typed('trigger', 'signal', 'count'), typed('reset', 'signal')]
    case 'level': return [typed('audio', 'audio')]
    case 'steps': return [typed('signal', 'signal')]
    case 'gate': return [typed('signal', 'signal')]
    case 'pattern': return [typed('signal', 'signal'), b.advance === 'step' ? typed('step', 'index', 'step index') : typed('trigger', 'signal', 'next step'), typed('floor', 'signal', 'minimum')]
    case 'drop': return [typed('signal', 'signal', 'kick'), typed('beat', 'signal')]
    case 'hold': return [typed('trigger', 'signal', 'start'), typed('beat', 'signal')]
    case 'range': return [typed('signal', 'signal'), typed('amount', 'signal'), typed('tameMin', 'signal', 'tame min'), typed('tameMax', 'signal', 'tame max'), typed('wildMin', 'signal', 'wild min'), typed('wildMax', 'signal', 'wild max')]
    case 'sequence': return [typed('trigger', 'signal', 'next value'), typed('reset', 'signal')]
    case 'looks': return [b.advance === 'step' ? typed('scene', 'index', 'look index') : typed('next', 'signal', 'next look'), typed('offset', 'index', 'look offset'), typed('dimmer', 'signal'), typed('wild', 'signal'), color()]
    case 'colors': return [typed('index', 'index')]
    case 'values': return [typed('index', 'index')]
    case 'strip': return stripParams(b).filter((p) => STRIP_USES[b.mode].some((u) => p.id.match(new RegExp(`^${u}\\d*$`))))
    case 'fixture': return [{ ...typed(FIXTURE_PORT, 'fixture', b.name), profile: b.profile }]
    case 'tube': return [typed(FIXTURE_PORT, 'pixels', b.name)]
    case 'light': {
      const profile = profileOf(b)
      const ports = profile.channels.map((ch) => typed(ch.name, 'signal', ch.label))
      return [look(), ...(hasRgb(b) ? [color()] : []), ...(profile.position ? [typed(POSITION_PORT, 'index')] : []), ...ports]
    }
    case 'group': {
      const profile = profileOf(b)
      const ports = profile.channels.map((ch) => typed(ch.name, 'signal', ch.label))
      const advance = b.advance === 'step' ? [typed('step', 'index', 'pattern step')] : [typed('trigger', 'signal', 'pattern next')]
      const aim = profile.position ? [typed(POSITION_PORT, 'index'), typed(NUDGE_PORT, 'signal', `nudge ${profile.position[0]}`)] : []
      return [look(), ...(hasRgb(b) ? [color()] : []), typed(PATTERN_PORT, 'signal'), typed('floor', 'signal', 'minimum'), ...advance, ...aim, ...ports]
    }
  }
}

export function outputPorts(b: Block, show?: Show): Port[] {
  switch (b.kind) {
    case 'audio': return audioInputs(b).map((p) => {
      const cdj = show?.cables.find((c) => c.to === b.id && c.port === p.id)
      const first = Number(p.id.slice(2))
      const name = cdj && show?.blocks.find((x) => x.id === cdj.from)?.name
      return { ...p, label: name ? `${name} (${p.label})` : p.label, chans: b.stereo && first < b.channels ? `chan${first} chan${first + 1}` : `chan${first}` }
    })
    case 'dmxin': return Array.from({ length: b.channels }, (_, i) => typed(`ch${i + 1}`, 'signal'))
    case 'blt':
      return bltDecks(b).flatMap((deck) =>
        BLT_SIGNALS.filter((sig) => b.signals.includes(sig.id)).map((sig) => typed(`${deck}_${sig.id}`, sig.type, `${deck.replace('d', 'deck ')} ${sig.id}`)))
    case 'audioslice': return b.signals.map((s) => typed(s.replace('/', '_'), 'signal', s))
    case 'level': return [typed('out', 'signal', 'level')]
    case 'steps': return [typed('out', 'index', 'index')]
    case 'gate': return [typed('out', 'signal', 'gated')]
    case 'pattern': return Array.from({ length: b.slots }, (_, i) => typed(`slot${i + 1}`, 'signal', `slot ${i + 1}`))
    case 'drop': return [typed('drop', 'signal'), typed('armed', 'signal'), typed('drops', 'index', 'drops (count)')]
    case 'hold': return [typed('hold', 'signal')]
    case 'range': return [typed('out', 'signal', 'signal')]
    case 'sequence': return [typed('out', 'signal', 'value')]
    case 'looks': return [look(), typed('scene', 'index')]
    case 'fixture':
    case 'light':
    case 'group':
    case 'artnet':
    case 'cdj':
    case 'box':
    case 'tube':
    case 'tubeset':
    case 'board':
    case 'strip':
      return []
    case 'scene': return (show?.blocks ?? []).filter((x) => x.scene === b.id).flatMap((x) => {
      if (x.kind === 'group') return Array.from({ length: x.size }, (_, i) => ({ ...typed(memberPort(x.id, i), 'fixture', `${x.name} ${i + 1}`), profile: x.profile }))
      if (x.kind === 'light') return [{ ...typed(x.id, 'fixture', x.name), profile: x.profile }]
      if (x.kind === 'strip') return [typed(x.id, 'pixels', x.name)]
      return []
    })
    case 'input': return [typed('out', b.type, b.name)]
    case 'output': return [typed('out', b.type, b.name)]
    case 'composite': return (show?.blocks ?? []).filter((x): x is OutputBlock => x.kind === 'output' && x.scene === b.id).map((x) => typed(x.id, x.type, x.name))
    case 'manual': return scenesOf(show ?? EMPTY_SHOW).map((s) => typed(`s_${s.id}`, 'signal', s.name))
    case 'equals': return [typed('out', 'signal', 'equal')]
    case 'constant': return [typed('out', b.type, b.pulse > 0 ? `pulse ${b.pulse} Hz` : `${b.value}`)]
    case 'latch': return [typed('out', 'signal', 'latched')]
    case 'and': return [typed('out', 'signal', 'both')]
    case 'not': return [typed('out', 'signal', 'not')]
    case 'mix': return [typed('out', b.type, 'mixed')]
    case 'fade': return [typed('out', 'signal', 'faded')]
    case 'counter': return [typed('out', 'index', 'count')]
    case 'values': return b.rows.map((r, i) => ({ ...typed(`v${i}`, 'signal', r.name), chans: `v${i}` }))
    case 'colors': return b.rows.map((r, i) => ({ ...typed(`c${i}`, 'color', r.name), chans: RGB.map((ch) => `c${i}_${ch}`).join(' '), strip: `c${i}_` }))
  }
}

export function hasInput(b: Block, port: string, show: Show) {
  return inputPorts(b, show).some((p) => p.id === port)
}

export function portOf(show: Show, w: Wire) {
  const b = show.blocks.find((x) => x.id === w.to)
  return b ? inputPorts(b, show).find((p) => p.id === w.port) : undefined
}

export function nextAddress(show: Show) {
  return show.blocks.reduce((max, b) => {
    return b.kind === 'fixture' ? Math.max(max, b.address + profileOf(b).channels.length) : max
  }, 1)
}

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
  return show.wires.filter((w) => w.to === id).map((w) => ({ ...via(show, w), port: w.port, scene: null, ...(portOf(show, w)?.type === 'color' ? { keep: true } : {}) }))
}

export const memberPort = (id: string, i: number) => `${id}:${i}`

export function fixturesOf(show: Show, port: string, member = false) {
  const id = port.split(':')[0]
  const out = show.blocks.find((b) => b.id === id)
  const wired = new Set(show.wires.filter((w) => out?.scene && w.from === out.scene && (w.fromPort === port || (member && w.fromPort.startsWith(`${port}:`)))).map((w) => w.to))
  return show.blocks.filter((b) => (b.kind === 'fixture' || b.kind === 'tube') && wired.has(b.id)).map((b) => b.id)
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

export function controllerPatch(show: Show, id: string): Patch | null {
  const c = show.cables.find((x) => x.from === id && x.fromPort === 'out' && x.port.startsWith('i'))
  return c ? { node: c.to, universe: Number(c.port.slice(1)) } : null
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

export const universesPerOutput = (b: BoardBlock) => Math.ceil(b.ledsPerOutput / b.ledsPerUniverse)
export const boardUniverses = (b: BoardBlock) => Array.from({ length: b.outputs * universesPerOutput(b) }, (_, i) => b.startUniverse + i)
export const outputUniverses = (b: BoardBlock, output: number) => boardUniverses(b).slice((output - 1) * universesPerOutput(b), output * universesPerOutput(b))

export function pixelAddress(b: BoardBlock, output: number, led: number) {
  return { universe: b.startUniverse + (output - 1) * universesPerOutput(b) + Math.floor(led / b.ledsPerUniverse), channel: (led % b.ledsPerUniverse) * 3 + 1 }
}

export function pixelChain(show: Show, board: string, output: number) {
  const tubes: TubeBlock[] = []
  for (let c = show.cables.find((x) => x.from === board && x.fromPort === `o${output}`); c; c = show.cables.find((x) => x.from === c!.to && x.fromPort === 'out')) {
    const t = show.blocks.find((b) => b.id === c!.to)
    if (t?.kind !== 'tube' || tubes.includes(t)) break
    tubes.push(t)
  }
  return tubes
}

export const pathLength = (path: Point[]) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]), 0)

export function boardPlan(show: Show, board: BoardBlock) {
  const sources: Source[] = []
  const plan: [number, [number, number, number, number][]][] = []
  for (let o = 1; o <= board.outputs; o++) {
    const tubes: [number, number, TubeBlock][] = []
    let offset = 0
    for (const t of pixelChain(show, board.id, o)) {
      tubes.push([sources.length, offset, t])
      sources.push({ from: t.id, chan: null, port: t.id, scene: null })
      offset += t.leds
    }
    outputUniverses(board, o).forEach((u, k) => {
      const first = k * board.ledsPerUniverse
      const last = Math.min(board.ledsPerOutput, first + board.ledsPerUniverse)
      const parts = tubes.flatMap(([input, off, t]): [number, number, number, number][] => {
        const from = Math.max(off, first)
        const to = Math.min(off + t.leds, last)
        return to > from ? [[input, from - off, to - from, (from - first) * 3]] : []
      })
      plan.push([u, parts])
    })
  }
  return { sources, plan }
}

export function patchOf(show: Show, id: string): Patch | null {
  return show.blocks.find((x) => x.id === id)?.kind === 'fixture' ? unitPatch(show, id) : null
}

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
    if (b.kind === 'cdj') out.push({ key: b.id, block: b, name: b.name, placement: b.sim ?? floorSpot(devices++), inputs: [], outputs: [typed('out', 'audio', 'audio out')] })
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

export function audioInputs(b: AudioBlock): Port[] {
  const step = b.stereo ? 2 : 1
  return Array.from({ length: Math.ceil(b.channels / step) }, (_, i) => {
    const first = i * step + 1
    return typed(`in${first}`, 'audio', b.stereo && first < b.channels ? `${first}-${first + 1}` : `in ${first}`)
  })
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

export function chainOf(show: Show, node: string, universe: number) {
  const keys: string[] = []
  for (let c = show.cables.find((x) => x.from === node && x.fromPort === `u${universe}`); c && !keys.includes(c.to); c = show.cables.find((x) => x.from === c!.to && x.fromPort === 'out')) keys.push(c.to)
  return keys
}

const roomAt = (show: Show, x: number, z: number) => show.blocks.find((b): b is BoxBlock => b.kind === 'box' && Math.abs(x - (b.sim?.position[0] ?? 0)) <= b.size[0] / 2 && Math.abs(z - (b.sim?.position[2] ?? 0)) <= b.size[1] / 2)

export function ceilingAt(show: Show, x: number, z: number) {
  const room = roomAt(show, x, z)
  return room ? (room.sim?.position[1] ?? 0) + room.size[2] : null
}

export function onWall(show: Show, p: Placement): Placement | null {
  const [x, y, z] = p.position
  const room = roomAt(show, x, z)
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

export function placeUnit(show: Show, key: string, sim: Placement, flip?: boolean): Show {
  const b = show.blocks.find((x) => x.id === key)
  return patchBlock(show, b?.kind === 'tube' && b.set ? b.set : key, { sim, ...(flip === undefined ? {} : { flip }) })
}

export function selectorSources(show: Show) {
  return scenesOf(show).map((s, k) => show.wires.filter((w) => w.to === s.id && w.port === ON_PORT).map((w) => ({ ...via(show, w), port: `on${k}`, scene: null as number | null })))
}

export function visibleBlocks(show: Show, tab: string | null) {
  return show.blocks.filter((b) => (tab === null ? !b.scene && !LAYOUT_KINDS.includes(b.kind) : b.scene === tab))
}

export type Rail = { title: string; ports: Port[] }
export const RAIL_SEP = '|'

const byLabel = (ports: Port[]) => [...ports].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))

export const inputRail = (show: Show): Rail[] => show.blocks.filter((b) => SOURCE_KINDS.includes(b.kind)).map((b) => ({ title: b.name, ports: byLabel(outputPorts(b, show).map((p) => ({ ...p, id: `${b.id}${RAIL_SEP}${p.id}` }))) }))

export const outputRail = (show: Show): Rail[] => [
  ...allProfiles().map((f) => ({ title: f.label, ports: byLabel(show.blocks.filter((b) => b.kind === 'fixture' && b.profile === f.id).flatMap((b) => inputPorts(b, show).map((p) => ({ ...p, id: b.id })))) })),
  { title: 'LED tubes', ports: byLabel(show.blocks.filter((b) => b.kind === 'tube' && !b.set).flatMap((b) => inputPorts(b, show).map((p) => ({ ...p, id: b.id })))) },
  ...show.blocks.filter((b) => b.kind === 'tubeset').map((s) => ({ title: s.name, ports: byLabel(membersOf(show, s.id).map((t) => ({ ...typed(FIXTURE_PORT, 'pixels', t.name.slice(s.name.length + 1)), id: t.id }))) })),
].filter((r) => r.ports.length)

export function visibleWires(show: Show, tab: string | null) {
  return show.wires.filter((w) => (w.scene ?? null) === tab)
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
  return [syncSets({ ...show, nextId: n, blocks: [...show.blocks, ...blocks], wires: [...show.wires, ...wires] }), blocks.map((b) => b.id)]
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

export function drivenPorts(show: Show, id: string, tab: string | null) {
  const block = show.blocks.find((b) => b.id === id)
  const wired = new Set(show.wires.filter((w) => w.to === id && (w.scene ?? null) === tab).map((w) => w.port))
  if (block) for (const [port, channels] of exclusions(block)) if (wired.has(port)) for (const ch of channels) wired.add(ch)
  return wired
}

function exclusions(b: Block): [string, string[]][] {
  if (b.kind === 'light') return [[LOOK_PORT, [...LOOK_CHANNELS, COLOR_PORT]], [COLOR_PORT, RGB], [POSITION_PORT, profileOf(b).position ?? []]]
  if (b.kind === 'group') return [[LOOK_PORT, [...LOOK_CHANNELS, COLOR_PORT]], [COLOR_PORT, RGB], [POSITION_PORT, profileOf(b).position ?? []], [PATTERN_PORT, ['Dimmer']]]
  return []
}

export function canWire(show: Show, from: string, fromPort: string, to: string, port: string, tab: string | null) {
  const a = show.blocks.find((b) => b.id === from)
  const b = show.blocks.find((b) => b.id === to)
  if (!a || !b) return false
  if (tab === null ? a.scene || b.scene : a.scene !== tab || b.scene !== tab) return false
  const source = outputPorts(a, show).find((p) => p.id === fromPort)
  const target = inputPorts(b, show, tab).find((p) => p.id === port)
  if (!source || !target || source.type !== target.type || source.profile !== target.profile) return false
  const here = show.wires.filter((w) => (w.scene ?? null) === tab)
  if (here.some((w) => w.from === from && w.fromPort === fromPort && w.to === to && w.port === port)) return false
  const output = target.type === 'fixture' || target.type === 'pixels'
  if (output && here.some((w) => w.to === to && w.from === from)) return false
  if (target.type !== 'signal' && !output && here.some((w) => w.to === to && w.port === port)) return false
  const driven = drivenPorts(show, to, tab)
  for (const [master, channels] of exclusions(b)) {
    if (port === master && channels.some((ch) => driven.has(ch))) return false
    if (channels.includes(port) && driven.has(master)) return false
  }
  return true
}

export function blockHeight(b: Block, show?: Show) {
  const ports = Math.max(inputPorts(b, show).length, outputPorts(b, show).length)
  return Math.max(NODE_H, 60 + ports * 16)
}

export function newBlock(show: Show, item: PaletteItem, x: number, y: number, tab: string | null): [Show, Block] {
  const n = show.nextId
  const base = { x, y, w: NODE_W, h: NODE_H, ...(tab && !LAYOUT_KINDS.includes(item.kind) && !SHOW_KINDS.includes(item.kind) ? { scene: tab } : {}) }
  let block: Block
  switch (item.kind) {
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

export type SimFixture = { key: string; name: string; profile: FixtureProfile; placement: Placement; address: number; node: string | null; universe: number | null }
export type SimTube = { key: string; name: string; placement: Placement; path: Point[]; leds: number; addresses: [string, number][] | null; label: string }
export type SimDevice = { key: string; name: string; kind: Kind; placement: Placement; size?: [number, number, number] }

export function simFixtures(show: Show): SimFixture[] {
  return unitsOf(show).flatMap((u) => u.block.kind === 'fixture' ? [{ key: u.key, name: u.name, profile: profileOf(u.block), placement: u.placement, address: u.block.address, node: unitPatch(show, u.key)?.node ?? null, universe: unitPatch(show, u.key)?.universe ?? null }] : [])
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
  return pruneCables({ ...next, blocks: sized, wires: show.wires.filter((w) => (w.from !== id || outs.some((p) => p.id === w.fromPort)) && (w.to !== id || hasInput(block, w.port, next)) && !stale(w)) })
}

export function removeBlocks(show: Show, ids: string[]): Show {
  const gone = withInner(show, ids)
  const blocks = show.blocks.filter((b) => !gone.has(b.id))
  const scene = (id: string) => show.blocks.some((b) => b.id === id && (b.kind === 'scene' || b.kind === 'composite'))
  return pruneCables({
    ...show,
    blocks,
    wires: show.wires.filter((w) => !gone.has(w.from) && !gone.has(w.to) && !(w.scene && gone.has(w.scene)) && !(scene(w.to) && gone.has(w.port)) && !(scene(w.from) && gone.has(w.fromPort.split(':')[0]))),
  })
}

export function addWire(show: Show, wire: Wire): Show {
  return { ...show, wires: [...show.wires, wire] }
}

const sameWire = (a: Wire, b: Wire) => a.from === b.from && a.fromPort === b.fromPort && a.to === b.to && a.port === b.port && (a.scene ?? null) === (b.scene ?? null)

export function removeWires(show: Show, wires: Wire[]): Show {
  return { ...show, wires: show.wires.filter((w) => !wires.some((r) => sameWire(r, w))) }
}

export const membersOf = (show: Show, set: string) => show.blocks.filter((b): b is TubeBlock => b.kind === 'tube' && b.set === set)

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

export function fitPath(path: Point[], length: number, keep = -1): Point[] {
  const segs = path.slice(1).map((p, i): Point => [p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]])
  const len = (v: Point) => Math.hypot(...v)
  const fixed = keep > 0 ? len(segs[keep - 1]) : 0
  const rest = segs.reduce((sum, v, i) => sum + (i === keep - 1 ? 0 : len(v)), 0) || 1
  const k = Math.max(0, length - fixed) / rest
  const out: Point[] = [path[0]]
  segs.forEach((v, i) => {
    const f = i === keep - 1 ? 1 : k
    const at = out[i]
    out.push([at[0] + v[0] * f, at[1] + v[1] * f, at[2] + v[2] * f].map((x) => Math.round(x * 1000) / 1000) as Point)
  })
  return out
}

export function ledPoints(path: Point[], leds: number): Point[] {
  const total = pathLength(path)
  return Array.from({ length: leds }, (_, i) => {
    let left = total * (leds === 1 ? 0.5 : (i + 0.5) / leds)
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1]
      const b = path[k]
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      if (left <= seg || k === path.length - 1) {
        const f = seg ? Math.min(1, left / seg) : 0
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
      }
      left -= seg
    }
    return path[0]
  })
}

export function tubeGeometry(show: Show, t: TubeBlock) {
  const members = t.set ? membersOf(show, t.set) : [t]
  const points = members.flatMap((m) => m.path)
  const lo = Math.min(...points.map((p) => p[1]))
  const hi = Math.max(...points.map((p) => p[1]))
  const far = Math.max(...points.map((p) => Math.hypot(...p)))
  const leds = ledPoints(t.path, t.leds)
  const r = (v: number) => Math.round(v * 1000) / 1000
  return { index: Math.max(0, members.findIndex((m) => m.id === t.id)), count: members.length, height: leds.map((p) => r((p[1] - lo) / (hi - lo || 1))), distance: leds.map((p) => r(Math.hypot(...p) / (far || 1))) }
}

const innerInputs = (b: Block, show?: Show) => (show?.blocks ?? []).filter((x): x is InputBlock => x.kind === 'input' && x.scene === b.id).map((x) => typed(x.id, x.type, x.name))

function via(show: Show, w: Wire) {
  const from = show.blocks.find((b) => b.id === w.from)
  return from?.kind === 'composite' ? { from: w.fromPort, chan: null } : { from: w.from, chan: chanOf(show, w), ...stripOf(show, w) }
}

export function withInner(show: Show, ids: string[]) {
  const all = new Set(ids)
  for (let size = -1; size !== all.size;) {
    size = all.size
    for (const b of show.blocks) if ((b.scene && all.has(b.scene)) || (b.kind === 'tube' && b.set && all.has(b.set))) all.add(b.id)
  }
  return all
}

export const ownerOf = (show: Show, b: Block) => show.blocks.find((x) => x.id === (b.kind === 'tube' ? b.set : b.scene))

export function ownersOf(show: Show, b: Block): Block[] {
  const chain: Block[] = []
  for (let o = ownerOf(show, b); o && !chain.includes(o); o = ownerOf(show, o)) chain.unshift(o)
  return chain
}
