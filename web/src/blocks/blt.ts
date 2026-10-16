import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './blt.py?raw'

export type BltBlock = Base & { kind: 'blt'; port: number; decks: number; master: boolean; signals: string[]; songs: string[] }

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

const BLT_INDEXED = BLT_SIGNALS.filter((s) => s.type === 'index').map((s) => s.id)

export const blt: BlockDef<BltBlock> = {
  kind: 'blt',
  label: 'Beat Link Trigger (OSC)',
  info: 'Pioneer decks via Beat Link Trigger (OSC)',
  tab: 'Hardware',
  python: python.replaceAll('BLT_INDEXED', `json.loads(${JSON.stringify(JSON.stringify(BLT_INDEXED))})`),
  create: (base, n) => ({ ...base, id: `blt${n}`, name: 'Beat Link Trigger', kind: 'blt', port: 9001, decks: 2, master: true, signals: BLT_DEFAULTS, songs: [] }),
  inputs: () => [],
  outputs: (b) =>
    bltDecks(b).flatMap((deck) =>
      BLT_SIGNALS.filter((sig) => b.signals.includes(sig.id)).map((sig) => typed(`${deck}_${sig.id}`, sig.type, `${deck.replace('d', 'deck ')} ${sig.id}`))),
  subtitle: (b) => `OSC :${b.port} · ${b.decks} decks`,
}
