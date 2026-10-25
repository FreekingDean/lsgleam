import { findProfile, modeOf, type StoredProfile } from './fixtures'
import type { TimerBlock } from '../blocks/timer'
import type { CombineBlock } from '../blocks/combine'
import type { ConstantBlock } from '../blocks/constant'
import type { LatchBlock } from '../blocks/latch'
import type { AndBlock } from '../blocks/and'
import type { NotBlock } from '../blocks/not'
import type { EqualsBlock } from '../blocks/equals'
import type { CounterBlock } from '../blocks/counter'
import type { StepsBlock } from '../blocks/steps'
import type { LevelBlock } from '../blocks/level'
import type { GateBlock } from '../blocks/gate'
import type { FadeBlock } from '../blocks/fade'
import type { MixBlock } from '../blocks/mix'
import type { HoldBlock } from '../blocks/hold'
import type { DropBlock } from '../blocks/drop'
import type { RangeBlock } from '../blocks/range'
import type { AddBlock } from '../blocks/add'
import type { PriorityBlock } from '../blocks/priority'
import type { OscOutBlock } from '../blocks/oscout'
import type { SplitBlock } from '../blocks/split'
import type { SequenceBlock } from '../blocks/sequence'
import type { ValuesBlock } from '../blocks/values'
import type { ColorsBlock } from '../blocks/colors'
import type { PatternBlock } from '../blocks/pattern'
import type { LooksBlock } from '../blocks/looks'
import type { AudioBlock } from '../blocks/audio'
import type { DmxInBlock } from '../blocks/dmxin'
import type { BltBlock } from '../blocks/blt'
import type { AudioSliceBlock } from '../blocks/audioslice'
import type { CdjBlock } from '../blocks/cdj'
import type { BoxBlock } from '../blocks/box'
import type { ArtnetBlock } from '../blocks/artnet'
import type { StripBlock } from '../blocks/strip'
import type { BoardBlock } from '../blocks/board'
import type { FixtureBlock } from '../blocks/fixture'
import type { LightBlock } from '../blocks/light'
import type { GroupBlock } from '../blocks/group'
import type { ManualBlock } from '../blocks/manual'
import type { InputBlock } from '../blocks/input'
import type { OutputBlock } from '../blocks/output'
import type { SceneBlock } from '../blocks/scene'
import type { CompositeBlock } from '../blocks/composite'

export type { TimerBlock, CombineBlock, ConstantBlock, LatchBlock, AndBlock, NotBlock, EqualsBlock, PriorityBlock, OscOutBlock, CounterBlock, StepsBlock, LevelBlock, GateBlock, FadeBlock, MixBlock, HoldBlock, DropBlock, RangeBlock, AddBlock, SplitBlock, SequenceBlock, ValuesBlock, ColorsBlock, PatternBlock, LooksBlock, AudioBlock, DmxInBlock, BltBlock, AudioSliceBlock, CdjBlock, BoxBlock, ArtnetBlock, StripBlock, BoardBlock, FixtureBlock, LightBlock, GroupBlock, ManualBlock, InputBlock, OutputBlock, SceneBlock, CompositeBlock }

export const NODE_W = 160
export const NODE_H = 130

export type Base = { id: string; name: string; x: number; y: number; w: number; h: number; scene?: string; hidden?: string[]; sim?: Placement; flip?: boolean }

export type Position = { name: string; values: Record<string, number> }

export type PatternMode = 'all' | 'alternate' | 'alternate2' | 'chase' | 'outsidein' | 'fillin' | 'fillout'
export type PatternAdvance = 'step' | 'trigger'
export type Scene = { name: string; color: string; window: [number, number] }
export type Placement = { position: [number, number, number]; rotation: [number, number, number] }
export type Patch = { node: string; universe: number }
export type Aims = Record<string, Record<string, number>>
export type GroupPosition = { name: string; members: Aims }
export type InputType = 'signal' | 'index' | 'audio' | 'number' | 'color' | 'multi'
export const INPUT_TYPES: InputType[] = ['signal', 'index', 'audio', 'number', 'color', 'multi']
export type ColorRow = { name: string; colors: string[] }
export type ValueRow = { name: string; values: number[] }
export type Point = [number, number, number]
export type TubeBlock = Base & { kind: 'tube'; leds: number; length: number; protocol: string; path: Point[]; set?: string; member?: string }
export type DesignTube = { id: string; name: string; leds: number; length: number; protocol: string; path: Point[] }
export type TubeDesign = { id: string; name: string; tubes: DesignTube[] }
export type TubeSetBlock = Base & { kind: 'tubeset'; design: string }
export const PIXEL_PROTOCOLS = ['sk9822', 'apa102', 'ws2812', 'ws2811']
export type StripMode = 'solid' | 'band' | 'fill' | 'chase' | 'ramp'
export const STRIP_MODES: StripMode[] = ['solid', 'band', 'fill', 'chase', 'ramp']
export type ColorStop = { at: number; color: string }
export type StripAlong = 'tube' | 'height' | 'distance'
export const STRIP_ALONG: Record<StripAlong, string> = { tube: 'each tube, from its start', height: 'height, across the whole design', distance: 'distance from the base' }

