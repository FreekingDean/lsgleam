import { useEffect, useRef, useState } from 'react'
import { Field, LengthField, NumField } from './fields'
import { PIXEL_PROTOCOLS, fitPath, formatLength, type DesignTube, type Point } from './show'
import { Designer, type Pick } from './sim/designer'
import { SHAPES, makeShape, type ShapeKind } from './tubeShapes'

type Props = { name: string; tubes: DesignTube[]; onSave: (tubes: DesignTube[]) => void; onClose: () => void }

const norm = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

const rooted = (t: DesignTube): DesignTube => ({ ...t, path: t.path.map((p) => p.map((v, a) => v - t.path[0][a]) as Point) })

function addTube(tubes: DesignTube[]): DesignTube[] {
  const n = Math.max(0, ...tubes.map((t) => Number(t.id.slice(1)))) + 1
  const last = tubes[tubes.length - 1]
  const a = tubes.length * 0.9
  return [...tubes, { id: `t${n}`, name: `Tube ${n}`, leds: last?.leds ?? 60, length: last?.length ?? 1, protocol: last?.protocol ?? 'sk9822', path: [[0, 0, 0], [Math.round(Math.cos(a) * 1000) / 1000 * (last?.length ?? 1), 0, Math.round(Math.sin(a) * 1000) / 1000 * (last?.length ?? 1)]] }]
}

