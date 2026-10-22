import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import { stepCycle, type CounterBlock, type CounterEnd } from './counter'

const whole = (v: number, min: number) => Math.max(min, Math.round(v))

export function CounterPanel({ block, onPatch }: Props & { block: CounterBlock }) {
  const forward = block.forward ?? 3
  const back = block.back ?? 1
  return (
    <>
      <NumField label="Max" value={block.max} onCommit={(max) => onPatch({ max: whole(max, 0) })} step={1} />
      <NumField label="Every N triggers" value={block.every ?? 1} onCommit={(every) => onPatch({ every: whole(every, 1) })} step={1} />
      <div className="par">
        <label>At the end</label>
        <select value={block.end ?? 'clamp'} onChange={(e) => onPatch({ end: e.target.value as CounterEnd })}>
          <option value="clamp">stay at max (0 1 2 3 3 3)</option>
          <option value="wrap">wrap to 0 (0 1 2 3 0 1)</option>
          <option value="bounce">bounce back (0 1 2 3 2 1 0 1)</option>
          <option value="steps">step forward and back (0 1 2 3 2 3 4 …)</option>
        </select>
      </div>
      {block.end === 'steps' && (
        <>
          <NumField label="Forward" value={forward} onCommit={(v) => onPatch({ forward: whole(v, 1), back: Math.min(back, whole(v, 1) - 1) })} step={1} />
          <NumField label="Back" value={back} onCommit={(v) => onPatch({ back: Math.min(whole(v, 0), forward - 1) })} step={1} />
          <div className="help">{stepCycle(block.max, forward, back).join(' ')} …</div>
        </>
      )}
      <div className="help">Every N rising edges on count step the index by one; at max it stays, wraps back to 0, bounces back down, or (step forward and back) climbs forward steps then drops back steps up to max and works its way down the same way. Reset (while high) zeroes it. Wire a beat in with every N to step once per N beats.</div>
    </>
  )
}
