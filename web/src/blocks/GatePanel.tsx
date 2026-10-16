import { NumberBox } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { GateBlock } from './gate'

export function GatePanel({ block, onPatch }: Props & { block: GateBlock }) {
  return (
    <>
      <div className="par">
        <label>Threshold</label>
        <div className="slider">
          <input type="range" min={0} max={0.99} step={0.01} defaultValue={block.threshold} onPointerUp={(e) => onPatch({ threshold: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => onPatch({ threshold: Number((e.target as HTMLInputElement).value) })} />
          <NumberBox value={block.threshold} max={0.99} onCommit={(threshold) => onPatch({ threshold })} />
        </div>
      </div>
      <div className="par">
        <label>Rescale</label>
        <input type="checkbox" checked={block.rescale} onChange={(e) => onPatch({ rescale: e.target.checked })} />
      </div>
      <div className="help">Below the threshold the output is 0. Rescale on: the part above it is stretched back to 0–1, so lights fade up from nothing. Off: the signal passes through unchanged once it's over.</div>
    </>
  )
}
