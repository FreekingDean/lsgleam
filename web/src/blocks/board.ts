import type { Base, Show, TubeBlock } from '../model/show'
import type { Source } from '../model/patch'
import type { BlockDef } from './types'
import python from './board.py?raw'

export type BoardBlock = Base & { kind: 'board'; protocol: string; ip: string; active: boolean; outputs: number; ledsPerOutput: number; ledsPerUniverse: number; startUniverse: number }

export const universesPerOutput = (b: BoardBlock) => Math.ceil(b.ledsPerOutput / b.ledsPerUniverse)
export const boardUniverses = (b: BoardBlock) => Array.from({ length: b.outputs * universesPerOutput(b) }, (_, i) => b.startUniverse + i)
export const outputUniverses = (b: BoardBlock, output: number) => boardUniverses(b).slice((output - 1) * universesPerOutput(b), output * universesPerOutput(b))

export function pixelChain(show: Show, board: string, output: number) {
  const tubes: TubeBlock[] = []
  for (let c = show.cables.find((x) => x.from === board && x.fromPort === `o${output}`); c; c = show.cables.find((x) => x.from === c!.to && x.fromPort === 'out')) {
    const t = show.blocks.find((b) => b.id === c!.to)
    if (t?.kind !== 'tube' || tubes.includes(t)) break
    tubes.push(t)
  }
  return tubes
}

export function boardPlan(show: Show, board: BoardBlock) {
  const sources: Source[] = []
  const slots: number[] = []
  let base = 0
  for (let o = 1; o <= board.outputs; o++) {
    const tubes = pixelChain(show, board.id, o)
    const leds = Math.min(board.ledsPerOutput, tubes.reduce((n, t) => n + t.leds, 0))
    outputUniverses(board, o).forEach((_, k) => {
      for (let ch = 0; ch < 512; ch++) {
        const led = k * board.ledsPerUniverse + Math.floor(ch / 3)
        slots.push(Math.floor(ch / 3) < board.ledsPerUniverse && led < leds ? (base + led) * 3 + (ch % 3) : -1)
      }
    })
    for (const t of tubes) {
      sources.push({ from: t.id, chan: null, port: t.id, scene: null })
      base += t.leds
    }
  }
  return { sources, slots }
}

export const board: BlockDef<BoardBlock> = {
  kind: 'board',
  label: 'Pixel controller (Art-Net)',
  info: 'Art-Net pixel controller: outputs drive cabled tubes, mapped onto universes',
  tab: 'Pixels',
  python,
  create: (base, n) => ({ ...base, id: `board${n}`, name: `Pixel board ${n}`, kind: 'board', protocol: 'sk9822', ip: '192.168.1.50', active: true, outputs: 8, ledsPerOutput: 300, ledsPerUniverse: 150, startUniverse: 0 }),
  inputs: () => [],
  outputs: () => [],
  subtitle: (b) => b.ip,
  args: (b, show) => [boardPlan(show, b).slots],
}
