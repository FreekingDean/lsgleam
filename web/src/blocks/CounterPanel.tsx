import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { CounterBlock } from './counter'

export function CounterPanel({ block, onPatch }: Props & { block: CounterBlock }) {
  return (
    <>
      <NumField label="Max" value={block.max} onCommit={(max) => onPatch({ max: Math.max(0, Math.round(max)) })} step={1} />
      <div className="help">Each rising edge on count adds one, clamped at max; reset (while high) zeroes it. Wire the output into Scene select's index to step through scenes.</div>
    </>
  )
}
