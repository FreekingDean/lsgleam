import { type InputType, INPUT_TYPES } from '../model/show'
import type { Props } from '../panels/shared'
import type { InputBlock } from './input'

export function InputPanel({ block, onPatch }: Props & { block: InputBlock }) {
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={block.type} onChange={(e) => onPatch({ type: e.target.value as InputType })}>
          {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="help">Shows up as an input port on the node of the scene or composite it lives in. Wire a value into that port outside; it comes out here. The name is the port label.</div>
    </>
  )
}
