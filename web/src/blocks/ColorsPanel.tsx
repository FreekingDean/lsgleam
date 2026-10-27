import { ColorExtras, NumField, litStyle } from '../panels/fields'
import { BLACK, colorOf } from '../model/format'
import type { Color } from '../model/show'
import type { Props } from '../panels/shared'
import type { ColorsBlock } from './colors'

export function ColorsPanel({ block, onPatch, onOpenPalette }: Props & { block: ColorsBlock }) {
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ColorsBlock['rows']) => onPatch({ rows: next })
  const setColor = (i: number, k: number, color: Color) => rows(block.rows.map((r, n) => (n === i ? { ...r, colors: steps.map((s) => (s === k ? color : r.colors[s] ?? BLACK)) } : r)))
  return (
    <>
      <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <div className="par"><label /><button onClick={() => onOpenPalette(block.id)} title="or double-click the node">palette view</button></div>
      <div className="positions-head">
        <h4>Colours</h4>
        <button onClick={() => rows([...block.rows, { name: `colour ${block.rows.length + 1}`, colors: steps.map(() => colorOf('#ffffff')) }])}>add</button>
      </div>
      {block.rows.map((r, i) => (
        <div key={`${i}:${block.rows.length}`} className="look">
          <div className="color-head">
            <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && rows(block.rows.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <button title="delete" disabled={block.rows.length === 1} onClick={() => rows(block.rows.filter((_, n) => n !== i))}>×</button>
          </div>
          <div className="color-steps">
            {steps.map((k) => {
              const color = r.colors[k] ?? BLACK
              return <label key={k}><span>{k}</span><input type="color" className="lit" style={litStyle(color)} title={`index ${k}`} value={color.hex} onChange={(e) => setColor(i, k, { ...color, hex: e.target.value })} /><ColorExtras value={color} onCommit={(c) => setColor(i, k, c)} /></label>
            })}
          </div>
        </div>
      ))}
      <div className="help">Each row is a colour output (red, green, blue from the swatch, plus white, amber and UV as DMX 0–255, sent as set); the column follows the `index` input (wrapping), so wire a song or section index in and each row gives that step's colour. Feed them into scene Colour inputs, then into a fixture output's `color` or a Looks block's `color`.</div>
    </>
  )
}
