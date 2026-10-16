import type { Base, Block, Port, Show, Wire } from '../model/show'

export type Ports = { outputPorts(b: Block, show?: Show, seen?: Set<string>): Port[]; sourcePort(show: Show, w: Wire, seen?: Set<string>): Port | undefined }

export type BlockDef<B extends Block = Block> = {
  kind: B['kind']
  label: string
  info: string
  tab: 'Logic' | 'Math' | 'Time'
  python: string
  slotted?: boolean
  create(base: Pick<Base, 'x' | 'y' | 'w' | 'h' | 'scene'>, n: number): B
  inputs(b: B, show: Show | undefined, ports: Ports): Port[]
  outputs(b: B, show: Show | undefined, seen: Set<string>, ports: Ports): Port[]
  subtitle(b: B): string
  args?(b: B, show: Show, ports: Ports): unknown[]
  accepts?(source: Port, target: Port): boolean
}
