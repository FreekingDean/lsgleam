import type { BltBlock, PatternMode, SequenceBlock, Kind, Port } from './show'

export const TYPE_COLORS: Record<string, string> = { audio: '#e06c6c', signal: '#6cb86c', index: '#f39c12', number: '#9aa5b1', look: '#b07ddc', color: '#ff8fd0', fixture: '#4fb3bf', dmx: '#5c8ed6', pixel: '#ffd24a', pixels: '#ffd24a', multi: '#7fd4ff', any: '#666b73' }

export const KIND_INFO: Partial<Record<Kind, string>> = {
  audio: 'Audio device input',
  dmxin: 'DMX controller: cable it into an Art-Net input universe; one signal per fader',
  blt: 'Pioneer decks via Beat Link Trigger (OSC)',
  audioslice: 'Stem energy, hits and beats from AudioSlice (OSC)',
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
  split: 'Unbundles a multichannel wire back into the values its Combine bundled',
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
  multi: 'several values on one wire',
  any: 'any type: the first wire sets it',
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
  progress: 'how far through, 0–1',
  run: 'counts only while above 0.5; unwired = always running',
  song: 'index of the playing title in the song list',
  playing: '1 while playing',
  onair: '1 while on air at the mixer',
  master: '1 while this deck is tempo master',
}

export function portHint(p: Port) {
  const key = p.id.replace(/^(d\d+|master)_/, '')
  return `${p.label} · ${TYPE_INFO[p.type] ?? p.type}${p.multi && p.type !== 'multi' ? ' or multichannel' : ''}${PORT_HINTS[key] ? ` · ${PORT_HINTS[key]}` : ''}`
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
