import * as THREE from 'three'
import { strToU8, zipSync } from 'fflate'
import type { Placement, Show } from '../model/show'
import type { CompiledMode } from '../model/ofl'
import type { FixtureProfile } from '../model/fixtures'
import { roomsOf, simFixtures, simTubes } from '../model/units'
import { floorAt, floorsOf, roomFloor } from '../model/floors'
import { gdtfFile, gdtfMode, gdtfOf } from '../model/gdtf'
import { glbOf } from '../model/glb'
import { el, fixed, uuidOf, xml, type Node } from '../model/xml'
import { curveOf } from '../sim/tube'
import { download } from '../td/blt'
import { itemsOf } from './plan'

const Z_UP = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1)

const transform = (p: Placement) => new THREE.Matrix4().compose(new THREE.Vector3(...p.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rotation.map((d) => (d * Math.PI) / 180) as [number, number, number]))), new THREE.Vector3(1, 1, 1))

export function mvrMatrix(p: Placement) {
  const m = Z_UP.clone().multiply(transform(p)).multiply(Z_UP.clone().transpose()).elements
  const col = (k: number, s = 1) => `{${[0, 1, 2].map((r) => fixed(m[k * 4 + r] * s)).join(',')}}`
  return `${col(0)}${col(1)}${col(2)}${col(3, 1000)}`
}

const IDENTITY = '{1.000000,0.000000,0.000000}{0.000000,1.000000,0.000000}{0.000000,0.000000,1.000000}{0.000000,0.000000,0.000000}'

const sceneObject = (key: string, name: string, file: string) => el('SceneObject', { uuid: uuidOf(`lsgleam:object:${key}`), name }, [el('Matrix', {}, [IDENTITY]), el('Geometries', {}, [el('Geometry3D', { fileName: file })])])

export function fixtureIds(show: Show) {
  const items = itemsOf(show).filter((i) => i.mark === 'fixture')
  const letters = [...new Set(items.map((i) => i.id.replace(/\d+$/, '')))].sort()
  const n = (id: string) => Number(id.match(/\d+$/)?.[0] ?? 0)
  const base = items.some((i) => n(i.id) > 99) ? 1000 : 100
  return new Map(items.map((i) => [i.key, { label: i.id, unit: n(i.id), fid: (letters.indexOf(i.id.replace(/\d+$/, '')) + 1) * base + n(i.id) }]))
}

export function mvrFiles(show: Show, plans: Record<string, Uint8Array> = {}) {
  const files: Record<string, Uint8Array> = {}
  const fixtures = simFixtures(show)
  const ids = fixtureIds(show)
  const types = new Map<string, { profile: FixtureProfile; modes: CompiledMode[] }>()
  for (const f of fixtures) {
    const t = types.get(f.profile.id) ?? { profile: f.profile, modes: [] }
    if (!t.modes.includes(f.mode)) t.modes.push(f.mode)
    types.set(f.profile.id, t)
  }
  for (const { profile, modes } of types.values()) files[gdtfFile(profile)] = gdtfOf(profile, modes)
  const glb = (name: string, geometry: THREE.BufferGeometry, color: [number, number, number, number], image?: Uint8Array) => {
    files[name] = glbOf(geometry, color, image)
    geometry.dispose()
    return name
  }
  const layers = floorsOf(show).map((floor) => {
    const children: Node[] = []
    for (const f of fixtures.filter((x) => floorAt(show, x.placement.position[1]).id === floor.id)) {
      const id = ids.get(f.key)
      children.push(el('Fixture', { uuid: uuidOf(`lsgleam:fixture:${f.key}`), name: `${id?.label ?? f.key} ${f.name}` }, [
        el('Matrix', {}, [mvrMatrix(f.placement)]),
        el('GDTFSpec', {}, [gdtfFile(f.profile)]),
        el('GDTFMode', {}, [gdtfMode(f.mode)]),
        el('FixtureID', {}, [`${id?.fid ?? 0}`]),
        el('FixtureIDNumeric', {}, [`${id?.fid ?? 0}`]),
        el('UnitNumber', {}, [`${id?.unit ?? 0}`]),
        ...(f.universe === null ? [] : [el('Addresses', {}, [el('Address', { break: 0 }, [`${f.universe * 512 + f.address}`])])]),
        el('CustomId', {}, [`${id?.fid ?? 0}`]),
        el('CustomIdType', {}, ['1']),
      ]))
    }
    for (const room of roomsOf(show).filter((r) => roomFloor(show, r).id === floor.id)) {
      const [w, d, h] = room.size
      const box = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0).applyMatrix4(transform(room.sim ?? { position: [0, 0, 0], rotation: [0, 0, 0] }))
      children.push(sceneObject(room.id, room.name, glb(`room-${room.id}.glb`, box, [0.6, 0.6, 0.64, 1])))
    }
    for (const t of simTubes(show).filter((x) => floorAt(show, x.placement.position[1]).id === floor.id)) {
      const tube = new THREE.TubeGeometry(curveOf(t.path), Math.max(8, t.path.length * 8), 0.02, 8, false).applyMatrix4(transform(t.placement))
      children.push(sceneObject(t.key, t.name, glb(`tube-${t.key}.glb`, tube, [0.86, 0.86, 0.86, 1])))
    }
    const plan = floor.floorplan
    if (plan && plans[floor.id]) {
      const plane = new THREE.PlaneGeometry(1, 1).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(plan.x, floor.elevation + 0.006, plan.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, (-plan.rotation * Math.PI) / 180, 0, 'YXZ')), new THREE.Vector3(plan.width, plan.height, 1)))
      children.push(sceneObject(`plan:${floor.id}`, `${floor.name} plan`, glb(`plan-${floor.id}.glb`, plane, [1, 1, 1, 1], plans[floor.id])))
    }
    return el('Layer', { uuid: uuidOf(`lsgleam:layer:${floor.id}`), name: floor.name }, children.length ? [el('ChildList', {}, children)] : [])
  })
  const scene = el('GeneralSceneDescription', { verMajor: 1, verMinor: 6, provider: 'lsgleam', providerVersion: '1' }, [el('Scene', {}, [el('Layers', {}, layers)])])
  files['GeneralSceneDescription.xml'] = strToU8(xml(scene))
  return files
}

export const mvrOf = (show: Show, plans: Record<string, Uint8Array> = {}) => zipSync(mvrFiles(show, plans))

async function jpeg(src: string) {
  const img = new Image()
  img.src = src
  await img.decode()
  const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight })
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85))
  return new Uint8Array(await blob!.arrayBuffer())
}

export async function exportMvr(show: Show) {
  const plans = Object.fromEntries(await Promise.all(floorsOf(show).flatMap((f) => (f.floorplan ? [jpeg(f.floorplan.src).then((bytes) => [f.id, bytes] as const)] : []))))
  download('lsgleam-show.mvr', mvrOf(show, plans), 'application/octet-stream')
}
