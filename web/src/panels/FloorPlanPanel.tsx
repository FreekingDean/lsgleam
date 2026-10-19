import type { FloorPlan } from '../model/show'
import { movePlan, turnPlan } from '../model/floorplan'
import { formatLength } from '../model/format'

const NUDGE = 0.1

type Props = { plan?: FloorPlan; onFile: (file: File) => void; onChange: (plan: FloorPlan | undefined) => void; onCalibrate: () => void }

function PickFile({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  return <label className="file-button" title="a PDF or image of this floor's plan, drawn under the layout, on the simulator floor and on the lighting plot">{label}<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} /></label>
}

export function FloorPlanPanel({ plan, onFile, onChange, onCalibrate }: Props) {
  if (!plan) return <><h3>Floor plan</h3><div className="floorplan-tools"><PickFile label="floor plan… (PDF or image)" onFile={onFile} /></div></>
  const nudge = (dx: number, dz: number) => onChange(movePlan(plan, plan.x + dx, plan.z + dz))
  const set = (opacity: number) => opacity !== plan.opacity && onChange({ ...plan, opacity })
  return (
    <>
      <h3>Floor plan</h3>
      <div className="help">{formatLength(plan.width)} × {formatLength(plan.height)} · centre {plan.x}, {plan.z} m{plan.rotation ? ` · turned ${plan.rotation}°` : ''}</div>
      <div className="floorplan-tools">
        <button disabled={plan.locked} onClick={onCalibrate} title="click two points a known distance apart on the plan, then type the distance">set scale</button>
        <button disabled={plan.locked} onClick={() => onChange(turnPlan(plan, -90))} title="turn 90° anticlockwise">⟲ 90°</button>
        <button disabled={plan.locked} onClick={() => onChange(turnPlan(plan, 90))} title="turn 90° clockwise">⟳ 90°</button>
        {([['←', -NUDGE, 0], ['→', NUDGE, 0], ['↑', 0, -NUDGE], ['↓', 0, NUDGE]] as const).map(([label, dx, dz]) => <button key={label} disabled={plan.locked} onClick={() => nudge(dx, dz)} title="nudge 10 cm">{label}</button>)}
      </div>
      <div className="par">
        <label>Opacity</label>
        <input type="range" min={0.05} max={1} step={0.05} key={plan.opacity} defaultValue={plan.opacity} onPointerUp={(e) => set(Number(e.currentTarget.value))} onKeyUp={(e) => set(Number(e.currentTarget.value))} />
      </div>
      <div className="par">
        <label>Plan locked</label>
        <input type="checkbox" checked={plan.locked} onChange={(e) => onChange({ ...plan, locked: e.target.checked })} />
      </div>
      <div className="floorplan-tools">
        <PickFile label="replace…" onFile={onFile} />
        <button onClick={() => onChange(undefined)}>remove</button>
      </div>
      <div className="help">{plan.locked ? 'Locked: clicks go through to the canvas.' : 'Drag the plan on the layout to line it up with the rooms, then lock it.'}</div>
    </>
  )
}
