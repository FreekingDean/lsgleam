import { useState } from 'react'
import { NumField } from './fields'
import { memberPort, type LightBlock, POSITION_PORT, profileOf, type FixtureBlock, type GroupBlock, type GroupPosition, type Position } from '../model/show'
import { fixturesOf } from '../model/patch'
import { type Props, Slider, PatternFields } from './shared'

type Named = { name: string }

function PositionRows<T extends Named>({ positions, locked, summary, onStore, onSet, onGo, onChange }: {
  positions: T[]; locked: boolean; summary: (p: T) => string
  onStore: () => Promise<T>; onSet: (p: T) => Promise<T>; onGo: (p: T) => void; onChange: (positions: T[]) => void
}) {
  const [error, setError] = useState('')
  const attempt = (work: () => Promise<void>) => work().catch((e: Error) => setError(e.message))
  const store = () => attempt(async () => onChange([...positions, await onStore()]))
  const overwrite = (i: number) => attempt(async () => {
    const next = await onSet(positions[i])
    onChange(positions.map((q, k) => (k === i ? next : q)))
  })
  return (
    <>
      <hr />
      <div className="positions-head">
        <h4>Positions</h4>
        <button onClick={store}>store current</button>
      </div>
      {error && <div className="error">{error}</div>}
      {positions.map((p, i) => (
        <div key={i} className={`position${locked ? ' driven' : ''}`}>
          <span className="position-index">{i}</span>
          <input value={p.name} onChange={(e) => onChange(positions.map((q, k) => (k === i ? { ...q, name: e.target.value } : q)))} />
          <span className="position-values">{summary(p)}</span>
          <button disabled={locked} title="move here" onClick={() => onGo(p)}>go</button>
          <button title="overwrite with current" onClick={() => overwrite(i)}>set</button>
          <button title="delete" onClick={() => onChange(positions.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
    </>
  )
}

function Positions({ block, driven, onPatch, onValue, readValues }: Props & { block: LightBlock }) {
  const profile = profileOf(block)
  const names = profile.position ?? []
  const index = (n: string) => profile.channels.findIndex((ch) => ch.name === n)
  return (
    <PositionRows<Position>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => names.map((n) => (p.values[n] ?? 0).toFixed(2)).join(' / ')}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, values: await readValues(names) })}
      onSet={async (p) => ({ ...p, values: await readValues(names) })}
      onGo={(p) => names.forEach((n) => p.values[n] !== undefined && onValue(index(n), p.values[n]))}
      onChange={(positions) => onPatch({ positions })}
    />
  )
}

function GroupPositions({ block, driven, onPatch, onValue, readValues }: Props & { block: GroupBlock }) {
  const profile = profileOf(block)
  const names = profile.position ?? []
  const index = (n: string) => profile.channels.findIndex((ch) => ch.name === n)
  const members = Array.from({ length: block.size }, (_, i) => String(i))
  const readAll = async () => Object.fromEntries(await Promise.all(members.map(async (id) => [id, await readValues(names, id)])))
  return (
    <PositionRows<GroupPosition>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => `${Object.keys(p.members).length} members`}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, members: await readAll() })}
      onSet={async (p) => ({ ...p, members: await readAll() })}
      onGo={(p) => Object.entries(p.members).forEach(([id, m]) => names.forEach((n) => m[n] !== undefined && onValue(index(n), m[n], id)))}
      onChange={(positions) => onPatch({ positions })}
    />
  )
}

export function GroupPanel(props: Props & { block: GroupBlock }) {
  const { show, block, driven, onPatch, onValue } = props
  const profile = profileOf(block)
  const aimed = profile.position ?? []
  const members = Array.from({ length: block.size }, (_, i) => String(i))
  const names = (k: string) => fixturesOf(show, memberPort(block.id, Number(k))).map((id) => show.blocks.find((b) => b.id === id)?.name ?? id).join(', ') || 'unwired'
  return (
    <>
      <NumField label="Members" value={block.size} onCommit={(v) => onPatch({ size: Math.max(1, Math.min(64, Math.round(v))) })} step={1} />
      <PatternFields block={block} driven={driven} onPatch={onPatch} onResetPattern={props.onResetPattern} />
      <div className="help">Each member is its own port on the scene node (show tab); wire each to one or more fixtures on the Outputs node. The pattern spreads brightness over them by mode: it takes the pattern input if wired, else the Dimmer input, else the Dimmer slider. Other channel inputs and sliders apply to every member.</div>
      <hr />
      {profile.channels.map((ch, i) => aimed.includes(ch.name) ? null : (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={driven.has(ch.name)} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
      {aimed.length > 0 && members.map((id, k) => (
        <div className="member" key={id}>
          <h4>{k + 1} → {names(id)}</h4>
          {aimed.map((n) => {
            const i = profile.channels.findIndex((ch) => ch.name === n)
            return <Slider key={n} label={profile.channels[i].label} value={block.aims[id]?.[n] ?? profile.channels[i].default} driven={driven.has(n)} onChange={(v) => onValue(i, v, id)} />
          })}
        </div>
      ))}
      {profile.position && <GroupPositions {...props} />}
    </>
  )
}

export function FixturePanel({ block, onPatch, onValue }: Props & { block: FixtureBlock }) {
  const profile = profileOf(block)
  return (
    <>
      <NumField label="Address" value={block.address} onCommit={(v) => onPatch({ address: v })} step={1} />
      <hr />
      <div className="help">Values when no scene is driving it (the weight scenes leave over).</div>
      {profile.channels.map((ch, i) => (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={false} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
    </>
  )
}

export function LightPanel(props: Props & { block: LightBlock }) {
  const { show, block, driven, onValue } = props
  const profile = profileOf(block)
  const targets = fixturesOf(show, block.id).map((id) => show.blocks.find((b) => b.id === id)?.name ?? id)
  return (
    <>
      <div className="help">Drives {targets.length ? targets.join(', ') : 'nothing yet: wire it to fixtures on the show tab'}. Unwired channels send these values.</div>
      {profile.channels.map((ch, i) => (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={driven.has(ch.name)} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
      {profile.position && <Positions {...props} />}
    </>
  )
}
