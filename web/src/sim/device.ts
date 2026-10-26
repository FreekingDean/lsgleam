import * as THREE from 'three'
import type { Kind, Placement } from '../model/show'
import { disposeAll, place, type Light } from './par'

const SIZES: Partial<Record<Kind, [number, number, number]>> = { board: [0.2, 0.05, 0.12], dmxin: [0.5, 0.08, 0.3], artnet: [0.25, 0.06, 0.15], audio: [0.3, 0.05, 0.2], audiosource: [0.33, 0.12, 0.42] }
const COLORS: Partial<Record<Kind, number>> = { board: 0xffd24a, dmxin: 0x5c8ed6, artnet: 0x5c8ed6, audio: 0xe06c6c, audiosource: 0x777788 }

export class Device implements Light {
  object = new THREE.Group()

  constructor(kind: Kind, p: Placement, size?: [number, number, number]) {
    if (size) {
      const [w, d, h] = size
      const shape = new THREE.BoxGeometry(w, h, d)
      const wall = new THREE.MeshStandardMaterial({ color: 0x9a9aa4, roughness: 0.9, side: THREE.BackSide })
      const floor = new THREE.MeshStandardMaterial({ color: 0x74747c, roughness: 0.9, side: THREE.BackSide })
      const shell = new THREE.Mesh(shape, [wall, wall, wall, floor, wall, wall])
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shape), new THREE.LineBasicMaterial({ color: 0x55555f }))
      edges.raycast = () => {}
      shell.position.y = edges.position.y = h / 2 + 0.003
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
