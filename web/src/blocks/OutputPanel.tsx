import { type InputType, INPUT_TYPES } from '../model/show'
import type { Props } from '../panels/shared'
import type { OutputBlock } from './output'

export function OutputPanel({ block, onPatch }: Props & { block: OutputBlock }) {
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={block.type} onChange={(e) => onPatch({ type: e.target.value as InputType })}>
          {INPUT_TYPES.filter((t) => t !== 'audio').map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="help">Shows up as an output port on this composite's node. Whatever you wire in here comes out of that port. The name is the port label.</div>
    </>
  )
}
