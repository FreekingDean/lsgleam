import { useState } from 'react'
import { FIXTURE_PORT, profileOf, type BoardBlock, type Show } from '../model/show'
import { formatLength } from '../model/format'
import { pixelAddress, pixelChain, tubePatch, unitPatch } from '../model/patch'
import { roomAt, unitsOf } from '../model/units'
import { download } from '../td/blt'

type Row = { id: string; jump: string; warn: boolean }
type Column<T> = { label: string; text: (r: T) => string; sort?: (r: T) => number | string }
type FixtureRow = Row & { name: string; type: string; channels: number; node: string; universe: number | null; address: number; x: number; height: number; z: number; turn: number; tilt: number; room: string; scenes: string[] }
type TubeRow = Row & { set: string; name: string; protocol: string; leds: number; length: number; board: string; output: number | null; offset: number; spans: [number, [number, number]][] }

const num = (v: number) => `${Number(v.toFixed(2))}`
const range = (from: number, to: number) => `${from}–${to}`

function drivers(show: Show, id: string) {
  return show.wires.filter((w) => w.to === id && w.port === FIXTURE_PORT).flatMap((w) => {
    const scene = show.blocks.find((b) => b.id === w.from && b.kind === 'scene')
    const [outId, member] = w.fromPort.split(':')
    const out = show.blocks.find((b) => b.id === outId)
    return scene && out ? [`${scene.name}: ${out.name}${member === undefined ? '' : ` ${Number(member) + 1}`}`] : []
  })
}

function fixtureRows(show: Show): FixtureRow[] {
  return unitsOf(show).flatMap((u) => {
    const b = u.block
    if (b.kind !== 'fixture') return []
    const p = unitPatch(show, b.id)
    const node = show.blocks.find((x) => x.id === p?.node)
    const [x, height, z] = u.placement.position
    return [{
      id: b.id, jump: b.id, warn: !p, name: b.name, type: profileOf(b).label, channels: profileOf(b).channels.length,
      node: node?.kind === 'artnet' ? `${node.name} · ${node.ip} · ${node.protocol}` : '', universe: p?.universe ?? null, address: b.address,
      x, height, z, turn: u.placement.rotation[1], tilt: u.placement.rotation[0], room: roomAt(show, x, z)?.name ?? '', scenes: drivers(show, b.id),
    }]
  })
}

function spansOf(board: BoardBlock, output: number, offset: number, leds: number) {
  const spans = new Map<number, [number, number]>()
  for (let i = offset; i < offset + leds; i++) {
    const a = pixelAddress(board, output, i)
    spans.set(a.universe, [spans.get(a.universe)?.[0] ?? a.channel, a.channel + 2])
  }
  return [...spans]
}

function tubeRows(show: Show): TubeRow[] {
  return show.blocks.flatMap((t) => {
    if (t.kind !== 'tube') return []
    const set = show.blocks.find((b) => b.id === t.set)
    const p = tubePatch(show, t.id)
    const board = show.blocks.find((b): b is BoardBlock => b.kind === 'board' && b.id === p?.board)
    return [{
      id: t.id, jump: t.set ?? t.id, warn: !board, set: set?.name ?? '', name: set ? t.name.slice(set.name.length + 1) : t.name, protocol: t.protocol, leds: t.leds, length: t.length,
      board: board ? `${board.name} · ${board.ip}` : '', output: p && board ? p.output : null, offset: p?.offset ?? 0, spans: p && board ? spansOf(board, p.output, p.offset, t.leds) : [],
    }]
  })
}

const addressText = (r: FixtureRow) => (r.universe === null ? 'unpatched' : `${r.universe}/${range(r.address, r.address + r.channels - 1)}`)

const FIXTURE_COLUMNS: Column<FixtureRow>[] = [
  { label: 'Name', text: (r) => r.name },
  { label: 'Type', text: (r) => r.type },
  { label: 'Ch', text: (r) => `${r.channels}`, sort: (r) => r.channels },
  { label: 'Node', text: (r) => r.node || 'no DMX cable' },
  { label: 'Universe', text: (r) => (r.universe === null ? '' : `${r.universe}`), sort: (r) => r.universe ?? Infinity },
  { label: 'Address', text: addressText, sort: (r) => (r.universe === null ? Infinity : r.universe * 1000 + r.address) },
  { label: 'X (m)', text: (r) => num(r.x), sort: (r) => r.x },
  { label: 'Height', text: (r) => formatLength(r.height), sort: (r) => r.height },
  { label: 'Z (m)', text: (r) => num(r.z), sort: (r) => r.z },
  { label: 'Turn', text: (r) => `${num(r.turn)}°`, sort: (r) => r.turn },
  { label: 'Tilt', text: (r) => `${num(r.tilt)}°`, sort: (r) => r.tilt },
  { label: 'Room', text: (r) => r.room },
  { label: 'Scenes', text: (r) => r.scenes.join(', ') },
]

