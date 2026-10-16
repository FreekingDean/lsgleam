import type { PatternAdvance, Scene } from '../model/show'
import { type Props, Every } from '../panels/shared'
import type { LooksBlock } from './looks'

export function LooksPanel({ block, driven, onPatch }: Props & { block: LooksBlock }) {
  const update = (scenes: Scene[]) => onPatch({ scenes })
  const set = (i: number, patch: Partial<Scene>) => update(block.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  return (
    <>
      <div className="par">
        <label>Advance</label>
        <select value={block.advance} onChange={(e) => onPatch({ advance: e.target.value as PatternAdvance })}>
          <option value="step">by look index</option>
          <option value="trigger">on each next</option>
        </select>
      </div>
      <Every block={block} onPatch={onPatch} />
      <div className="positions-head">
        <h4>Looks</h4>
        <button onClick={() => update([...block.scenes, { name: `Q${block.scenes.length + 1}`, color: '#ffffff', window: [0, 1] }])}>add</button>
      </div>
      {block.scenes.map((s, i) => (
        <div key={i} className="look">
          <div className="look-head">
            <span className="position-index">{i}</span>
            <input value={s.name} onChange={(e) => set(i, { name: e.target.value })} />
            <button title="delete" disabled={block.scenes.length === 1} onClick={() => update(block.scenes.filter((_, k) => k !== i))}>×</button>
          </div>
          <div className="look-body">
            <input type="color" value={s.color} disabled={driven.has('color')} title={driven.has('color') ? 'colour comes from the wired color input' : undefined} style={driven.has('color') ? { opacity: 0.3 } : undefined} onChange={(e) => set(i, { color: e.target.value })} />
            <label>dimmer</label>
            <input type="number" min={0} max={1} step={0.05} value={s.window[0]} title="dimmer min" onChange={(e) => set(i, { window: [Number(e.target.value), s.window[1]] })} />
            <span>–</span>
            <input type="number" min={0} max={1} step={0.05} value={s.window[1]} title="dimmer max" onChange={(e) => set(i, { window: [s.window[0], Number(e.target.value)] })} />
          </div>
        </div>
      ))}
      <div className="help">Each scene is a look: a colour and a dimmer window (min, max). The `look` output carries both on one wire into any fixture or group; `wild` (0–1) widens the window toward 0–1, so a Hold after a drop goes extreme.</div>
    </>
  )
}
