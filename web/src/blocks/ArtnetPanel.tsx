import { Fragment } from 'react'
import { Field } from '../panels/fields'
import { type Props, Protocol } from '../panels/shared'
import { chainOf, type ArtnetBlock } from './artnet'

export function ArtnetPanel({ show, block, onPatch }: Props & { block: ArtnetBlock }) {
  const rows = [...block.universes.map((u) => ({ u, out: true })), ...block.inputs.map((u) => ({ u, out: false }))].sort((x, y) => x.u - y.u)
  const set = (next: { u: number; out: boolean }[]) => onPatch({ universes: [...new Set(next.filter((r) => r.out).map((r) => r.u))], inputs: [...new Set(next.filter((r) => !r.out).map((r) => r.u))] })
  const free = () => { let u = 0; while (rows.some((r) => r.u === u)) u++; return u }
  const label = (key: string) => {
    const b = show.blocks.find((x) => x.id === key)
    return b?.kind === 'fixture' ? `${b.name} @${b.address}` : b?.name ?? key
  }
  return (
    <>
      <Protocol value={block.protocol} onChange={(protocol) => onPatch({ protocol })} />
      <Field label="IP" value={block.ip} onCommit={(v) => onPatch({ ip: v })} />
      <div className="par">
        <label>Active</label>
        <input type="checkbox" checked={block.active} onChange={(e) => onPatch({ active: e.target.checked })} />
      </div>
      <h3>Universes</h3>
      {rows.map((r, i) => (
        <div className="light-row" key={i}>
          <input type="number" min={0} defaultValue={r.u} onBlur={(e) => { const u = Math.max(0, Math.round(Number(e.target.value))); if (u !== r.u) set(rows.map((x, k) => (k === i ? { ...x, u } : x))) }} />
          <select value={r.out ? 'out' : 'in'} onChange={(e) => set(rows.map((x, k) => (k === i ? { ...x, out: e.target.value === 'out' } : x)))}>
            <option value="out">out</option>
            <option value="in">in</option>
          </select>
          <button title="remove universe" onClick={() => set(rows.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
      <div className="par">
        <label />
        <button onClick={() => set([...rows, { u: free(), out: true }])}>add universe</button>
      </div>
      {block.universes.map((u) => (
        <Fragment key={u}>
          <h4>U{u} chain</h4>
          {chainOf(show, block.id, u).map((k) => <div className="help" key={k}>{label(k)}</div>)}
          {chainOf(show, block.id, u).length === 0 && <div className="help">nothing cabled</div>}
        </Fragment>
      ))}
      <div className="help">On the layout tab, cable an out universe to a fixture's DMX in, then that fixture's DMX out to the next. Repatch numbers addresses along each chain. Cable a DMX controller into an in universe to read its faders.</div>
    </>
  )
}

