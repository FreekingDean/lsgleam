import * as THREE from 'three'
import type { Placement } from '../model/show'
import { beam, disposeAll, place, spot, type Light, type Spot } from './par'
import type { Sim } from '../model/ofl'

const MAX_INTENSITY = 40
const BEAM_LENGTH = 8
const BEAM_OPACITY = 0.35

export class Head implements Light {
  object = new THREE.Group()
  private yoke = new THREE.Group()
  private head = new THREE.Group()
  private lens = new THREE.MeshBasicMaterial({ color: 0x000000 })
  private beam: THREE.MeshBasicMaterial
  spot: Spot
  private color = new THREE.Color()
  private pan: number
  private tilt: number

  constructor(p: Placement, sim: Sim) {
    this.pan = sim.pan
    this.tilt = sim.tilt
    const angle = (sim.beam / 2) * (Math.PI / 180)
    this.spot = spot(this.head, angle)
    const metal = new THREE.MeshStandardMaterial({ color: 0x202028, metalness: 0.6, roughness: 0.4 })
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), metal)
    const arms = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.06), metal)
    arms.position.y = -0.2
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 20), metal)
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), this.lens)
    lens.position.y = -0.151
    lens.rotation.x = -Math.PI / 2
    const b = beam(BEAM_LENGTH * Math.tan(angle), BEAM_LENGTH)
    this.beam = b.mat
    this.head.add(body, lens, b.mesh)
    this.head.position.y = -0.25
    this.yoke.add(arms, this.head)
    this.yoke.position.y = -0.05
    this.object.add(base, this.yoke)
    place(this.object, p)
  }

  update(v: Record<string, number>) {
    const dim = v.intensity ?? 1
    this.yoke.rotation.y = ((v.pan ?? 0.5) - 0.5) * this.pan * (Math.PI / 180)
    this.head.rotation.x = ((v.tilt ?? 0.5) - 0.5) * this.tilt * (Math.PI / 180)
    this.color.setRGB(v.red ?? 1, v.green ?? 1, v.blue ?? 1, THREE.SRGBColorSpace)
    this.spot.color.copy(this.color)
    this.spot.intensity = dim * MAX_INTENSITY
    this.lens.color.copy(this.color).multiplyScalar(Math.min(1, dim * 1.4))
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
