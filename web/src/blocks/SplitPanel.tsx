import type { Props } from '../panels/shared'
import { splitSource, type SplitBlock } from './split'
import type { Ports } from './types'

export function SplitPanel({ show, block, ports }: Props & { block: SplitBlock; ports: Ports }) {
  const from = splitSource(show, block, ports)
  return <div className="help">{from ? `One output per slot of ${from.name}, in order, with its names and type.` : 'No Combine upstream yet: wire a Combine into in, directly or through per-channel transforms and multichannel Inputs and Outputs.'}</div>
}
