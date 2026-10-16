import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { StepsBlock } from './steps'

export function StepsPanel({ block, onPatch }: Props & { block: StepsBlock }) {
  return <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.round(v)) })} step={1} />
}
