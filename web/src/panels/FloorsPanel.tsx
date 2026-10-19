import type { Show } from '../model/show'
import { addFloor, floorOf, floorsOf, moveFloor, patchFloor, removeFloor, unitsOn, withPlan } from '../model/floors'
import { Field, LengthField } from './fields'
import { FloorPlanPanel } from './FloorPlanPanel'

type Props = { show: Show; active: string; onActive: (id: string) => void; onCommit: (next: Show) => void; onFile: (file: File) => void; onCalibrate: () => void }

export function FloorsPanel({ show, active, onActive, onCommit, onFile, onCalibrate }: Props) {
  const floors = floorsOf(show)
  const floor = floorOf(show, active)
  const add = () => {
    const [next, f] = addFloor(show)
    onCommit(next)
    onActive(f.id)
  }
  return (
    <>
      <h3>Floors · {floors.length}</h3>
      {floors.length > 1 && <div className="floorplan-tools">{floors.map((f) => <button key={f.id} className={f.id === floor.id ? 'on' : ''} onClick={() => onActive(f.id)}>{f.name}</button>)}</div>}
      <Field key={`${floor.id}:${floor.name}`} label="Name" value={floor.name} onCommit={(name) => name.trim() && onCommit(patchFloor(show, floor.id, { name: name.trim() }))} />
      <LengthField key={`${floor.id}:${floor.elevation}`} label="Elevation (m)" value={floor.elevation} onCommit={(m) => onCommit(moveFloor(show, floor.id, m))} />
      <div className="floorplan-tools">
        <button onClick={add} title="add a floor above the top one; new rooms and fixtures go onto the floor you are viewing">+ floor</button>
        <button disabled={floors.length < 2 || unitsOn(show, floor.id).length > 0} onClick={() => onCommit(removeFloor(show, floor.id))} title="only an empty floor can be deleted">delete floor</button>
      </div>
      <FloorPlanPanel plan={floor.floorplan} onFile={onFile} onChange={(plan) => onCommit(withPlan(show, floor.id, plan ?? null))} onCalibrate={onCalibrate} />
    </>
  )
}
