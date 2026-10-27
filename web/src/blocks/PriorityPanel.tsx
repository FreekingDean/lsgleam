import { Field } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { PriorityBlock } from './priority'

export function PriorityPanel({ block, onPatch }: Props & { block: PriorityBlock }) {
  return (
    <>
      <Field key={block.names.join()} label="Inputs" value={block.names.join(', ')} onCommit={(v) => { const names = v.split(',').map((s) => s.trim()).filter(Boolean); if (names.length) onPatch({ names }) }} />
      <div className="help">Outputs the index of the highest input that is over half way up; later inputs win over earlier ones. Nothing up: 0. Comma-separated names, one input each (e.g. DMX faders 1–4, one per section of the show).</div>
    </>
  )
}
