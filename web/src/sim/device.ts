import * as THREE from 'three'
import type { Kind, Placement } from '../show'
import { disposeAll, place, type Light } from './par'

const SIZES: Partial<Record<Kind, [number, number, number]>> = { board: [0.2, 0.05, 0.12], dmxin: [0.5, 0.08, 0.3], artnet: [0.25, 0.06, 0.15], audio: [0.3, 0.05, 0.2], cdj: [0.33, 0.12, 0.42] }
const COLORS: Partial<Record<Kind, number>> = { board: 0xffd24a, dmxin: 0x5c8ed6, artnet: 0x5c8ed6, audio: 0xe06c6c, cdj: 0x777788 }

export class Device implements Light {
  object = new THREE.Group()

  constructor(kind: Kind, p: Placement, size?: [number, number, number]) {
    if (size) {
      const [w, d, h] = size
      const shape = new THREE.BoxGeometry(w, h, d)
      const shell = new THREE.Mesh(shape, new THREE.MeshLambertMaterial({ color: 0x8a8a98, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }))
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shape), new THREE.LineBasicMaterial({ color: 0x6a6a78 }))
      shell.position.y = edges.position.y = h / 2
      this.object.add(shell, edges)
      this.place(p)
      return
    }
    const [w, h, d] = SIZES[kind] ?? [0.3, 0.1, 0.3]
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: COLORS[kind] ?? 0x888888, roughness: 0.6 }))
    box.position.y = h / 2
    this.object.add(box)
    this.place(p)
  }

  update() {}

  place(p: Placement) {
    place(this.object, p)
  }

  dispose() {
    disposeAll(this.object)
  }
}
