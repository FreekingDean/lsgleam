import { useState } from 'react'
import type { Show } from '../model/show'
import { formatLength } from '../model/format'
import { floorsOf } from '../model/floors'
import { download } from '../td/blt'
import { compare, fixtureRows, num, range, summary, tubeRows, type Column, type FixtureRow, type Row, type TubeRow } from './rows'
import { exportMvr } from './mvr'

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
  floor: (r) => r.floor,
}

const FLOOR_COLUMN: Column<FixtureRow> = { label: 'Floor', text: (r) => r.floor }
const ROOM = FIXTURE_COLUMNS.findIndex((c) => c.label === 'Room')
const WITH_FLOOR = [...FIXTURE_COLUMNS.slice(0, ROOM), FLOOR_COLUMN, ...FIXTURE_COLUMNS.slice(ROOM)]

const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
const toCsv = <T,>(rows: T[], columns: Column<T>[]) => [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => c.text(r)))].map((line) => line.map(cell).join(',')).join('\n')

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

export function Schedule({ show, onJump }: { show: Show; onJump: (id: string) => void }) {
  const [filter, setFilter] = useState('')
  const [groupBy, setGroupBy] = useState('none')
  const fixtures = fixtureRows(show)
  const columns = floorsOf(show).length > 1 ? WITH_FLOOR : FIXTURE_COLUMNS
  const tubes = tubeRows(show)
  const s = summary(show, fixtures, tubes)
  const q = filter.trim().toLowerCase()
  const match = <T,>(rows: T[], columns: Column<T>[]) => (q ? rows.filter((r) => columns.some((c) => c.text(r).toLowerCase().includes(q))) : rows)
  return (
    <div className="schedule">
      <div className="schedule-tools">
        <input placeholder="filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <label>group by <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>{Object.keys(GROUPS).filter((g) => g !== 'floor' || columns === WITH_FLOOR).map((g) => <option key={g}>{g}</option>)}</select></label>
        <button onClick={() => window.print()}>print</button>
        <button onClick={() => exportMvr(show)} title="fixtures, patch and rooms as MVR + GDTF, for Unreal and other visualisers">export MVR</button>
      </div>
      <h2>Fixture schedule</h2>
      <div className="schedule-summary">
        <div><h4>Fixtures</h4>{s.types.map(([t, n]) => <div key={t}>{n} × {t}</div>)}<div>{tubes.length} LED tubes</div></div>
        <div className="schedule-universes"><h4>Universes</h4><div>{s.universes.map((u) => <div key={u}>{u}</div>)}</div></div>
        <div><h4>Pixel boards</h4>{s.boards.map((o) => <div key={o}>{o}</div>)}</div>
        <div className="schedule-warnings"><h4>Warnings</h4>{s.warnings.length ? s.warnings.map((w) => <div key={w}>{w}</div>) : <div>none</div>}</div>
      </div>
      <Table title="Fixtures" file="lsgleam-fixtures.csv" rows={match(fixtures, columns)} columns={columns} group={groupBy === 'none' ? undefined : GROUPS[groupBy]} onJump={onJump} />
      <Table title="LED tubes" file="lsgleam-tubes.csv" rows={match(tubes, TUBE_COLUMNS)} columns={TUBE_COLUMNS} onJump={onJump} />
    </div>
  )
}
