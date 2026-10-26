import type { Props } from '../panels/shared'
import type { MixBlock } from './mix'

export function MixPanel({ block, onPatch }: Props & { block: MixBlock }) {
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={block.type} onChange={(e) => onPatch({ type: e.target.value as 'signal' | 'color' })}>
          <option value="signal">signal</option>
          <option value="color">colour</option>
        </select>
      </div>
      <div className="help">out = a × (1 − mix) + b × mix. Crossfade one value instead of a whole scene: a = the base value, b = the drop value, mix = a Fade of the drop (rise 0, fall 15) brought in as a scene input.</div>
    </>
  )
}
