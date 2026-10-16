import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { Point } from '../model/show'
import { disposeAll } from './par'
import { curveOf, ledPositions } from './tube'

const round = (v: number) => Math.round(v * 100) / 100

export type Pick = { tube: number; point: number }
type Shape = { path: Point[]; leds: number }

function nearestSegment(path: Point[], hit: THREE.Vector3): [number, Point] {
  let best: [number, Point, number] = [1, path[0], Infinity]
  for (let i = 1; i < path.length; i++) {
    const a = new THREE.Vector3(...path[i - 1])
    const b = new THREE.Vector3(...path[i])
    const ab = b.clone().sub(a)
    const t = Math.min(0.98, Math.max(0.02, hit.clone().sub(a).dot(ab) / (ab.lengthSq() || 1)))
    const p = a.add(ab.multiplyScalar(t))
    const d = p.distanceTo(hit)
    if (d < best[2]) best = [i, [round(p.x), round(p.y), round(p.z)], d]
  }
  return [best[0], best[1]]
}

export class Designer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(50, 1, 0.01, 200)
  private orbit: OrbitControls
  private gizmo: TransformControls
  private noodle = new THREE.Group()
  private handles: THREE.Mesh[] = []
  private picks: Pick[] = []
  private bodies: THREE.Mesh[] = []
  private raycaster = new THREE.Raycaster()
  private down: { x: number; y: number } | null = null
  private frame = 0
  private events = new AbortController()
  private canvas: HTMLCanvasElement
  private shapes: Shape[] = []
  private active = 0
  private selected: Pick | null = null
  private fixedStart: boolean
  onChange: (tube: number, path: Point[]) => void = () => {}
  onSelect: (pick: Pick | null) => void = () => {}

  constructor(parent: HTMLElement, fixedStart: boolean) {
    const canvas = parent.appendChild(document.createElement('canvas'))
    this.canvas = canvas
    this.fixedStart = fixedStart
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color(0x101014)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7), new THREE.GridHelper(20, 20, 0x3a3a48, 0x23232c), new THREE.AxesHelper(0.5), this.noodle)
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(3, 6, 4)
    this.scene.add(sun)
    this.camera.position.set(2, 3, 5)
    this.orbit = new OrbitControls(this.camera, canvas)
    this.orbit.target.set(1.5, 0, 0)
    this.orbit.update()
    this.gizmo = new TransformControls(this.camera, canvas)
    this.gizmo.setTranslationSnap(0.05)
    this.scene.add(this.gizmo.getHelper())
    this.gizmo.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled = !e.value
      if (!e.value && this.selected) this.onChange(this.selected.tube, this.shapes[this.selected.tube].path)
    })
    this.gizmo.addEventListener('objectChange', () => this.drag())
    const { signal } = this.events
    canvas.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY } }, { signal })
    canvas.addEventListener('pointerup', (e) => this.click(e), { signal })
    canvas.addEventListener('dblclick', (e) => this.bend(e), { signal })
    this.resize()
    this.animate()
  }

  set(shapes: Shape[], active: number, selected: Pick | null) {
    this.shapes = shapes
    this.active = active
    this.handles.forEach((h) => { this.scene.remove(h); disposeAll(h) })
    this.picks = shapes.flatMap((s, tube) => s.path.map((_, point) => ({ tube, point })))
    this.handles = this.picks.map(({ tube, point }) => {
      const mine = tube === active
      const h = new THREE.Mesh(new THREE.SphereGeometry(point === 0 ? 0.07 : 0.06, 16, 12), new THREE.MeshStandardMaterial({ color: point === 0 ? 0x5c8ed6 : 0xffd24a, transparent: !mine, opacity: mine ? 1 : 0.35 }))
      h.position.set(...shapes[tube].path[point])
      this.scene.add(h)
      return h
    })
    this.drawBodies()
    this.select(selected)
  }

  private drag() {
    const sel = this.selected
    if (!sel) return
    const h = this.handles[this.picks.findIndex((p) => p.tube === sel.tube && p.point === sel.point)]
    const at: Point = [round(h.position.x), round(h.position.y), round(h.position.z)]
    const path = this.shapes[sel.tube].path
    const moved = sel.point === 0 ? path.map((p) => p.map((v, k) => round(v + at[k] - path[0][k])) as Point) : path.map((p, i) => (i === sel.point ? at : p))
    this.shapes = this.shapes.map((s, i) => (i === sel.tube ? { ...s, path: moved } : s))
    this.drawBodies()
  }

  private drawBodies() {
    this.noodle.children.slice().forEach((c) => { this.noodle.remove(c); disposeAll(c) })
    this.bodies = this.shapes.map((s, tube) => {
      const body = new THREE.Mesh(new THREE.TubeGeometry(curveOf(s.path), s.path.length * 16, 0.03, 10, false), new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: tube === this.active ? 0.45 : 0.2, roughness: 0.3 }))
      body.userData.tube = tube
      const leds = new THREE.Points(new THREE.BufferGeometry().setFromPoints(ledPositions(s.path, s.leds)), new THREE.PointsMaterial({ color: 0xffd24a, size: 0.03 }))
      this.noodle.add(body, leds)
      return body
    })
  }

  select(pick: Pick | null) {
    this.selected = pick
    this.handles.forEach((h, k) => ((h.material as THREE.MeshStandardMaterial).emissive.setHex(pick && this.picks[k].tube === pick.tube && this.picks[k].point === pick.point ? 0x664400 : 0x000000)))
    const k = pick ? this.picks.findIndex((p) => p.tube === pick.tube && p.point === pick.point) : -1
    if (k >= 0 && !(this.fixedStart && pick!.point === 0)) this.gizmo.attach(this.handles[k])
    else this.gizmo.detach()
  }

  private ray(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), this.camera)
    return this.raycaster
  }

  private click(e: PointerEvent) {
    const down = this.down
    this.down = null
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || this.gizmo.dragging || this.gizmo.axis) return
    const hit = this.ray(e).intersectObjects(this.handles)[0]?.object
    const k = hit ? this.handles.indexOf(hit as THREE.Mesh) : -1
    const body = k < 0 ? this.ray(e).intersectObjects(this.bodies)[0]?.object : undefined
    const pick = k >= 0 ? this.picks[k] : body ? { tube: body.userData.tube as number, point: -1 } : null
    this.onSelect(pick)
  }

  private bend(e: MouseEvent) {
    const hit = this.ray(e).intersectObjects(this.bodies)[0]
    if (!hit) return
    const tube = hit.object.userData.tube as number
    const path = this.shapes[tube].path
    const [i, p] = nearestSegment(path, hit.point)
    this.onChange(tube, [...path.slice(0, i), p, ...path.slice(i)])
    this.onSelect({ tube, point: i })
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement ?? this.canvas
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    this.events.abort()
    this.gizmo.dispose()
    this.orbit.dispose()
    disposeAll(this.scene)
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }
}