function ShapeMaker({ tubes, onMake }: { tubes: DesignTube[]; onMake: (tubes: DesignTube[]) => void }) {
  const [kind, setKind] = useState<ShapeKind>('tree')
  const [count, setCount] = useState(tubes.length > 1 ? tubes.length : 6)
  const [leds, setLeds] = useState(tubes[0]?.leds ?? 60)
  const [length, setLength] = useState(tubes[0]?.length ?? 1)
  return (
    <>
      <h4>Prebuilt shape</h4>
      <div className="par">
        <label>Shape</label>
        <select value={kind} onChange={(e) => setKind(e.target.value as ShapeKind)}>
          {Object.entries(SHAPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>
      <NumField label="Tubes" value={count} onCommit={(v) => setCount(Math.max(1, Math.min(64, Math.round(v))))} step={1} />
      <NumField label="LEDs per tube" value={leds} onCommit={(v) => setLeds(Math.max(1, Math.min(4096, Math.round(v))))} step={1} />
      <LengthField label="Tube length (m)" value={length} onCommit={(v) => setLength(Math.max(0.05, v))} />
      <div className="par"><label /><button onClick={() => onMake(makeShape(kind, count, leds, length, tubes[0]?.protocol ?? 'sk9822'))} title="replaces this design's tubes; cancel to undo">make shape</button></div>
    </>
  )
}

export function TubeDesigner({ name, tubes: initial, onSave, onClose }: Props) {
  const view = useRef<HTMLDivElement>(null)
  const designer = useRef<Designer>(null)
  const [tubes, setTubes] = useState(() => initial.map(rooted))
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const change = (i: number, patch: Partial<DesignTube>) => setTubes((ts) => ts.map((t, k) => {
    if (k !== i) return t
    const next = { ...t, ...patch }
    return { ...next, path: fitPath(next.path, next.length) }
  }))

  useEffect(() => {
    const d = new Designer(view.current!, true)
    d.onChange = (i, path) => change(i, { path })
    d.onSelect = (pick: Pick | null) => {
      if (pick) setActive(pick.tube)
      setSelected(pick && pick.point >= 0 ? pick.point : null)
    }
    designer.current = d
    const observer = new ResizeObserver(() => d.resize())
    observer.observe(view.current!)
    return () => { observer.disconnect(); d.dispose(); designer.current = null }
  }, [])

  useEffect(() => { designer.current?.set(tubes, active, selected === null ? null : { tube: active, point: selected }) }, [tubes, active, selected])

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  const tube = tubes[active]
  const path = tube.path
  const point = selected === null ? null : path[selected]
  const setPath = (p: Point[]) => change(active, { path: p })
  const setAxis = (axis: number, v: number) => setPath(path.map((p, k) => (k === selected ? (p.map((x, a) => (a === axis ? v : x)) as Point) : p)))
  const setSegment = (v: number) => {
    const i = selected!
    const dir = path[i].map((x, a) => x - path[i - 1][a])
    const k = Math.min(v, tube.length) / (norm(path[i], path[i - 1]) || 1)
    const moved = path.map((p, j) => (j === i ? (path[i - 1].map((x, a) => x + dir[a] * k) as Point) : j > i ? (p.map((x, a) => x + path[i - 1][a] + dir[a] * k - path[i][a]) as Point) : p))
    setTubes((ts) => ts.map((t, j) => (j === active ? { ...t, path: fitPath(moved, t.length, i) } : t)))
  }
  return (
    <div className="modal">
      <div className="designer">
        <div className="designer-view" ref={view} />
        <aside className="designer-side pars">
          <h2>{name}</h2>
          <div className="tube-tabs">
            {tubes.map((t, i) => <button key={t.id} className={i === active ? 'on' : ''} onClick={() => { setActive(i); setSelected(null) }}>{t.name}</button>)}
            <button onClick={() => { setTubes(addTube(tubes)); setActive(tubes.length); setSelected(null) }}>+ tube</button>
          </div>
          <Field key={`name${tube.id}`} label="Name" value={tube.name} onCommit={(v) => change(active, { name: v })} />
          <LengthField key={`length${tube.id}:${tube.length}`} label="Length (m)" value={tube.length} onCommit={(v) => change(active, { length: Math.max(0.05, v) })} />
          <NumField key={`leds${tube.id}`} label="LEDs" value={tube.leds} onCommit={(v) => change(active, { leds: Math.max(1, Math.min(4096, Math.round(v))) })} step={1} />
          <div className="par">
            <label>Pixel protocol</label>
            <select value={tube.protocol} onChange={(e) => change(active, { protocol: e.target.value })}>
              {PIXEL_PROTOCOLS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="help">{formatLength(tube.length)} · {(tube.leds / tube.length).toFixed(1)} LEDs/m · {path.length - 1} segment{path.length === 2 ? '' : 's'}</div>
          <div className="designer-buttons">
            <button disabled={!selected || path.length <= 2} onClick={() => { setPath(path.filter((_, k) => k !== selected)); setSelected(null) }}>delete bend</button>
            <button disabled={tubes.length <= 1} onClick={() => { setTubes(tubes.filter((_, k) => k !== active)); setActive(0); setSelected(null) }}>delete tube</button>
          </div>
          <hr />
          {point === null || selected === 0 ? (
            <div className="help">{selected === 0 ? 'Every tube starts at the blue point: the design’s layout position.' : 'Click a yellow bend point to edit it.'}</div>
          ) : (
            <>
              <h4>Bend {selected}</h4>
              <LengthField key={`seg${selected}:${path.join()}`} label="Segment length (m)" value={norm(point, path[selected! - 1])} onCommit={(v) => setSegment(Math.max(0.01, v))} />
              {['X', 'Height', 'Z'].map((label, axis) => <LengthField key={`${axis}:${selected}:${path.join()}`} label={`${label} (m)`} value={point[axis]} onCommit={(v) => setAxis(axis, v)} />)}
            </>
          )}
          <hr />
          <ShapeMaker tubes={tubes} onMake={(made) => { setTubes(made); setActive(0); setSelected(null) }} />
          <div className="help">Double-click a tube to add a bend there. Drag a point’s arrows to bend it; the tube keeps its length, so the rest of it follows. Drag the background to orbit, right-drag to pan, scroll to zoom. Lengths take m, ft or '. LEDs spread evenly from the blue end.</div>
          <div className="designer-actions">
            <button onClick={onClose}>cancel</button>
            <button className="on" onClick={() => { onSave(tubes); onClose() }}>save shape</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
