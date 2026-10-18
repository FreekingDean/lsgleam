import { Fragment, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { scenesOf, type Show } from '../model/show'
import { copyPatch, driversOf, options, patched, repatch, targetsOf, type Driver } from './scenePatch'

type Props = { show: Show; scene: string; onScene: (id: string) => void; onChange: (next: Show) => void; onClose: () => void }
type Drag = { port: string; on: boolean; rows: string[] }

const blocksOf = (drivers: Driver[]) => [...new Set(drivers.map((d) => d.block))].map((block) => drivers.filter((d) => d.block === block))

export function PatchView({ show, scene, onScene, onChange, onClose }: Props) {
  const targets = useMemo(() => targetsOf(show), [show])
  const drivers = useMemo(() => driversOf(show, scene), [show, scene])
  const ok = useMemo(() => options(show, scene, targets, drivers), [show, scene, targets, drivers])
  const current = useMemo(() => patched(show, scene), [show, scene])
  const [drag, setDrag] = useState<Drag | null>(null)
  const [anchor, setAnchor] = useState<{ row: string; port?: string } | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [source, setSource] = useState('')
  const [group, setGroup] = useState('')
  const [note, setNote] = useState('')
  const scenes = scenesOf(show)
  const others = scenes.filter((s) => s.id !== scene)
  const columns = blocksOf(drivers)
  const groups = columns.filter((c) => c[0].member !== null)
  const order = targets.map((t) => t.id)
  const between = (a: string, b: string) => order.slice(Math.min(order.indexOf(a), order.indexOf(b)), Math.max(order.indexOf(a), order.indexOf(b)) + 1)
  const shown = (row: string) => (drag?.rows.includes(row) ? (drag.on ? drag.port : current.get(row) === drag.port ? undefined : current.get(row)) : current.get(row))
  const apply = (pairs: [string, string | null][]) => {
    const next = repatch(show, scene, pairs)
    if (next !== show) onChange(next)
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const up = () => {
      const d = drag
      if (!d) return
      setDrag(null)
      apply(d.rows.flatMap((r): [string, string | null][] => (d.on ? [[r, d.port]] : current.get(r) === d.port ? [[r, null]] : [])))
    }
    window.addEventListener('keydown', key)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('mouseup', up)
    }
  })

  const down = (e: MouseEvent, row: string, port: string) => {
    e.preventDefault()
    if (e.shiftKey && anchor?.port === port) return setDrag({ port, on: true, rows: between(anchor.row, row).filter((r) => ok.get(r)?.has(port)) })
    setAnchor({ row, port })
    setDrag({ port, on: current.get(row) !== port, rows: [row] })
  }
  const enter = (row: string, port: string) => drag?.port === port && !drag.rows.includes(row) && ok.get(row)?.has(port) && setDrag({ ...drag, rows: [...drag.rows, row] })
  const pick = (e: MouseEvent, row: string) => {
    const range = e.shiftKey && anchor ? between(anchor.row, row) : [row]
    setAnchor({ row })
    setPicked(e.shiftKey ? [...new Set([...picked, ...range])] : picked.includes(row) ? picked.filter((r) => r !== row) : [...picked, row])
  }
  const fill = () => {
    const members = groups.find((g) => g[0].block === group) ?? []
    apply(order.filter((r) => picked.includes(r)).slice(0, members.length).map((r, i) => [r, members[i].port]))
  }
  const copy = () => {
    const r = copyPatch(show, source, scene)
    if (r.show !== show) onChange(r.show)
    setNote([r.missing.length ? `No match here for ${r.missing.join(', ')}.` : '', r.refused.length ? `Could not patch ${r.refused.join(', ')}.` : ''].join(' ').trim() || 'Copied every patch.')
  }

  return (
    <div className="modal patch-view">
      <div className="designer">
        <div className="patch-main">
          <table className="patch-grid">
            <thead>
              <tr>
                <th className="patch-corner" rowSpan={2}>{current.size}/{targets.length} patched</th>
                {columns.map((c) => <th key={c[0].block} colSpan={c.length} className="patch-block" title={c[0].name}>{c[0].name}</th>)}
              </tr>
              <tr>
                {columns.map((c) => c.map((d) => <th key={d.port} className="patch-member" title={d.label}>{d.member === null ? '•' : d.member + 1}</th>))}
              </tr>
            </thead>
            <tbody>
              {targets.map((t, i) => {
                const head = t.section !== targets[i - 1]?.section
                const now = shown(t.id)
                return (
                  <Fragment key={t.id}>
                    {head && <tr className="patch-section"><th colSpan={drivers.length + 1}>{t.section}</th></tr>}
                    <tr className={picked.includes(t.id) ? 'picked' : ''}>
                      <th className="patch-target" onClick={(e) => pick(e, t.id)} title="click to select for fill in order; shift-click selects a range">
                        <span className="patch-id">{t.plot}</span>
                        <span className="patch-name">{t.name}</span>
                        <span className="patch-info">{t.info}</span>
                      </th>
                      {drivers.map((d) => {
                        const can = ok.get(t.id)?.has(d.port)
                        return <td key={d.port} className={`patch-cell${now === d.port ? ' on' : ''}${can ? '' : ' off'}`} title={`${d.label} → ${t.name}`} onMouseDown={(e) => can && down(e, t.id, d.port)} onMouseEnter={() => enter(t.id, d.port)} />
                      })}
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <aside className="designer-side pars">
          <h2>Patch</h2>
          <div className="par">
            <label>Scene</label>
            <select value={scene} onChange={(e) => { setNote(''); onScene(e.target.value) }}>
              {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="help">Rows are fixtures and tubes, columns are this scene's outputs. Click a cell to patch or unpatch; a fixture takes one output per scene. Drag down a column to paint, shift-click to patch a range. Greyed cells can't drive that fixture.</div>
          <h3>Fill in order</h3>
          <div className="par">
            <label>Group</label>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">pick a group</option>
              {groups.map((g) => <option key={g[0].block} value={g[0].block}>{g[0].name} ({g.length})</option>)}
            </select>
          </div>
          <div className="par">
            <label />
            <div className="designer-buttons">
              <button disabled={!group || !picked.length} onClick={fill}>fill {picked.length} rows</button>
              <button disabled={!picked.length} onClick={() => setPicked([])}>clear</button>
            </div>
          </div>
          <div className="help">Click fixture names to select rows (shift-click for a range), then fill: members 1, 2, 3… go to the selected rows top to bottom.</div>
          <h3>Copy patch</h3>
          <div className="par">
            <label>From</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">pick a scene</option>
              {others.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="par">
            <label />
            <button disabled={!source} onClick={copy}>copy patch</button>
          </div>
          <div className="help">Patches every fixture the other scene drives to this scene's output with the same name (ignoring trailing "copy"), group outputs by member number.</div>
          {note && <div className="help">{note}</div>}
          <div className="designer-actions">
            <button onClick={onClose}>close</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
