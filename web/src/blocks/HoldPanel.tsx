import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { HoldBlock } from './hold'

export function HoldPanel({ block, onPatch }: Props & { block: HoldBlock }) {
  return (
    <>
      <NumField label="Beats" value={block.beats} onCommit={(beats) => onPatch({ beats: Math.max(1, Math.round(beats)) })} step={1} />
      <div className="help">Wire a trigger (a drop, a downbeat) and a beat pulse. `hold` is 1 from the trigger until that many beats have passed.</div>
    </>
  )
}
