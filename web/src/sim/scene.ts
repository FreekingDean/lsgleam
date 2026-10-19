import * as THREE from 'three'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { Floor, Placement } from '../model/show'
import type { SimDevice, SimFixture, SimTube } from '../model/units'
import type { DmxValues } from '../td/td'
import { Par, disposeAll, placementOf, type Light, type Spot } from './par'
import { Head } from './head'
import { Device } from './device'
import { Tube } from './tube'
import { decode } from '../model/ofl'

const POOL = 8

export class SimScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000)
  private drag: { button: number; x: number; y: number } | null = null
  private gizmo: TransformControls
  private raycaster = new THREE.Raycaster()
  private lights = new Map<string, { light: Light; fixture?: SimFixture; tube?: SimTube; kind: string }>()
  private selected: string | null = null
  private down: { x: number; y: number } | null = null
  private frame = 0
  private frames = 0
  private renderMs = 0
  private keys = new Set<string>()
  private clock = new THREE.Clock()
  private events = new AbortController()
  private pool: THREE.SpotLight[] = []
  private cut = Infinity
  private plans = new Map<string, { src: string; mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial> }>()
  onSelect: (key: string | null) => void = () => {}
  onLost: (lost: boolean) => void = () => {}
  private canvas: HTMLCanvasElement
  private onPlace: (key: string, p: Placement) => void

  constructor(parent: HTMLElement, onPlace: (key: string, p: Placement) => void) {
    const canvas = parent.appendChild(document.createElement('canvas'))
    this.canvas = canvas
    this.onPlace = onPlace
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(1)
    this.scene.background = new THREE.Color(0x08080b)
    this.camera.position.set(0, 9, 17)
    this.raycaster.params.Line = { threshold: 0.05 }
    this.raycaster.params.Points = { threshold: 0.05 }
    this.camera.rotation.order = 'YXZ'
    this.camera.lookAt(0, 2, 0)
    this.scene.add(new THREE.AmbientLight(0x404050, 0.6))
    const fill = new THREE.DirectionalLight(0x8088a0, 0.25)
    fill.position.set(5, 10, 7)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ color: 0x14141a }))
    floor.rotation.x = -Math.PI / 2
    const grid = new THREE.GridHelper(120, 120, 0x2a2a35, 0x1a1a22)
    grid.position.y = 0.001
    this.scene.add(fill, floor, grid)
    for (let i = 0; i < POOL; i++) {
      const light = new THREE.SpotLight(0xffffff, 0, 0, 0.5, 0.4, 0)
      this.pool.push(light)
      this.scene.add(light, light.target)
    }
    this.gizmo = new TransformControls(this.camera, canvas)
    this.gizmo.setSpace('world')
    this.scene.add(this.gizmo.getHelper())
    this.gizmo.addEventListener('dragging-changed', (e) => {
      if (e.value) this.drag = null
      if (!e.value && this.selected) this.onPlace(this.selected, placementOf(this.lights.get(this.selected)!.light.object))
    })
    const { signal } = this.events
    canvas.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY }
      if (!this.gizmo.axis) this.drag = { button: e.button, x: e.clientX, y: e.clientY }
    }, { signal })
    canvas.addEventListener('pointermove', (e) => this.look(e), { signal })
    window.addEventListener('pointerup', () => { this.drag = null }, { signal })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal })
    canvas.addEventListener('webglcontextlost', () => this.onLost(true), { signal })
    canvas.addEventListener('webglcontextrestored', () => this.onLost(false), { signal })
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const forward = new THREE.Vector3()
      this.camera.getWorldDirection(forward)
      this.camera.position.addScaledVector(forward, -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.01, 2) * (e.shiftKey ? 3 : 1))
    }, { passive: false, signal })
    canvas.addEventListener('pointerup', (e) => this.click(e), { signal })
    this.resize()
    this.animate()
  }

  stats() {
    const { programs, render } = this.renderer.info
    const out = { frames: this.frames, renderMs: this.renderMs, programs: programs?.length ?? 0, calls: render.calls, triangles: render.triangles }
    this.frames = 0
    return out
  }

  setMode(mode: 'translate' | 'rotate') {
    this.gizmo.setMode(mode)
  }

  sync(fixtures: SimFixture[], devices: SimDevice[], tubes: SimTube[]) {
    const items: { key: string; placement: Placement; fixture?: SimFixture; tube?: SimTube; kind: string; size?: [number, number, number] }[] = [...tubes.map((t) => ({ key: t.key, placement: t.placement, tube: t, kind: `tube:${t.leds}:${JSON.stringify(t.path)}` })), ...fixtures.map((f) => ({ key: f.key, placement: f.placement, fixture: f, kind: `${f.profile.id}:${JSON.stringify(f.profile.sim)}` })), ...devices.map((d) => ({ key: d.key, placement: d.placement, fixture: undefined, kind: d.size ? `box:${d.size.join(',')}` : d.kind, size: d.size }))]
    const wanted = new Set(items.map((f) => f.key))
    for (const [key, { light }] of this.lights) if (!wanted.has(key)) {
      this.scene.remove(light.object)
      light.dispose()
      this.lights.delete(key)
      if (this.selected === key) this.select(null)
    }
    for (const item of items) {
      const existing = this.lights.get(item.key)
      if (existing && existing.kind === item.kind) {
        existing.fixture = item.fixture
        existing.tube = item.tube
        existing.light.place(item.placement)
        continue
      }
      if (existing) {
        this.scene.remove(existing.light.object)
        existing.light.dispose()
      }
      const sim = item.fixture?.profile.sim
      const light = item.tube ? new Tube(item.tube.path, item.tube.leds, item.placement) : !sim ? new Device(item.kind as SimDevice['kind'], item.placement, item.size) : sim.kind === 'head' ? new Head(item.placement, sim) : new Par(item.placement, sim)
      this.scene.add(light.object)
      this.lights.set(item.key, { light, fixture: item.fixture, tube: item.tube, kind: item.kind })
    }
    this.setCut(this.cut)
  }

  setPlans(floors: Floor[]) {
    const wanted = new Map(floors.flatMap((f) => (f.floorplan ? [[f.id, f]] : [])))
    for (const [id, p] of this.plans) if (wanted.get(id)?.floorplan?.src !== p.src) {
      this.scene.remove(p.mesh)
      p.mesh.material.map?.dispose()
      disposeAll(p.mesh)
      this.plans.delete(id)
    }
    for (const [id, floor] of wanted) {
      const plan = floor.floorplan!
      if (!this.plans.has(id)) {
        const map = new THREE.TextureLoader().load(plan.src)
        map.colorSpace = THREE.SRGBColorSpace
        map.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: 0x505058, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
        mesh.raycast = () => {}
        this.scene.add(mesh)
        this.plans.set(id, { src: plan.src, mesh })
      }
      const { mesh } = this.plans.get(id)!
      mesh.scale.set(plan.width, plan.height, 1)
      mesh.rotation.set(-Math.PI / 2, (-plan.rotation * Math.PI) / 180, 0, 'YXZ')
      mesh.position.set(plan.x, floor.elevation + 0.006, plan.z)
      mesh.material.opacity = plan.opacity
    }
    this.setCut(this.cut)
  }

  setCut(top: number) {
    this.cut = top
    for (const { light } of this.lights.values()) light.object.visible = light.object.position.y < top - 0.01
    for (const { mesh } of this.plans.values()) mesh.visible = mesh.position.y < top - 0.01
    if (this.selected && !this.lights.get(this.selected)?.light.object.visible) this.select(null)
  }

  apply(dmx: DmxValues) {
    for (const { light, fixture, tube } of this.lights.values()) {
      if (tube && light instanceof Tube) {
        const at = tube.addresses
        light.pixels((i) => {
          const a = at?.[i]
          const u = a && dmx[a[0]]
          return u ? [(u[a[1] - 1] ?? 0) / 255, (u[a[1]] ?? 0) / 255, (u[a[1] + 1] ?? 0) / 255] : [0, 0, 0]
        })
      }
      if (!fixture) continue
      const universe = fixture.universe === null ? undefined : dmx[`${fixture.node}:${fixture.universe}`]
      light.update(decode(fixture.mode, fixture.mode.channels.map((_, i) => universe?.[fixture.address - 1 + i] ?? 0)))
    }
  }

  select(key: string | null) {
    this.selected = key
    if (key) this.gizmo.attach(this.lights.get(key)!.light.object)
    else this.gizmo.detach()
    this.onSelect(key)
  }

  private click(e: PointerEvent) {
    const down = this.down
    this.down = null
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || this.gizmo.dragging || this.gizmo.axis) return
    const rect = this.canvas.getBoundingClientRect()
    const pointer = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.camera)
    const hits = this.raycaster.intersectObjects([...this.lights.values()].map((l) => l.light.object).filter((o) => o.visible), true)
    const owners = hits.flatMap((h) => [...this.lights].filter(([, l]) => this.owns(l.light.object, h.object)))
    this.select((owners.find(([, l]) => !l.kind.startsWith('box:')) ?? owners[0])?.[0] ?? null)
  }

  private owns(root: THREE.Object3D, obj: THREE.Object3D) {
    for (let p: THREE.Object3D | null = obj; p; p = p.parent) if (p === root) return true
    return false
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement ?? this.canvas
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private look(e: PointerEvent) {
    const d = this.drag
    if (!d || this.gizmo.dragging) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    d.x = e.clientX
    d.y = e.clientY
    if (d.button === 0) {
      this.camera.rotation.y -= dx * 0.004
      this.camera.rotation.x = Math.max(-1.55, Math.min(1.55, this.camera.rotation.x - dy * 0.004))
      return
    }
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion)
    const k = 0.02 * (e.shiftKey ? 3 : 1)
    this.camera.position.addScaledVector(right, -dx * k).addScaledVector(up, dy * k)
  }

  key(code: string, down: boolean) {
    if (down) this.keys.add(code)
    else this.keys.delete(code)
  }

  private fly(dt: number) {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0)
    const ahead = k('KeyW') - k('KeyS')
    const side = k('KeyD') - k('KeyA')
    const lift = k('KeyE') - k('KeyQ')
    if (!ahead && !side && !lift) return
    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize()
    const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 20 : 6) * dt
    const move = forward.multiplyScalar(ahead).add(right.multiplyScalar(side)).add(new THREE.Vector3(0, lift, 0)).multiplyScalar(speed)
    this.camera.position.add(move)
  }

  private aim() {
    const power = (s: Spot) => s.intensity * (0.2126 * s.color.r + 0.7152 * s.color.g + 0.0722 * s.color.b)
    const spots = [...this.lights.values()].flatMap(({ light: { spot, object } }) => (spot && object.visible && power(spot) > 0.05 ? [spot] : []))
    spots.sort((a, b) => power(b) - power(a))
    this.pool.forEach((light, i) => {
      const s = spots[i]
      light.intensity = s?.intensity ?? 0
      if (!s) return
      light.color.copy(s.color)
      light.angle = s.angle
      s.from.getWorldPosition(light.position)
      s.to.getWorldPosition(light.target.position)
    })
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate)
    this.fly(Math.min(this.clock.getDelta(), 0.1))
    this.aim()
    const t = performance.now()
    this.renderer.render(this.scene, this.camera)
    this.renderMs = Math.max(this.renderMs * 0.9, performance.now() - t)
    this.frames++
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    for (const { light } of this.lights.values()) light.dispose()
    this.setPlans([])
    this.gizmo.dispose()
    this.events.abort()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }
}
