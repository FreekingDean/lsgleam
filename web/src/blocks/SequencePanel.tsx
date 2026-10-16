import { Field, NumField } from '../panels/fields'
import { type Props, Every } from '../panels/shared'
import type { SequenceBlock } from './sequence'

export function SequencePanel({ block, onPatch }: Props & { block: SequenceBlock }) {
  const parse = (text: string) => text.split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n))
  return (
    <>
      <Field label="Values" value={block.values.join(' ')} onCommit={(v) => onPatch({ values: parse(v) })} />
      <NumField label="Unit" value={block.unit} onCommit={(unit) => onPatch({ unit })} />
      <NumField label="Center" value={block.center} onCommit={(center) => onPatch({ center })} />
      <Every block={block} onPatch={onPatch} />
      <div className="help">Each trigger moves to the next value and wraps. Output is center + value × unit, so “1 -1 2” with unit 0.05 nudges right, left, right twice as far. `reset` jumps back to the first value.</div>
    </>
  )
}
