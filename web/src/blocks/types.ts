import type { Base, Block, Port, Show } from '../model/show'

export type BlockDef<B extends Block = Block> = {
  kind: B['kind']
  label: string
  info: string
  tab: 'Logic' | 'Math' | 'Time'
  python: string
  slotted?: boolean
  create(base: Pick<Base, 'x' | 'y' | 'w' | 'h' | 'scene'>, n: number): B
  inputs(b: B, show?: Show): Port[]
  outputs(b: B, show: Show | undefined, seen: Set<string>): Port[]
  subtitle(b: B): string
  args?(b: B, show: Show): unknown[]
  accepts?(source: Port, target: Port): boolean
}
