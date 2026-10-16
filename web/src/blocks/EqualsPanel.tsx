import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { EqualsBlock } from './equals'

export function EqualsPanel({ block, onPatch }: Props & { block: EqualsBlock }) {
  return (
    <>
      <NumField label="Value" value={block.value} onCommit={(value) => onPatch({ value: Math.round(value) })} step={1} />
      <div className="help">1 while the index equals the value. Wire BLT's song index in and a scene's `on` out.</div>
    </>
  )
}
