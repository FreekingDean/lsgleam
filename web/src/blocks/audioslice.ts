import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './audioslice.py?raw'

export type AudioSliceBlock = Base & { kind: 'audioslice'; port: number; signals: string[]; apiPort: number; token: string; smoothing: number }

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

export const audioslice: BlockDef<AudioSliceBlock> = {
  kind: 'audioslice',
  label: 'AudioSlice (OSC)',
  info: 'Stem energy, hits and beats from AudioSlice (OSC)',
  tab: 'Hardware',
  python,
  create: (base, n) => ({ ...base, id: `as${n}`, name: `as${n}`, kind: 'audioslice', port: 9002, signals: AUDIOSLICE_DEFAULTS, apiPort: 8722, token: '', smoothing: 0 }),
  inputs: () => [],
  outputs: (b) => b.signals.map((s) => typed(s.replace('/', '_'), 'signal', s)),
  subtitle: (b) => `OSC :${b.port} · ${b.signals.length} signals`,
}
