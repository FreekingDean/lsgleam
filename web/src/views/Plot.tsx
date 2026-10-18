import { useRef, useState } from 'react'
import { profileOf, type BoxBlock, type Show } from '../model/show'
import { formatLength } from '../model/format'
import { download } from '../td/blt'
import { fixtureRows, num, range, summary, tubeRows } from './rows'
import { endsOf, itemsOf, nearest, placeLabels, rectOf, roomsOf, runsOf, styles, type Box, type End, type Item, type Run, type XZ } from './plan'

const W = 1120
const H = 740
const FRAME: Box = { x: 16, y: 16, w: W - 32, h: H - 70 }
const NAME = 10
const INFO = 8.5
const textW = (s: string, size: number) => s.length * size * 0.6
const STEPS = [1, 2, 5, 10, 20, 50]

type Style = ReturnType<ReturnType<typeof styles>>
type Plotted = { room: BoxBlock | null; items: Item[]; ends: Map<string, End>; runs: Run[]; style: (r: Run) => Style; order: Map<string, string> }

function Mark({ item, at, k }: { item: Item; at: XZ; k: number }) {
  const [x, y] = at
  const dash = item.patched ? undefined : '2 2'
  const turn = `rotate(${-item.turn} ${x} ${y})`
  const aim = item.aim && <line x1={x} y1={y} x2={x + item.aim[0] * 16} y2={y + item.aim[1] * 16} stroke="#000" strokeWidth={1.2} />
  if (item.mark === 'par') return <g>{aim}<circle cx={x} cy={y} r={6} fill="#fff" stroke="#000" strokeWidth={1.5} strokeDasharray={dash} /><circle cx={x} cy={y} r={2} fill="#000" /></g>
  if (item.mark === 'head') return <g transform={turn}>{aim}<rect x={x - 7} y={y - 7} width={14} height={14} fill="#fff" stroke="#000" strokeWidth={1.5} strokeDasharray={dash} /><circle cx={x} cy={y} r={4} fill="#000" /><path d={`M${x - 3} ${y + 7}L${x} ${y + 10}L${x + 3} ${y + 7}Z`} fill="#000" /></g>
  if (item.mark === 'tubes') return <g>{item.tips.map(([t, tip]) => <line key={t} x1={x} y1={y} x2={x + (tip[0] - item.at[0]) * k} y2={y + (tip[1] - item.at[1]) * k} stroke="#000" strokeWidth={4} strokeLinecap="round" />)}<circle cx={x} cy={y} r={4} fill="#fff" stroke="#000" strokeWidth={1.5} /></g>
  return <rect x={x - 6} y={y - 6} width={12} height={12} fill="#000" transform={turn} />
}

const arrow = ([ax, ay]: XZ, [bx, by]: XZ, color: string) => {
  const [mx, my] = [(ax + bx) / 2, (ay + by) / 2]
  const a = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
  return <path d={`M${mx + 5} ${my}L${mx - 4} ${my - 4}L${mx - 4} ${my + 4}Z`} fill={color} transform={`rotate(${a} ${mx} ${my})`} />
}

