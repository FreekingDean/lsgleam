import { NumberBox, NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { ValuesBlock } from './values'

export function ValuesPanel({ block, onPatch }: Props & { block: ValuesBlock }) {
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ValuesBlock['rows']) => onPatch({ rows: next })
  const setValue = (i: number, k: number, v: number) => rows(block.rows.map((r, n) => (n === i ? { ...r, values: steps.map((s) => (s === k ? v : r.values[s] ?? 0)) } : r)))
  return (
    <>
      <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <div className="positions-head">
        <h4>Values</h4>
        <button onClick={() => rows([...block.rows, { name: `value ${block.rows.length + 1}`, values: steps.map(() => 0) }])}>add</button>
      </div>
      {block.rows.map((r, i) => (
        <div key={`${i}:${block.rows.length}`} className="look">
          <div className="color-head">
            <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && rows(block.rows.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <button title="delete" disabled={block.rows.length === 1} onClick={() => rows(block.rows.filter((_, n) => n !== i))}>×</button>
          </div>
          <div className="color-steps">
            {steps.map((k) => <label key={k}><span>{k}</span><NumberBox value={r.values[k] ?? 0} onCommit={(v) => setValue(i, k, v)} /></label>)}
          </div>
        </div>
      ))}
      <div className="help">Each row is a signal output; the column follows the `index` input (wrapping). Wire Season into index and feed rows like "min" and "max" into a Range's tame/wild min and max.</div>
    </>
  )
}
