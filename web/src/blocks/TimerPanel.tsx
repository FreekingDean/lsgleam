import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import { formatDuration } from '../model/format'
import type { TimerBlock } from './timer'

export function TimerPanel({ block, onPatch }: Props & { block: TimerBlock }) {
  const h = Math.floor(block.seconds / 3600)
  const m = Math.floor((block.seconds % 3600) / 60)
  const s = Number((block.seconds % 60).toFixed(2))
  const set = (hours: number, minutes: number, secs: number) => onPatch({ seconds: hours * 3600 + minutes * 60 + secs })
  return (
    <>
      <NumField key={`h${block.seconds}`} label="Hours" value={h} onCommit={(v) => set(Math.max(0, v), m, s)} step={1} />
      <NumField key={`m${block.seconds}`} label="Minutes" value={m} onCommit={(v) => set(h, Math.max(0, v), s)} step={1} />
      <NumField key={`s${block.seconds}`} label="Seconds" value={s} onCommit={(v) => set(h, m, Math.max(0, v))} step={1} />
      <NumField label="Count to" value={block.countTo} onCommit={(countTo) => onPatch({ countTo: Math.max(1, Math.round(countTo)) })} step={1} />
      <div className="par">
        <label>At the end</label>
        <select value={block.end} onChange={(e) => onPatch({ end: e.target.value as TimerBlock['end'] })}>
          <option value="hold">hold at {block.countTo}</option>
          <option value="loop">loop back to 0</option>
        </select>
      </div>
      <div className="help">0 → {block.countTo} over {formatDuration(block.seconds)}; each step lasts {formatDuration(block.seconds / block.countTo)}. `count` is the whole step (0 for the first {formatDuration(block.seconds / block.countTo)}, {block.end === 'hold' ? `${block.countTo} once it ends` : `back to 0 when it loops`}), `value` the smooth 0…{block.countTo}, `progress` 0–1. A rising edge on reset restarts from 0; with run wired it only counts while run is above 0.5. Rebuilding the Timer (changing its settings or what feeds it) restarts it.</div>
    </>
  )
}
