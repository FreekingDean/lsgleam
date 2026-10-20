import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { CounterBlock, CounterEnd } from './counter'

export function CounterPanel({ block, onPatch }: Props & { block: CounterBlock }) {
  return (
    <>
      <NumField label="Max" value={block.max} onCommit={(max) => onPatch({ max: Math.max(0, Math.round(max)) })} step={1} />
      <div className="par">
        <label>At the end</label>
        <select value={block.end ?? 'clamp'} onChange={(e) => onPatch({ end: e.target.value as CounterEnd })}>
          <option value="clamp">stay at max (0 1 2 3 3 3)</option>
          <option value="wrap">wrap to 0 (0 1 2 3 0 1)</option>
          <option value="bounce">bounce back (0 1 2 3 2 1 0 1)</option>
        </select>
      </div>
      <div className="help">Each rising edge on count steps the index by one; at max it stays, wraps back to 0, or bounces back down to 0 and up again (a zigzag). Reset (while high) zeroes it. Wire the output into Scene select's index to step through scenes.</div>
    </>
  )
}