function PlanSvg({ room, items, ends, runs, style, order }: Plotted) {
  const rect = room && rectOf(room)
  const mine = items.filter((i) => !room || i.room === room.id)
  const here = (e: End | undefined) => !!e && (!room || e.room === room.id)
  const segments = runs.flatMap((r) => r.stops.slice(1).flatMap((key, i) => {
    const a = ends.get(r.stops[i])
    const b = ends.get(key)
    return a && b && (here(a) || here(b)) ? [{ run: r, from: a.out, to: b.in, cut: here(a) && here(b) ? null : here(a) ? `to ${b.name}` : `from ${a.name}`, first: i === 0 }] : []
  }))
  const pts: XZ[] = [...mine.flatMap((i) => [i.at, ...i.tips.map(([, t]) => t)]), ...segments.flatMap((s) => (s.cut ? [] : [s.from, s.to]))]
  if (rect) pts.push([rect.x, rect.z], [rect.x + rect.w, rect.z + rect.d])
  if (!pts.length) pts.push([0, 0])
  const [x0, x1] = [Math.min(...pts.map((p) => p[0])) - 0.8, Math.max(...pts.map((p) => p[0])) + 0.8]
  const [z0, z1] = [Math.min(...pts.map((p) => p[1])) - 0.8, Math.max(...pts.map((p) => p[1])) + 0.8]
  const k = Math.min((FRAME.w - 60) / (x1 - x0), (FRAME.h - 60) / (z1 - z0))
  const ox = FRAME.x + (FRAME.w - (x1 - x0) * k) / 2
  const oy = FRAME.y + (FRAME.h - (z1 - z0) * k) / 2
  const P = ([x, z]: XZ): XZ => [ox + (x - x0) * k, oy + (z - z0) * k]
  const bundles = new Map<string, number>()
  const lines = segments.map((s) => {
    let [a, b] = [P(s.from), P(s.to)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    if (s.cut?.startsWith('to')) b = [a[0] + ((b[0] - a[0]) / len) * 50, a[1] + ((b[1] - a[1]) / len) * 50]
    if (s.cut?.startsWith('from')) a = [b[0] - ((b[0] - a[0]) / len) * 50, b[1] - ((b[1] - a[1]) / len) * 50]
    const key = [a, b].map((p) => p.map(Math.round).join(',')).sort().join(' ')
    const n = bundles.get(key) ?? 0
    bundles.set(key, n + 1)
    return { ...s, a, b, key, n }
  })
  const shifted = lines.map((l) => {
    const count = bundles.get(l.key)!
    const len = Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) || 1
    const o = (l.n - (count - 1) / 2) * 4
    const [nx, ny] = [(-(l.b[1] - l.a[1]) / len) * o, ((l.b[0] - l.a[0]) / len) * o]
    return { ...l, a: [l.a[0] + nx, l.a[1] + ny] as XZ, b: [l.b[0] + nx, l.b[1] + ny] as XZ }
  })
  const badges = shifted.filter((l) => l.first || l.cut).map((l) => {
    const t = Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) < 80 ? 0.5 : Math.min(0.85, 0.2 + l.n * 0.12)
    return { run: l.run, at: [l.a[0] + (l.b[0] - l.a[0]) * t, l.a[1] + (l.b[1] - l.a[1]) * t] as XZ }
  })
  const marks = mine.map((i) => ({ item: i, at: P(i.at) }))
  const tips = marks.flatMap(({ item, at }) => item.tips.map(([t, tip]) => {
    const [tx, ty] = P(tip)
    const len = Math.hypot(tx - at[0], ty - at[1]) || 1
    const label = t.replace(/\D/g, '') || t
    return { label, x: tx + ((tx - at[0]) / len) * 7, y: ty + ((ty - at[1]) / len) * 7 }
  }))
  const rp = rect && { a: P([rect.x, rect.z]), b: P([rect.x + rect.w, rect.z + rect.d]) }
  const title = room?.name ?? 'Layout'
  const blocked: Box[] = [
    ...marks.map(({ at }) => ({ x: at[0] - 8, y: at[1] - 8, w: 16, h: 16 })),
    ...tips.map((t) => ({ x: t.x - 6, y: t.y - 6, w: 12, h: 12 })),
    ...badges.map(({ at }) => ({ x: at[0] - 8, y: at[1] - 8, w: 16, h: 16 })),
    ...(rp ? [{ x: (rp.a[0] + rp.b[0]) / 2 - 30, y: rp.a[1] - 26, w: 60, h: 16 }, { x: rp.a[0] - 26, y: (rp.a[1] + rp.b[1]) / 2 - 30, w: 16, h: 60 }] : []),
  ]
  const soft: Box[] = [
    ...shifted.flatMap((l) => {
      const n = Math.ceil(Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) / 5)
      return Array.from({ length: n + 1 }, (_, i) => ({ x: l.a[0] + ((l.b[0] - l.a[0]) * i) / n - 1.5, y: l.a[1] + ((l.b[1] - l.a[1]) * i) / n - 1.5, w: 3, h: 3 }))
    }),
    ...(rp ? [{ x: rp.a[0], y: rp.a[1] - 14, w: rp.b[0] - rp.a[0], h: 4 }, { x: rp.a[0] - 14, y: rp.a[1], w: 4, h: rp.b[1] - rp.a[1] }, ...[rp.a[0], rp.b[0]].map((x) => ({ x: x - 2, y: rp.a[1], w: 4, h: rp.b[1] - rp.a[1] })), ...[rp.a[1], rp.b[1]].map((y) => ({ x: rp.a[0], y: y - 2, w: rp.b[0] - rp.a[0], h: 4 }))] : []),
  ]
  const texts = marks.map(({ item }) => [`${item.name}${order.has(item.key) ? `  ${order.get(item.key)}` : ''}`, item.info])
  const placed = placeLabels(marks.map(({ at }, i) => ({ at, r: 8, w: Math.max(textW(texts[i][0], NAME), textW(texts[i][1], INFO)) + 4, h: NAME + INFO + 5 })), blocked, soft, FRAME)
  const step = STEPS.find((s) => s * k >= 90) ?? 100
  const parts = step <= 2 ? step * 2 : 5
  const grid = rect ? { xs: Array.from({ length: Math.floor(rect.w) + 1 }, (_, i) => rect.x + i), zs: Array.from({ length: Math.floor(rect.d) + 1 }, (_, i) => rect.z + i) } : { xs: [], zs: [] }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily="Helvetica, Arial, sans-serif" style={{ background: '#fff' }}>
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="#fff" stroke="#000" />
      {rect && rp && <g>
        {grid.xs.map((x) => <line key={`x${x}`} x1={P([x, rect.z])[0]} y1={rp.a[1]} x2={P([x, rect.z])[0]} y2={rp.b[1]} stroke="#ddd" strokeWidth={0.6} />)}
        {grid.zs.map((z) => <line key={`z${z}`} x1={rp.a[0]} y1={P([rect.x, z])[1]} x2={rp.b[0]} y2={P([rect.x, z])[1]} stroke="#ddd" strokeWidth={0.6} />)}
        <rect x={rp.a[0]} y={rp.a[1]} width={rp.b[0] - rp.a[0]} height={rp.b[1] - rp.a[1]} fill="none" stroke="#000" strokeWidth={2.5} />
        <path d={`M${rp.a[0]} ${rp.a[1] - 16}v8M${rp.a[0]} ${rp.a[1] - 12}H${rp.b[0]}M${rp.b[0]} ${rp.a[1] - 16}v8`} stroke="#000" strokeWidth={0.8} />
        <text x={(rp.a[0] + rp.b[0]) / 2} y={rp.a[1] - 15} fontSize={11} fontWeight="bold" textAnchor="middle" stroke="#fff" strokeWidth={4} paintOrder="stroke">{num(rect.w)} m</text>
        <path d={`M${rp.a[0] - 16} ${rp.a[1]}h8M${rp.a[0] - 12} ${rp.a[1]}V${rp.b[1]}M${rp.a[0] - 16} ${rp.b[1]}h8`} stroke="#000" strokeWidth={0.8} />
        <text x={rp.a[0] - 15} y={(rp.a[1] + rp.b[1]) / 2} fontSize={11} fontWeight="bold" textAnchor="middle" stroke="#fff" strokeWidth={4} paintOrder="stroke" transform={`rotate(-90 ${rp.a[0] - 15} ${(rp.a[1] + rp.b[1]) / 2})`}>{num(rect.d)} m</text>
      </g>}
      {shifted.map((l, i) => {
        const s = style(l.run)
        return <g key={i}>
          <line x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash || undefined} />
          {arrow(l.a, l.b, s.color)}
          {l.cut && <text x={l.cut.startsWith('to') ? l.b[0] : l.a[0]} y={(l.cut.startsWith('to') ? l.b[1] : l.a[1]) - 4} fontSize={INFO} textAnchor="middle">{l.cut}</text>}
        </g>
      })}
      {marks.map(({ item, at }) => <Mark key={item.key} item={item} at={at} k={k} />)}
      {tips.map((t, i) => <text key={i} x={t.x} y={t.y + 3} fontSize={7} textAnchor="middle" fontWeight="bold">{t.label}</text>)}
      {badges.map(({ run, at }, i) => <g key={i}><circle cx={at[0]} cy={at[1]} r={7.5} fill="#fff" stroke={style(run).color} strokeWidth={2} /><text x={at[0]} y={at[1] + 3.5} fontSize={9} fontWeight="bold" textAnchor="middle">{run.n}</text></g>)}
      {marks.map(({ item, at }, i) => {
        const { box, ring } = placed[i]
        const end = nearest(box, at)
        return <g key={item.key}>
          {ring > 0 && <line x1={at[0]} y1={at[1]} x2={end[0]} y2={end[1]} stroke="#000" strokeWidth={0.5} />}
          <text x={box.x + 2} y={box.y + NAME} fontSize={NAME} fontWeight="bold" stroke="#fff" strokeWidth={2.5} paintOrder="stroke">{texts[i][0]}</text>
          <text x={box.x + 2} y={box.y + NAME + INFO + 2} fontSize={INFO} stroke="#fff" strokeWidth={2.5} paintOrder="stroke">{texts[i][1]}</text>
        </g>
      })}
      <g transform={`translate(0 ${H - 46})`}>
        <line x1={0} y1={0} x2={W} y2={0} stroke="#000" />
        <text x={16} y={20} fontSize={14} fontWeight="bold">Lighting plot · {title}</text>
        <text x={16} y={36} fontSize={9}>{rect ? `${num(rect.w)} × ${num(rect.d)} m, ${num(rect.h)} m high · ` : ''}top-down, as on the layout tab · grid 1 m</text>
        <g transform={`translate(330 14)`}>
          {Array.from({ length: parts }, (_, i) => <rect key={i} x={(i * step * k) / parts} y={0} width={(step * k) / parts} height={6} fill={i % 2 ? '#fff' : '#000'} stroke="#000" strokeWidth={0.8} />)}
          <text x={0} y={18} fontSize={9}>0</text>
          <text x={step * k} y={18} fontSize={9} textAnchor="middle">{step} m</text>
        </g>
        <text x={W - 16} y={20} fontSize={9} textAnchor="end">○ PAR · ■ moving head (▾ front) · ✱ LED tubes (numbers at tube tips) · ■ device</text>
        <text x={W - 16} y={36} fontSize={9} textAnchor="end">labels: name  run.order · type · U universe.address · hang height · ① run number, ▶ cable direction</text>
      </g>
    </svg>
  )
}

