import { useState } from 'react'
import type { SceneBlock, Show } from '../model/show'
import { roomsOf } from '../model/units'
import { outOfRooms } from '../model/wiring'

export function SceneRooms({ show, block, onPatch }: { show: Show; block: SceneBlock; onPatch: (patch: Partial<SceneBlock>) => void }) {
  const [note, setNote] = useState('')
  const rooms = roomsOf(show)
  if (rooms.length < 2) return null
  const picked = (block.rooms ?? []).filter((id) => rooms.some((r) => r.id === id))
  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((r) => r !== id) : [...picked, id]
    const gone = outOfRooms({ ...show, blocks: show.blocks.map((b) => (b.id === block.id ? { ...block, rooms: next } : b)) }, block.id).length
    setNote(gone ? `Unpatched ${gone} ${gone === 1 ? 'fixture' : 'fixtures'} outside these rooms (undo brings them back).` : '')
    onPatch({ rooms: next })
  }
  return (
    <>
      <div className="par">
        <label>Rooms</label>
        <div className="scene-rooms">
          {rooms.map((r) => <label key={r.id} className="toggle"><input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} /> {r.name}</label>)}
        </div>
      </div>
      <div className="help">{picked.length ? 'This scene only patches fixtures in the ticked rooms.' : 'No room ticked: this scene can patch fixtures in every room.'} Rooms run independently: a fixture only follows the scenes of its room.</div>
      {note && <div className="help warn">{note}</div>}
    </>
  )
}
