import { NumField } from '../panels/fields'
import { type Props, PatternFields } from '../panels/shared'
import type { PatternBlock } from './pattern'

export function PatternPanel({ block, driven, onPatch, onResetPattern }: Props & { block: PatternBlock }) {
  return (
    <>
      <NumField label="Slots" value={block.slots} onCommit={(v) => onPatch({ slots: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <PatternFields block={block} driven={driven} onPatch={onPatch} onResetPattern={onResetPattern} />
      <div className="help">Each slot outputs signal × mask. “By step index” sits on whatever step the index says (wire a beat). “On each trigger” moves one step every time the trigger rises (wire an onset).</div>
    </>
  )
}