function Swatch({ s }: { s: Style }) {
  return <svg width={44} height={10} viewBox="0 0 44 10"><line x1={2} y1={5} x2={42} y2={5} stroke={s.color} strokeWidth={s.width + 0.5} strokeDasharray={s.dash || undefined} /></svg>
}

function Done() {
  return <span className="plot-done" />
}

export function Plot({ show }: { show: Show }) {
  const [scope, setScope] = useState('all')
  const ref = useRef<HTMLDivElement>(null)
  const rooms = roomsOf(show)
  const items = itemsOf(show)
  const ends = endsOf(show)
  const runs = runsOf(show)
  const style = styles(runs)
  const order = new Map(runs.flatMap((r) => (r.type === 'other' ? [] : r.stops.slice(1).map((key, i): [string, string] => [key, `${r.n}.${i + 1}`]))))
  const shown = rooms.length ? rooms.filter((r) => scope === 'all' || r.id === scope) : [null]
  const inScope = (key: string) => scope === 'all' || ends.get(key)?.room === scope
  const scoped = runs.filter((r) => r.stops.some(inScope))
  const fixtures = fixtureRows(show)
  const tubes = tubeRows(show)
  const s = summary(show, fixtures, tubes)
  const block = (key: string) => show.blocks.find((b) => b.id === key)
  const at = (key: string) => {
    const b = block(key)
    const u = items.find((i) => i.key === (b?.kind === 'tube' ? b.set : key))
    return u ? `${num(u.at[0])}, ${num(u.at[1])} · h ${num(u.height)}` : ''
  }
  const save = () => ref.current?.querySelectorAll('svg').forEach((svg, i) => download(`lsgleam-plot-${shown[i]?.name ?? 'layout'}.svg`, svg.outerHTML))
  return (
    <div className="schedule plot">
      <div className="schedule-tools">
        {rooms.length > 1 && <label>room <select value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">all</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
        <button onClick={() => window.print()}>print</button>
        <button onClick={save}>download SVG</button>
      </div>
      <div ref={ref}>
        {shown.map((room) => <div key={room?.id ?? 'layout'} className="plot-plan"><PlanSvg room={room} items={items} ends={ends} runs={runs} style={style} order={order} /></div>)}
      </div>
      <section className="plot-sheet">
        <h2>Legend and checks</h2>
        <div className="schedule-summary">
          <div><h4>Symbols</h4><div>○ PAR (centre dot)</div><div>□ moving head, ▾ marks its front</div><div>✱ LED tube set, tube numbers at the tips</div><div>■ device (node, board, controller, audio)</div><div>dashed outline: not patched</div><div>tick from a symbol: where it points</div><div>label “1.13”: run 1, 13th on the cable</div></div>
          <div><h4>Fixtures</h4>{s.types.map(([t, n]) => <div key={t}>{n} × {t}</div>)}<div>{tubes.length} LED tubes</div></div>
          <div className="schedule-universes"><h4>Universes</h4><div>{s.universes.map((u) => <div key={u}>{u}</div>)}</div></div>
          <div className="schedule-warnings"><h4>Warnings</h4>{s.warnings.length ? s.warnings.map((w) => <div key={w}>{w}</div>) : <div>none</div>}</div>
        </div>
        <h3>Cable runs</h3>
        <table>
          <thead><tr><th>Run</th><th>Line</th><th>Cable</th><th>From</th><th>Universes</th><th>Stops</th></tr></thead>
          <tbody>{scoped.map((r) => <tr key={r.n}><td>{r.n}</td><td><Swatch s={style(r)} /></td><td>{r.type}</td><td>{r.title}</td><td>{r.universes.map((u) => `U${u}`).join(', ')}</td><td>{r.stops.length - 1}</td></tr>)}</tbody>
        </table>
      </section>
      {scoped.filter((r) => r.type === 'dmx').map((r) => {
        const node = block(r.stops[0])
        return (
          <section key={r.n} className="plot-sheet">
            <h2><Swatch s={style(r)} /> Run {r.n} · DMX · {r.title}{node?.kind === 'artnet' ? ` · ${node.protocol} ${node.ip}` : ''}</h2>
            <table>
              <thead><tr><th>#</th><th>Fixture</th><th>Type</th><th>Channels</th><th>Universe</th><th>Start address</th><th>Position x, z · height (m)</th><th>Room</th><th>Done</th></tr></thead>
              <tbody>{r.stops.slice(1).map((key, i) => {
                const b = block(key)
                const f = fixtures.find((x) => x.id === key)
                return <tr key={key} className={f?.warn ? 'warn' : ''}><td>{i + 1}</td><td>{b?.name ?? key}</td><td>{b?.kind === 'fixture' ? profileOf(b).label : b?.kind}</td><td>{f ? `${f.channels} ch (${range(f.address, f.address + f.channels - 1)})` : ''}</td><td>{f?.universe ?? ''}</td><td><b>{f?.address ?? ''}</b></td><td>{at(key)}</td><td>{f?.room}</td><td><Done /></td></tr>
              })}</tbody>
            </table>
          </section>
        )
      })}
      {scoped.some((r) => r.type === 'pixel') && (
        <section className="plot-sheet">
          <h2>Pixel runs</h2>
          {scoped.filter((r) => r.type === 'pixel').map((r) => {
            const board = block(r.stops[0])
            return (
              <div key={r.n} className="plot-run">
                <h3><Swatch s={style(r)} /> Run {r.n} · {r.title}{board?.kind === 'board' ? ` · ${board.protocol} ${board.ip}` : ''} · U{r.universes.join(', U')}</h3>
                <table>
                  <thead><tr><th>#</th><th>Tube set</th><th>Tube</th><th>LEDs</th><th>Length</th><th>LEDs on output</th><th>Universe / addresses</th><th>Position x, z · height (m)</th><th>Done</th></tr></thead>
                  <tbody>{r.stops.slice(1).map((key, i) => {
                    const t = tubes.find((x) => x.id === key)
                    return <tr key={key}><td>{i + 1}</td><td>{t?.set}</td><td>{t?.name}</td><td>{t?.leds}</td><td>{t ? formatLength(t.length) : ''}</td><td>{t ? range(t.offset + 1, t.offset + t.leds) : ''}</td><td>{t?.spans.map(([u, [a, b]]) => `U${u} ${range(a, b)}`).join(', ')}</td><td>{at(key)}</td><td><Done /></td></tr>
                  })}</tbody>
                </table>
              </div>
            )
          })}
        </section>
      )}
      {scoped.some((r) => r.type === 'other') && (
        <section className="plot-sheet">
          <h2>Other cables</h2>
          <table>
            <thead><tr><th>Run</th><th>From</th><th>To</th><th>Done</th></tr></thead>
            <tbody>{scoped.filter((r) => r.type === 'other').map((r) => {
              const c = show.cables.find((x) => x.from === r.stops[0] && x.to === r.stops[1])
              return <tr key={r.n}><td>{r.n}</td><td>{block(r.stops[0])?.name} · {c?.fromPort} ({at(r.stops[0])})</td><td>{block(r.stops[1])?.name} · {c?.port} ({at(r.stops[1])})</td><td><Done /></td></tr>
            })}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