export type Block = CompositeBlock | OutputBlock | ValuesBlock | MixBlock | FadeBlock | NotBlock | GateBlock | AudioBlock | DmxInBlock | BltBlock | AudioSliceBlock | LevelBlock | StepsBlock | DropBlock | HoldBlock | RangeBlock | AddBlock | SequenceBlock | LooksBlock | PatternBlock | FixtureBlock | LightBlock | GroupBlock | ArtnetBlock | SceneBlock | InputBlock | ManualBlock | EqualsBlock | PriorityBlock | OscOutBlock | ConstantBlock | LatchBlock | AndBlock | CounterBlock | TimerBlock | CombineBlock | SplitBlock | CdjBlock | BoxBlock | ColorsBlock | TubeBlock | TubeSetBlock | BoardBlock | StripBlock
export type Kind = Block['kind']
export type Wire = { from: string; fromPort: string; to: string; port: string; scene?: string }
export type Cable = { from: string; fromPort: string; to: string; port: string }
export type Show = { nextId: number; blocks: Block[]; wires: Wire[]; cables: Cable[]; rails?: Record<string, { x: number; y: number }>; designs?: TubeDesign[]; profiles?: StoredProfile[]; responses?: Record<string, ColorResponse>; floors?: Floor[]; visualiser?: string }
export type FloorPlan = { src: string; x: number; z: number; width: number; height: number; rotation: number; opacity: number; locked: boolean }
export type Floor = { id: string; name: string; elevation: number; floorplan?: FloorPlan }
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
export const LAYOUT_KINDS: Kind[] = ['artnet', 'fixture', 'cdj', 'box', 'tube', 'tubeset', 'board', 'oscout', ...SOURCE_KINDS]
export const SHOW_KINDS: Kind[] = ['scene', 'manual']
export const VIRTUAL_KINDS: Kind[] = ['blt', 'audioslice', 'oscout']
export const SENDER_KINDS: Kind[] = ['artnet', 'board']
export const sendersOf = (show: Show) => show.blocks.filter((b) => SENDER_KINDS.includes(b.kind)).map((b) => b.id)
export const isLight = (b: Block): b is LightBlock | GroupBlock => b.kind === 'light' || b.kind === 'group'
export const hasProfile = (b: Block): b is FixtureBlock | LightBlock | GroupBlock => b.kind === 'fixture' || isLight(b)
export const scenesOf = (show: Show) => show.blocks.filter((b): b is SceneBlock => b.kind === 'scene')

export type Port = { id: string; label: string; type: string; hint?: string; chans?: string; strip?: string; profile?: string; multi?: boolean }
export const typed = (id: string, type: string, label = id): Port => ({ id, label, type })

export type PaletteItem = { kind: 'light'; profile: string } | { kind: 'box' } | { kind: 'cdj' } | { kind: 'audio' } | { kind: 'dmxin' } | { kind: 'blt' } | { kind: 'audioslice' } | { kind: 'level' } | { kind: 'steps' } | { kind: 'gate' } | { kind: 'drop' } | { kind: 'hold' } | { kind: 'range' } | { kind: 'add' } | { kind: 'sequence' } | { kind: 'looks' } | { kind: 'pattern' } | { kind: 'fixture'; profile: string } | { kind: 'group'; profile: string } | { kind: 'artnet' } | { kind: 'scene' } | { kind: 'input'; type?: InputType } | { kind: 'output'; type?: InputType } | { kind: 'composite' } | { kind: 'manual' } | { kind: 'equals' } | { kind: 'priority' } | { kind: 'oscout' } | { kind: 'constant' } | { kind: 'latch' } | { kind: 'and' } | { kind: 'not' } | { kind: 'mix' } | { kind: 'fade' } | { kind: 'counter' } | { kind: 'timer' } | { kind: 'combine' } | { kind: 'split' } | { kind: 'colors' } | { kind: 'values' } | { kind: 'tubeset'; design?: string } | { kind: 'board' } | { kind: 'strip' }

export const POSITION_PORT = 'position'
export const PATTERN_PORT = 'pattern'
export const LOOK_PORT = 'look'
export const LOOK_CHANS = 'Red Green Blue Dimmer'
export const COLOR_PORT = 'color'
export const RGB = ['Red', 'Green', 'Blue']
export const RGB_ATTRS = ['red', 'green', 'blue']
export const LOOK_ATTRS = [...RGB_ATTRS, 'intensity']
export const NUDGE_PORT = 'nudge'

export function profileOf(b: FixtureBlock | LightBlock | GroupBlock) {
  return findProfile(b.profile)
}

export const fixtureMode = (b: FixtureBlock) => modeOf(profileOf(b), b.mode)

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
