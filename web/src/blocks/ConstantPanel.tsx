import { NumberBox, NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { ConstantBlock } from './constant'

export function ConstantPanel({ block, onPatch }: Props & { block: ConstantBlock }) {
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={block.type} onChange={(e) => onPatch({ type: e.target.value as 'signal' | 'index' })}>
          <option value="signal">signal (0–1)</option>
          <option value="index">index (integer)</option>
        </select>
      </div>
      {block.type === 'signal' ? (
        <div className="par">
          <label>Value</label>
          <div className="slider">
            <input type="range" min={0} max={1} step={0.01} value={block.value} onChange={(e) => onPatch({ value: Number(e.target.value) })} />
            <NumberBox value={block.value} onCommit={(value) => onPatch({ value })} />
          </div>
        </div>
      ) : (
        <NumField label="Value" value={block.value} onCommit={(value) => onPatch({ value: Math.round(value) })} step={1} />
      )}
      <NumField label="Pulse (Hz)" value={block.pulse} onCommit={(pulse) => onPatch({ pulse: Math.max(0, pulse) })} />
      <div className="help">A test source. Pulse above 0 makes it a square wave between 0 and the value at that rate, handy for triggers and beats.</div>
    </>
  )
}
