import type { BoxBlock, Floor, FloorPlan, Show } from './show'
import { unitsOf } from './units'

export const FLOOR_1: Floor = { id: 'floor1', name: 'Floor 1', elevation: 0 }

export const floorsOf = (show: Show) => [...(show.floors?.length ? show.floors : [FLOOR_1])].sort((a, b) => a.elevation - b.elevation)

export function floorAt(show: Show, y: number) {
  const floors = floorsOf(show)
  return floors.findLast((f) => f.elevation <= y + 0.01) ?? floors[0]
}

export const floorOf = (show: Show, id: string) => floorsOf(show).find((f) => f.id === id) ?? floorsOf(show)[0]

export const roomFloor = (show: Show, room: BoxBlock) => floorAt(show, room.sim?.position[1] ?? 0)

export const unitsOn = (show: Show, floor: string) => unitsOf(show).filter((u) => floorAt(show, u.placement.position[1]).id === floor)

const setFloors = (show: Show, floors: Floor[]): Show => ({ ...show, floors })

export const patchFloor = (show: Show, id: string, patch: Partial<Floor>) => setFloors(show, floorsOf(show).map((f) => (f.id === id ? { ...f, ...patch } : f)))

export function withPlan(show: Show, id: string, plan: FloorPlan | null): Show {
  return setFloors(show, floorsOf(show).map((f) => {
    if (f.id !== id) return f
    const { floorplan: _old, ...rest } = f
    return plan ? { ...rest, floorplan: plan } : rest
  }))
}

export function addFloor(show: Show): [Show, Floor] {
  const floors = floorsOf(show)
  const n = Math.max(0, ...floors.map((f) => Number(f.id.replace(/\D/g, '')) || 0)) + 1
  const top = floors.at(-1)!
  const height = Math.max(4, ...unitsOn(show, top.id).map((u) => u.placement.position[1] - top.elevation + (u.block.kind === 'box' ? u.block.size[2] : 0)))
  const floor = { id: `floor${n}`, name: `Floor ${floors.length + 1}`, elevation: Math.round((top.elevation + height + 0.5) * 10) / 10 }
  return [setFloors(show, [...floors, floor]), floor]
}

export const removeFloor = (show: Show, id: string) => setFloors(show, floorsOf(show).filter((f) => f.id !== id))

export function moveFloor(show: Show, id: string, elevation: number): Show {
  const dy = elevation - floorOf(show, id).elevation
  const keys = new Set(unitsOn(show, id).map((u) => u.key))
  const blocks = show.blocks.map((b) => (keys.has(b.id) && b.sim ? { ...b, sim: { ...b.sim, position: [b.sim.position[0], Math.round((b.sim.position[1] + dy) * 1000) / 1000, b.sim.position[2]] as [number, number, number] } } : b))
  return patchFloor({ ...show, blocks }, id, { elevation })
}