const TUBE_COLUMNS: Column<TubeRow>[] = [
  { label: 'Tubes', text: (r) => r.set },
  { label: 'Tube', text: (r) => r.name },
  { label: 'Protocol', text: (r) => r.protocol },
  { label: 'LEDs', text: (r) => `${r.leds}`, sort: (r) => r.leds },
  { label: 'Length', text: (r) => formatLength(r.length), sort: (r) => r.length },
  { label: 'Board', text: (r) => r.board || 'no pixel cable' },
  { label: 'Output', text: (r) => (r.output === null ? '' : `${r.output}`), sort: (r) => r.output ?? Infinity },
  { label: 'LED range', text: (r) => (r.output === null ? '' : range(r.offset + 1, r.offset + r.leds)), sort: (r) => (r.output === null ? Infinity : r.output * 100000 + r.offset) },
  { label: 'Universes', text: (r) => r.spans.map(([u, [a, b]]) => `U${u} ${range(a, b)}`).join(', '), sort: (r) => r.spans[0]?.[0] ?? Infinity },
]

const GROUPS: Record<string, (r: FixtureRow) => string> = {
  none: () => '',
  universe: (r) => (r.universe === null ? 'unpatched' : `${r.node} · U${r.universe}`),
  type: (r) => r.type,
}

const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
const toCsv = <T,>(rows: T[], columns: Column<T>[]) => [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => c.text(r)))].map((line) => line.map(cell).join(',')).join('\n')

function compare(a: number | string, b: number | string) {
  return typeof a === 'number' && typeof b === 'number' ? (a === b ? 0 : a < b ? -1 : 1) : `${a}`.localeCompare(`${b}`, undefined, { numeric: true })
}

