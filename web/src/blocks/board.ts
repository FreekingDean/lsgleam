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

const ledCount = (tubes: TubeBlock[]) => tubes.reduce((n, t) => n + t.leds, 0)

export function boardPlan(show: Show, board: BoardBlock) {
  const chains = Array.from({ length: board.outputs }, (_, o) => pixelChain(show, board.id, o + 1))
  const total = ledCount(chains.flat())
  const slots: number[] = []
  let base = 0
  chains.forEach((tubes, o) => {
    const leds = Math.min(board.ledsPerOutput, ledCount(tubes))
    outputUniverses(board, o + 1).forEach((_, k) => {
      for (let ch = 0; ch < 512; ch++) {
        const pixel = Math.floor(ch / 3)
        const led = k * board.ledsPerUniverse + pixel
        slots.push(pixel < board.ledsPerUniverse && led < leds ? (ch % 3) * total + base + led : -1)
      }
    })
    base += ledCount(tubes)
  })
  const sources: Source[] = chains.flat().map((t) => ({ from: t.id, chan: null, port: t.id, scene: null }))
  return { sources, slots, bytes: total * 3 }
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
  args: (b, show) => {
    const { slots, bytes } = boardPlan(show, b)
    return [slots, bytes]
  },
}
