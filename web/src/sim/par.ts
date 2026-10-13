import * as THREE from 'three'
import type { Placement } from '../show'

const MAX_INTENSITY = 22
const BEAM_ANGLE = Math.PI / 5
const BEAM_OPACITY = 0.3
const BEAM_LENGTH = 8

export type Light = { object: THREE.Group; update(v: Record<string, number>): void; place(p: Placement): void; dispose(): void }

export function place(object: THREE.Object3D, p: Placement) {
  object.position.fromArray(p.position)
  object.rotation.set(...(p.rotation.map((d) => (d * Math.PI) / 180) as [number, number, number]))
}

export function placementOf(object: THREE.Object3D): Placement {
  const d = 180 / Math.PI
  return { position: [object.position.x, object.position.y, object.position.z], rotation: [object.rotation.x * d, object.rotation.y * d, object.rotation.z * d] }
}

export function disposeAll(object: THREE.Object3D) {
  object.traverse((o) => {
    const m = o as THREE.Mesh
    m.geometry?.dispose()
    if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose())
  })
}

export function beam(radius: number, height: number) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 32, 1, true), mat)
  mesh.position.y = -height / 2
  return { mesh, mat }
}

export function spot(angle: number) {
  const light = new THREE.SpotLight(0xffffff, 0, 0, angle, 0.4, 0)
  const target = new THREE.Object3D()
  target.position.set(0, -1, 0)
  light.target = target
  return { light, target }
}

export class Par implements Light {
  object = new THREE.Group()
  private body = new THREE.MeshStandardMaterial({ color: 0x202028, metalness: 0.5, roughness: 0.5, emissive: 0x000000 })
  private lens = new THREE.MeshBasicMaterial({ color: 0x000000 })
  private beam: THREE.MeshBasicMaterial
  private light: THREE.SpotLight
  private color = new THREE.Color()

  constructor(p: Placement) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 24), this.body)
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), this.lens)
    lens.position.y = -0.112
    lens.rotation.x = -Math.PI / 2
    const b = beam(BEAM_LENGTH * Math.tan(BEAM_ANGLE), BEAM_LENGTH)
    const s = spot(BEAM_ANGLE)
    this.beam = b.mat
    this.light = s.light
    this.object.add(body, lens, b.mesh, s.light, s.target)
    place(this.object, p)
  }

  update(v: Record<string, number>) {
    const dim = v.Dimmer ?? 1
    this.color.setRGB(v.Red ?? 0, v.Green ?? 0, v.Blue ?? 0, THREE.SRGBColorSpace)
    this.light.color.copy(this.color)
    this.light.intensity = dim * MAX_INTENSITY
    this.lens.color.copy(this.color).multiplyScalar(Math.min(1, dim * 1.4))
    this.body.emissive.copy(this.color)
    this.body.emissiveIntensity = dim
    this.beam.color.copy(this.color)
    this.beam.opacity = dim * BEAM_OPACITY
  }

  place(p: Placement) {
    place(this.object, p)
  }

  dispose() {
    disposeAll(this.object)
  }
}
