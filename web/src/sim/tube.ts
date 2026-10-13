import * as THREE from 'three'
import type { Placement, Point } from '../show'
import { disposeAll, place, type Light } from './par'

export function curveOf(path: Point[]) {
  const curve = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 1; i < path.length; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...path[i - 1]), new THREE.Vector3(...path[i])))
  return curve
}

export function ledPositions(path: Point[], leds: number) {
  const curve = curveOf(path)
  return Array.from({ length: leds }, (_, i) => curve.getPointAt(leds === 1 ? 0.5 : (i + 0.5) / leds))
}

export class Tube implements Light {
  object = new THREE.Group()
  private beads: THREE.InstancedMesh
  private glow: THREE.InstancedMesh
  private count: number
  private color = new THREE.Color()

  constructor(path: Point[], leds: number, p: Placement) {
    this.count = leds
    const curve = curveOf(path)
    const body = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, path.length * 8), 0.03, 8, false), new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.25, roughness: 0.3, depthWrite: false }))
    this.beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial(), leds)
    const overlap = Math.max(1, (0.14 * leds) / (curve.getLength() || 1))
    this.glow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35 / overlap, blending: THREE.AdditiveBlending, depthWrite: false }), leds)
    const m = new THREE.Matrix4()
    ledPositions(path, leds).forEach((at, i) => {
      m.makeTranslation(at.x, at.y, at.z)
      this.beads.setMatrixAt(i, m)
      this.glow.setMatrixAt(i, m)
    })
    this.pixels(() => [0.08, 0.08, 0.08])
    this.object.add(body, this.beads, this.glow)
    this.place(p)
  }

  update() {}

  pixels(rgb: (i: number) => [number, number, number]) {
    for (let i = 0; i < this.count; i++) {
      const [r, g, b] = rgb(i)
      this.beads.setColorAt(i, this.color.setRGB(Math.max(r, 0.08), Math.max(g, 0.08), Math.max(b, 0.08), THREE.SRGBColorSpace))
      this.glow.setColorAt(i, this.color.setRGB(r, g, b, THREE.SRGBColorSpace))
    }
    this.beads.instanceColor!.needsUpdate = true
    this.glow.instanceColor!.needsUpdate = true
  }

  place(p: Placement) {
    place(this.object, p)
  }

  dispose() {
    this.beads.dispose()
    this.glow.dispose()
    disposeAll(this.object)
  }
}
