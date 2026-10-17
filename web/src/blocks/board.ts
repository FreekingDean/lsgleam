import type { Base, Show, TubeBlock } from '../model/show'
import type { Source } from '../model/patch'
import type { BlockDef } from './types'
import python from './board.py?raw'
import patch from './board_patch.py?raw'

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

export const board: BlockDef<BoardBlock> = {
  kind: 'board',
  label: 'Pixel controller (Art-Net)',
  info: 'Art-Net pixel controller: outputs drive cabled tubes, mapped onto universes',
  tab: 'Pixels',
  python: python.replace('BOARD_CODE', JSON.stringify(patch)),
  create: (base, n) => ({ ...base, id: `board${n}`, name: `Pixel board ${n}`, kind: 'board', protocol: 'sk9822', ip: '192.168.1.50', active: true, outputs: 8, ledsPerOutput: 300, ledsPerUniverse: 150, startUniverse: 0 }),
  inputs: () => [],
  outputs: () => [],
  subtitle: (b) => b.ip,
  args: (b, show) => [boardPlan(show, b).plan],
}
