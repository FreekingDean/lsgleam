import { useEffect, useRef, useState } from 'react'
import { simDevices, simFixtures, simTubes, type Placement, type Show } from './show'
import type { Td } from './td'
import { SimScene } from './sim/scene'
import { PlacementEditor } from './Placement'

type Props = { show: Show; td: Td | null; connected: boolean; active: boolean; onPlace: (key: string, p: Placement) => void }

export function Simulator({ show, td, connected, active, onPlace }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<SimScene>(null)
  const place = useRef(onPlace)
  place.current = onPlace
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'translate' | 'rotate'>('translate')
  const [glError, setGlError] = useState('')
  const [timing, setTiming] = useState('')
  const fixtures = simFixtures(show)

  useEffect(() => {
    let s: SimScene
    try {
      s = new SimScene(canvas.current!, (key, p) => place.current(key, p))
    } catch (e) {
      setGlError((e as Error).message)
      return
    }
    s.onSelect = setSelected
    scene.current = s
    const observer = new ResizeObserver(() => s.resize())
    observer.observe(canvas.current!.parentElement!)
    return () => {
      observer.disconnect()
      s.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => { scene.current?.sync(simFixtures(show), simDevices(show), simTubes(show)) }, [show])
  useEffect(() => { scene.current?.setMode(mode) }, [mode])
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
    if (!active || !connected || !td) return
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
      setTiming(`${Math.round((s?.frames ?? 0) / secs)} fps · render ${s?.renderMs.toFixed(1)} ms · ${Math.round(polls / secs)} DMX/s · slowest ${Math.round(worst)} ms`)
      polls = 0
      worst = 0
      since = performance.now()
    }, 1000)
    return () => { clearInterval(id); clearInterval(report) }
  }, [active, connected, td])

  const devices = simDevices(show)
  const tubes = simTubes(show)
  const tube = tubes.find((t) => t.key === selected)
  const current = fixtures.find((f) => f.key === selected)
  const device = devices.find((d) => d.key === selected)
  const picked = current ?? device ?? tube
  return (
    <div className="sim">
      <canvas ref={canvas} />
      <div className="sim-hud">
        {glError && <div className="error">The 3D view failed to start: {glError}</div>}
        <div>{fixtures.length} fixtures · {tubes.length} tubes · {devices.length} devices · {connected ? 'live' : 'offline'}</div>
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
