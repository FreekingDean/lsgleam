import { LengthField, NumField } from './fields'
import type { Placement } from './show'
import { ROTATIONS, turned, wrap, type Vec } from './rotation'

export function RotateButtons({ onTurn }: { onTurn: (axis: 0 | 1 | 2, by: number) => void }) {
  return (
    <div className="par">
      <label>Rotate</label>
      <div className="sim-modes">
        {ROTATIONS.map((r) => <button key={r.label} title={r.title} onClick={() => onTurn(r.axis, r.by)}>{r.label}</button>)}
      </div>
    </div>
  )
}

export function PlacementEditor({ placement, onPlace, floor }: { placement: Placement; onPlace: (p: Placement) => void; floor?: boolean }) {
  const move = (i: number, v: number) => { const position = [...placement.position] as Vec; position[i] = v; onPlace({ ...placement, position }) }
  const rotate = (i: number, v: number) => { const rotation = [...placement.rotation] as Vec; rotation[i] = wrap(v); onPlace({ ...placement, rotation }) }
  const key = JSON.stringify(placement)
  return (
    <div key={key}>
      <LengthField label={floor ? 'Floor (m)' : 'Height (m)'} value={placement.position[1]} onCommit={(v) => move(1, v)} />
      <LengthField label="X (m)" value={placement.position[0]} onCommit={(v) => move(0, v)} />
      <LengthField label="Z (m)" value={placement.position[2]} onCommit={(v) => move(2, v)} />
      <NumField label="Turn (°)" value={placement.rotation[1]} onCommit={(v) => rotate(1, v)} step={15} />
      <NumField label="Tilt (°)" value={placement.rotation[0]} onCommit={(v) => rotate(0, v)} step={15} />
      <NumField label="Roll (°)" value={placement.rotation[2]} onCommit={(v) => rotate(2, v)} step={15} />
      <RotateButtons onTurn={(axis, by) => onPlace(turned(placement, axis, by))} />
    </div>
  )
}
