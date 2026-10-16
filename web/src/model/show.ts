import { findProfile, type FixtureProfile } from './fixtures'

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
export type InputType = 'signal' | 'index' | 'audio' | 'number' | 'color' | 'multi'
export const INPUT_TYPES: InputType[] = ['signal', 'index', 'audio', 'number', 'color', 'multi']
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
export type TimerBlock = Base & { kind: 'timer'; seconds: number; countTo: number; end: 'hold' | 'loop' }
export type CombineBlock = Base & { kind: 'combine'; names: Record<string, string> }
export type SplitBlock = Base & { kind: 'split' }
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
export type StripBlock = Base & { kind: 'strip'; mode: StripMode; color: string; stops: ColorStop[]; spread: number; along: StripAlong; dimmer: number; position: number; width: number; speed: number }

export type Block = CompositeBlock | OutputBlock | ValuesBlock | MixBlock | FadeBlock | NotBlock | GateBlock | AudioBlock | DmxInBlock | BltBlock | AudioSliceBlock | LevelBlock | StepsBlock | DropBlock | HoldBlock | RangeBlock | SequenceBlock | LooksBlock | PatternBlock | FixtureBlock | LightBlock | GroupBlock | ArtnetBlock | SceneBlock | InputBlock | ManualBlock | EqualsBlock | ConstantBlock | LatchBlock | AndBlock | CounterBlock | TimerBlock | CombineBlock | SplitBlock | CdjBlock | BoxBlock | ColorsBlock | TubeBlock | TubeSetBlock | BoardBlock | StripBlock
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
export const SHOW_KINDS: Kind[] = ['scene', 'manual']
export const VIRTUAL_KINDS: Kind[] = ['blt', 'audioslice']
export const isLight = (b: Block): b is LightBlock | GroupBlock => b.kind === 'light' || b.kind === 'group'
export const hasProfile = (b: Block): b is FixtureBlock | LightBlock | GroupBlock => b.kind === 'fixture' || isLight(b)
export const scenesOf = (show: Show) => show.blocks.filter((b): b is SceneBlock => b.kind === 'scene')

export type Port = { id: string; label: string; type: string; hint?: string; chans?: string; strip?: string; profile?: string; multi?: boolean }

export type PaletteItem = { kind: 'light'; profile: string } | { kind: 'box' } | { kind: 'cdj' } | { kind: 'audio' } | { kind: 'dmxin' } | { kind: 'blt' } | { kind: 'audioslice' } | { kind: 'level' } | { kind: 'steps' } | { kind: 'gate' } | { kind: 'drop' } | { kind: 'hold' } | { kind: 'range' } | { kind: 'sequence' } | { kind: 'looks' } | { kind: 'pattern' } | { kind: 'fixture'; profile: string } | { kind: 'group'; profile: string } | { kind: 'artnet' } | { kind: 'scene' } | { kind: 'input'; type?: InputType } | { kind: 'output'; type?: InputType } | { kind: 'composite' } | { kind: 'manual' } | { kind: 'equals' } | { kind: 'constant' } | { kind: 'latch' } | { kind: 'and' } | { kind: 'not' } | { kind: 'mix' } | { kind: 'fade' } | { kind: 'counter' } | { kind: 'timer' } | { kind: 'combine' } | { kind: 'split' } | { kind: 'colors' } | { kind: 'values' } | { kind: 'tubeset'; design?: string } | { kind: 'board' } | { kind: 'strip' }

export const POSITION_PORT = 'position'
export const PATTERN_PORT = 'pattern'
export const LOOK_PORT = 'look'
export const LOOK_CHANS = 'Red Green Blue Dimmer'
export const COLOR_PORT = 'color'
export const RGB = ['Red', 'Green', 'Blue']
export const LOOK_CHANNELS = ['Red', 'Green', 'Blue', 'Dimmer']
export const NUDGE_PORT = 'nudge'

export function profileOf(b: FixtureBlock | LightBlock | GroupBlock) {
  return findProfile(b.profile)
}

export const memberPort = (id: string, i: number) => `${id}:${i}`

export function visibleBlocks(show: Show, tab: string | null) {
  return show.blocks.filter((b) => (tab === null ? !b.scene && !LAYOUT_KINDS.includes(b.kind) : b.scene === tab))
}

export type Rail = { title: string; ports: Port[] }
export const RAIL_SEP = '|'

export function visibleWires(show: Show, tab: string | null) {
  return show.wires.filter((w) => (w.scene ?? null) === tab)
}

export const membersOf = (show: Show, set: string) => show.blocks.filter((b): b is TubeBlock => b.kind === 'tube' && b.set === set)

export const ownerOf = (show: Show, b: Block) => show.blocks.find((x) => x.id === (b.kind === 'tube' ? b.set : b.scene))

export function ownersOf(show: Show, b: Block): Block[] {
  const chain: Block[] = []
  for (let o = ownerOf(show, b); o && !chain.includes(o); o = ownerOf(show, o)) chain.unshift(o)
  return chain
}