function Table<T extends Row>({ title, file, rows, columns, group, onJump }: { title: string; file: string; rows: T[]; columns: Column<T>[]; group?: (r: T) => string; onJump: (id: string) => void }) {
  const [[by, dir], setSort] = useState<[number, number]>([0, 1])
  const key = (r: T) => columns[by].sort?.(r) ?? columns[by].text(r)
  const sorted = [...rows].sort((a, b) => dir * compare(key(a), key(b)))
  const shown = group ? [...sorted].sort((a, b) => compare(group(a), group(b))) : sorted
  return (
    <section>
      <div className="schedule-title">
        <h3>{title} <span>{rows.length}</span></h3>
        <button onClick={() => download(file, toCsv(shown, columns))}>CSV</button>
      </div>
      <table>
        <thead>
          <tr>{columns.map((c, i) => <th key={c.label} onClick={() => setSort([i, i === by ? -dir : 1])}>{c.label}{i === by ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>)}</tr>
        </thead>
        <tbody>
          {shown.flatMap((r, i) => [
            ...(group && group(r) && (i === 0 || group(shown[i - 1]) !== group(r)) ? [<tr key={`g:${group(r)}`} className="schedule-group"><td colSpan={columns.length}>{group(r)}</td></tr>] : []),
            <tr key={r.id} className={r.warn ? 'warn' : ''} onClick={() => onJump(r.jump)} title="show on the layout">{columns.map((c) => <td key={c.label}>{c.text(r)}</td>)}</tr>,
          ])}
        </tbody>
      </table>
    </section>
  )
}

function summary(show: Show, fixtures: FixtureRow[], tubes: TubeRow[]) {
  const types = new Map<string, number>()
  for (const f of fixtures) types.set(f.type, (types.get(f.type) ?? 0) + 1)
  const claims = new Map<string, { label: string; order: [string, number]; channels: Map<number, string[]> }>()
  const claim = (key: string, label: string, order: [string, number], from: number, to: number, name: string) => {
    const u = claims.get(key) ?? { label, order, channels: new Map() }
    claims.set(key, u)
    for (let c = from; c <= to; c++) u.channels.set(c, [...(u.channels.get(c) ?? []), name])
  }
  const warnings: string[] = []
  for (const f of fixtures) {
    if (f.universe === null) continue
    const end = f.address + f.channels - 1
    claim(`${f.node}:${f.universe}`, `${f.node.split(' · ')[0]} U${f.universe}`, [f.node, f.universe], f.address, end, f.name)
    if (end > 512) warnings.push(`${f.name} ends at channel ${end}, past 512 in U${f.universe}`)
  }
  for (const t of tubes) for (const [u, [a, b]] of t.spans) claim(`${t.board}:${u}`, `${t.board.split(' · ')[0]} U${u}`, [t.board, u], a, b, `${t.set} ${t.name}`)
  const universes = [...claims.values()].sort((a, b) => compare(a.order[0], b.order[0]) || a.order[1] - b.order[1])
  for (const u of universes) {
    const clash = new Set([...u.channels.values()].filter((names) => names.length > 1).flat())
    if (clash.size) warnings.push(`${u.label}: addresses overlap between ${[...clash].join(', ')}`)
  }
  for (const n of new Set(universes.map((u) => u.order[1]))) {
    const owners = new Set(universes.filter((u) => u.order[1] === n).map((u) => u.order[0].split(' · ')[0]))
    if (owners.size > 1) warnings.push(`U${n} is sent by ${[...owners].join(' and ')}`)
  }
  const boards = show.blocks.flatMap((b) => {
    if (b.kind !== 'board') return []
    const used = Array.from({ length: b.outputs }, (_, i) => i + 1).flatMap((o) => {
      const leds = pixelChain(show, b.id, o).reduce((sum, t) => sum + t.leds, 0)
      if (leds > b.ledsPerOutput) warnings.push(`${b.name} out ${o}: ${leds} LEDs on a ${b.ledsPerOutput}-LED output`)
      return leds ? [leds] : []
    })
    return [`${b.name} · ${b.ip}: ${used.length}/${b.outputs} outputs, ${used.reduce((a, n) => a + n, 0)} LEDs`]
  })
  const unpatched = fixtures.filter((f) => f.universe === null)
  if (unpatched.length) warnings.push(`Unpatched fixtures: ${unpatched.map((f) => f.name).join(', ')}`)
  const loose = tubes.filter((t) => t.output === null)
  if (loose.length) warnings.push(`Tubes without a pixel cable: ${loose.map((t) => `${t.set} ${t.name}`).join(', ')}`)
  return { types: [...types], universes: universes.map((u) => `${u.label}: ${u.channels.size}/512`), boards, warnings }
}

export function Schedule({ show, onJump }: { show: Show; onJump: (id: string) => void }) {
  const [filter, setFilter] = useState('')
  const [groupBy, setGroupBy] = useState('none')
  const fixtures = fixtureRows(show)
  const tubes = tubeRows(show)
  const s = summary(show, fixtures, tubes)
  const q = filter.trim().toLowerCase()
  const match = <T,>(rows: T[], columns: Column<T>[]) => (q ? rows.filter((r) => columns.some((c) => c.text(r).toLowerCase().includes(q))) : rows)
  return (
    <div className="schedule">
      <div className="schedule-tools">
        <input placeholder="filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <label>group by <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>{Object.keys(GROUPS).map((g) => <option key={g}>{g}</option>)}</select></label>
        <button onClick={() => window.print()}>print</button>
      </div>
      <h2>Fixture schedule</h2>
      <div className="schedule-summary">
        <div><h4>Fixtures</h4>{s.types.map(([t, n]) => <div key={t}>{n} × {t}</div>)}<div>{tubes.length} LED tubes</div></div>
        <div className="schedule-universes"><h4>Universes</h4><div>{s.universes.map((u) => <div key={u}>{u}</div>)}</div></div>
        <div><h4>Pixel boards</h4>{s.boards.map((o) => <div key={o}>{o}</div>)}</div>
        <div className="schedule-warnings"><h4>Warnings</h4>{s.warnings.length ? s.warnings.map((w) => <div key={w}>{w}</div>) : <div>none</div>}</div>
      </div>
      <Table title="Fixtures" file="lsgleam-fixtures.csv" rows={match(fixtures, FIXTURE_COLUMNS)} columns={FIXTURE_COLUMNS} group={groupBy === 'none' ? undefined : GROUPS[groupBy]} onJump={onJump} />
      <Table title="LED tubes" file="lsgleam-tubes.csv" rows={match(tubes, TUBE_COLUMNS)} columns={TUBE_COLUMNS} onJump={onJump} />
    </div>
  )
}
