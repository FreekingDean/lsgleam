import { useEffect, useRef, useState } from 'react'
import { scenesOf, type Placement, type Show } from '../model/show'
import { roomsOf, simDevices, simFixtures, simTubes } from '../model/units'
import { LAYOUT_DEFAULTS, previewDmx } from './preview'
import type { Td } from '../td/td'
import { SimScene } from './scene'
import { PlacementEditor } from '../panels/Placement'

const LIVE = 'live'

type Props = { show: Show; td: Td | null; connected: boolean; active: boolean; onPlace: (key: string, p: Placement) => void }

export function Simulator({ show, td, connected, active, onPlace }: Props) {
  const view = useRef<HTMLDivElement>(null)
  const scene = useRef<SimScene>(null)
  const place = useRef(onPlace)
  place.current = onPlace
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'translate' | 'rotate'>('translate')
  const [glError, setGlError] = useState('')
  const [lost, setLost] = useState(false)
  const [timing, setTiming] = useState('')
  const [source, setSource] = useState(LIVE)
  const fixtures = simFixtures(show)
  const scenes = scenesOf(show)
  const preview = connected && source === LIVE ? null : scenes.some((s) => s.id === source) ? source : LAYOUT_DEFAULTS

  useEffect(() => {
    let s: SimScene
    try {
      s = new SimScene(view.current!, (key, p) => place.current(key, p))
    } catch (e) {
      setGlError((e as Error).message)
      return
    }
    s.onSelect = setSelected
    s.onLost = setLost
    scene.current = s
    const observer = new ResizeObserver(() => s.resize())
    observer.observe(view.current!)
    return () => {
      observer.disconnect()
      s.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => { scene.current?.sync(simFixtures(show), simDevices(show), simTubes(show)) }, [show])
  useEffect(() => { if (preview !== null) scene.current?.apply(previewDmx(show, preview)) }, [show, preview])
  useEffect(() => { scene.current?.setMode(mode) }, [mode])
  useEffect(() => { scene.current?.setPlans(roomsOf(show)) }, [show])
  useEffect(() => { if (active) scene.current?.resize() }, [active])

  useEffect(() => {
    if (!active) return
    const typing = (e: KeyboardEvent) => ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || e.metaKey || e.ctrlKey
    const down = (e: KeyboardEvent) => { if (typing(e)) return; if (e.key === 'Escape') scene.current?.select(null); else scene.current?.key(e.code, true) }
    const up = (e: KeyboardEvent) => scene.current?.key(e.code, false)
    const clear = () => ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'].forEach((c) => scene.current?.key(c, false))
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); clear() }
  }, [active])

  useEffect(() => {
    if (!active || !connected || !td || preview !== null) return
    let busy = false
    let polls = 0
    let worst = 0
    let since = performance.now()
    const id = setInterval(async () => {
      if (busy) return
      busy = true
      const t = performance.now()
      try {
        const dmx = await td.readDmx()
        const got = performance.now()
        scene.current?.apply(dmx)
        worst = Math.max(worst, got - t)
        polls++
      } catch {
        return
      } finally {
        busy = false
      }
    }, 33)
    const report = setInterval(() => {
      const s = scene.current?.stats()
      const secs = (performance.now() - since) / 1000
      setTiming(`${Math.round((s?.frames ?? 0) / secs)} fps · render ${s?.renderMs.toFixed(1)} ms · ${s?.programs} programs · ${s?.calls} draws · ${Math.round((s?.triangles ?? 0) / 1000)}k tris · ${Math.round(polls / secs)} DMX/s · slowest ${Math.round(worst)} ms`)
      polls = 0
      worst = 0
      since = performance.now()
    }, 1000)
    return () => { clearInterval(id); clearInterval(report); setTiming('') }
  }, [active, connected, td, preview])

  const devices = simDevices(show)
  const tubes = simTubes(show)
  const tube = tubes.find((t) => t.key === selected)
  const current = fixtures.find((f) => f.key === selected)
  const device = devices.find((d) => d.key === selected)
  const picked = current ?? device ?? tube
  return (
    <div className="sim">
      <div className="sim-view" ref={view} />
      <div className="sim-hud">
        {glError && <div className="error">The 3D view failed to start: {glError}</div>}
        {lost && <div className="error">3D view lost the GPU, restoring…</div>}
        <div>{fixtures.length} fixtures · {tubes.length} tubes · {devices.length} devices · {preview === null ? 'live' : 'preview'}</div>
        <div className="sim-modes">
          <select value={preview ?? LIVE} onChange={(e) => setSource(e.target.value)} title="what the simulator shows: live DMX from TouchDesigner, or a preview computed from the show">
            {connected && <option value={LIVE}>live from TouchDesigner</option>}
            <option value={LAYOUT_DEFAULTS}>preview: layout defaults</option>
            {scenes.map((s) => <option key={s.id} value={s.id}>preview: {s.name}</option>)}
          </select>
        </div>
        {timing && <div className="hint">{timing}</div>}
        <div>{current ? `${current.name} · ${current.universe === null ? 'no DMX cable' : `U${current.universe} @${current.address}`}` : device ? device.name : tube ? `${tube.name} · ${tube.label}` : 'click a fixture to move it'}</div>
        {picked && <div className="sim-place pars"><PlacementEditor placement={picked.placement} onPlace={(p) => onPlace(picked.key, p)} floor={device?.kind === 'box'} /></div>}
        <div className="sim-modes">
          <button className={mode === 'translate' ? 'on' : ''} onClick={() => setMode('translate')}>move</button>
          <button className={mode === 'rotate' ? 'on' : ''} onClick={() => setMode('rotate')}>rotate</button>
        </div>
        <div className="hint">drag to look · WASD move · Q/E down/up · Shift fast · scroll forward/back · right-drag to pan · Esc deselects</div>
      </div>
    </div>
  )
}
