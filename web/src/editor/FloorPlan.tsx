import { useEffect, useState, type MouseEvent } from 'react'
import { Panel, ViewportPortal, useReactFlow, useStore } from '@xyflow/react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Floor } from '../model/show'
import type { Calib, XZ } from '../model/floorplan'
import { parseLength } from '../model/format'
import { SCALE } from '../td/spots'
import { imagePlan, isPdf, openPdf, pdfPlan, renderPage, type PlanImage } from './planImage'

export function PlanImport({ file, onPlan, onClose }: { file: File; onPlan: (p: PlanImage) => void; onClose: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [thumbs, setThumbs] = useState<string[]>([])
  const [status, setStatus] = useState('reading…')

  const use = (work: Promise<PlanImage>) => {
    setStatus('rendering…')
    work.then((p) => onPlan(p)).catch((e: Error) => setStatus(`couldn't read ${file.name}: ${e.message}`))
  }

  useEffect(() => {
    let live = true
    let task: Awaited<ReturnType<typeof openPdf>> | null = null
    if (!isPdf(file)) {
      imagePlan(file).then((p) => live && onPlan(p)).catch((e: Error) => live && setStatus(`couldn't read ${file.name}: ${e.message}`))
      return () => { live = false }
    }
    openPdf(file).then(async (t) => {
      task = t
      const d = await t.promise
      if (d.numPages === 1) return onPlan(await pdfPlan(d, 1))
      setPdf(d)
      setStatus('')
      for (let n = 1; n <= d.numPages && live; n++) {
        const thumb = (await renderPage(d, n, 240)).toDataURL()
        if (live) setThumbs((t) => [...t, thumb])
      }
    }).catch((e: Error) => live && setStatus(`couldn't read ${file.name}: ${e.message}`))
    return () => {
      live = false
      task?.destroy()
    }
  }, [file, onPlan])

  return (
    <div className="modal">
      <div className="dialog">
        <h2>Floor plan · {file.name}</h2>
        {status && <div className="help">{status}</div>}
        {pdf && !status && <>
          <div className="help">Pick the page with the floor plan.</div>
          <div className="plan-pages">
            {Array.from({ length: pdf.numPages }, (_, i) => <button key={i} onClick={() => use(pdfPlan(pdf, i + 1))}>{thumbs[i] ? <img src={thumbs[i]} alt="" /> : <span className="plan-thumb" />}page {i + 1}</button>)}
          </div>
        </>}
        <div className="designer-actions"><button onClick={onClose}>cancel</button></div>
      </div>
    </div>
  )
}

type Handlers = { onMove: (floor: string, x: number, z: number) => void; onPoint: (floor: string, p: XZ) => void }

export function FloorPlanLayer({ floors, active, calib, ...handlers }: Handlers & { floors: Floor[]; active: string; calib: Calib | null }) {
  return <ViewportPortal>{floors.map((f) => <FloorImage key={f.id} floor={f} dim={f.id !== active} points={calib?.floor === f.id ? calib.points : null} {...handlers} />)}</ViewportPortal>
}

function FloorImage({ floor, dim, points, onMove, onPoint }: Handlers & { floor: Floor; dim: boolean; points: XZ[] | null }) {
  const { screenToFlowPosition } = useReactFlow()
  const zoom = useStore((s) => s.transform[2])
  const [drag, setDrag] = useState<{ from: XZ; by: XZ } | null>(null)
  const plan = floor.floorplan!
  const at = (e: MouseEvent): XZ => {
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    return [p.x / SCALE, p.y / SCALE]
  }
  const [x, z] = [plan.x + (drag?.by[0] ?? 0), plan.z + (drag?.by[1] ?? 0)]
  const calibrating = points !== null
  const movable = !plan.locked && !calibrating && !dim
  return (
    <>
      <img
        src={plan.src}
        alt=""
        draggable={false}
        className={`floorplan${movable ? ' nodrag nopan' : ''}`}
        style={{ left: (x - plan.width / 2) * SCALE, top: (z - plan.height / 2) * SCALE, width: plan.width * SCALE, height: plan.height * SCALE, transform: `rotate(${plan.rotation}deg)`, opacity: plan.opacity * (dim ? 0.35 : 1), pointerEvents: (plan.locked || dim) && !calibrating ? 'none' : 'all', cursor: calibrating ? 'crosshair' : 'move' }}
        onClick={(e) => calibrating && points.length < 2 && onPoint(floor.id, at(e))}
        onPointerDown={(e) => {
          if (!movable || e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag({ from: at(e), by: [0, 0] })
        }}
        onPointerMove={(e) => {
          if (!drag) return
          const p = at(e)
          setDrag({ ...drag, by: [p[0] - drag.from[0], p[1] - drag.from[1]] })
        }}
        onPointerUp={() => {
          if (drag && (drag.by[0] || drag.by[1])) onMove(floor.id, x, z)
          setDrag(null)
        }}
      />
      {points && <svg className="floorplan-marks">
        {points.length === 2 && <line x1={points[0][0] * SCALE} y1={points[0][1] * SCALE} x2={points[1][0] * SCALE} y2={points[1][1] * SCALE} strokeWidth={2 / zoom} />}
        {points.map(([px, pz], i) => <circle key={i} cx={px * SCALE} cy={pz * SCALE} r={5 / zoom} strokeWidth={2 / zoom} />)}
      </svg>}
    </>
  )
}

export function CalibrateBar({ points, onApply, onReset, onCancel }: { points: XZ[]; onApply: (metres: number) => void; onReset: () => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const metres = parseLength(text)
  const apply = () => metres && metres > 0 && onApply(metres)
  return (
    <Panel position="top-center" className="calibrate">
      {points.length < 2 ? <span>Scale the floor plan: click {points.length ? 'the second point' : 'two points a known distance apart, e.g. the ends of a dimension line'} (scroll to zoom, drag to pan)</span> : <>
        <span>Real distance between the points</span>
        <input autoFocus placeholder="e.g. 12.5 m or 41 ft" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} />
        <button disabled={!metres || metres <= 0} onClick={apply}>apply</button>
        <button onClick={onReset}>pick again</button>
      </>}
      <button onClick={onCancel}>cancel</button>
    </Panel>
  )
}
