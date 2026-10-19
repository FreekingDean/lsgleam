import type { SceneBlock, Show } from '../model/show'
import { roomsOf } from '../model/units'

export function SceneRooms({ show, block, onPatch }: { show: Show; block: SceneBlock; onPatch: (patch: Partial<SceneBlock>) => void }) {
  const rooms = roomsOf(show)
  if (rooms.length < 2) return null
  const picked = (block.rooms ?? []).filter((id) => rooms.some((r) => r.id === id))
  const toggle = (id: string) => onPatch({ rooms: picked.includes(id) ? picked.filter((r) => r !== id) : [...picked, id] })
  return (
    <>
      <h3>Rooms</h3>
      <div className="signals">
        {rooms.map((r) => (
          <label key={r.id}>
            <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
            {r.name}
          </label>
        ))}
      </div>
      <div className="help">{picked.length ? 'This scene only patches fixtures in the ticked rooms; ticking a room unpatches fixtures outside them (undo brings them back).' : 'No room ticked: this scene can patch fixtures in every room.'} A fixture only follows the scenes patched to it.</div>
    </>
  )
}
