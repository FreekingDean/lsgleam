import { LengthField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { BoxBlock } from './box'
import { FloorPlanPanel } from '../panels/FloorPlanPanel'

export function BoxPanel({ block, onPatch, onFloorPlan, onCalibrate }: Props & { block: BoxBlock }) {
  const set = (i: number, v: number) => { const size = [...block.size] as [number, number, number]; size[i] = Math.max(0.1, v); onPatch({ size }) }
  return (
    <>
      <LengthField label="Width (m)" value={block.size[0]} onCommit={(v) => set(0, v)} />
      <LengthField label="Depth (m)" value={block.size[1]} onCommit={(v) => set(1, v)} />
      <LengthField label="Height (m)" value={block.size[2]} onCommit={(v) => set(2, v)} />
      <div className="par">
        <label>Locked</label>
        <input type="checkbox" checked={block.locked} onChange={(e) => onPatch({ locked: e.target.checked })} />
      </div>
      <div className="help">A room, stage or bar. Lock it once placed so dragging on it pans the view.</div>
      {onFloorPlan && onCalibrate && <FloorPlanPanel plan={block.floorplan} onFile={onFloorPlan} onChange={(floorplan) => onPatch({ floorplan })} onCalibrate={onCalibrate} />}
    </>
  )
}

