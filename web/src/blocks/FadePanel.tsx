import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { FadeBlock } from './fade'

export function FadePanel({ block, onPatch }: Props & { block: FadeBlock }) {
  return (
    <>
      <NumField label="Rise (s)" value={block.rise} onCommit={(v) => onPatch({ rise: Math.max(0, v) })} />
      <NumField label="Fall (s)" value={block.fall} onCommit={(v) => onPatch({ fall: Math.max(0, v) })} />
      <div className="par">
        <label>Curve</label>
        <select value={block.curve} onChange={(e) => onPatch({ curve: e.target.value as FadeBlock['curve'] })}>
          <option value="linear">linear (straight ramp, exact time)</option>
          <option value="smooth">smooth (fast start, eases in)</option>
        </select>
      </div>
      <div className="help">The output follows the signal in straight ramps: a full 0→1 change takes the rise time, 1→0 the fall time (0 = instant). E.g. drop → Fade (rise 0, fall 4) holds a drop and lets it fade out; its Not fades the base scene back in over the same 4 s. Needs TD's timeline playing.</div>
    </>
  )
}
