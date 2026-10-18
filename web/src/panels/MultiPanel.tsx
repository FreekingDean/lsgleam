import { NumberBox } from './fields'
import { RotateButtons } from './Placement'
import { turned } from '../model/rotation'
import { INPUT_TYPES, hasProfile, profileOf, type Block, type Placement, type Show } from '../model/show'
import { PATTERN_MODES } from '../model/catalog'
import { ceilingAt, onWall, unitsOf, type Unit } from '../model/units'
import { parseLength } from '../model/format'

type Props = {
  show: Show
  ids: string[]
  layout: boolean
  onPatch: (patches: [string, Partial<Block>][]) => void
  onPlace: (placements: [string, Placement, boolean | undefined][]) => void
  onValue: (ids: string[], key: string, value: number) => void
}

const SKIP = new Set(['id', 'name', 'x', 'y', 'w', 'h', 'scene', 'kind', 'profile', 'address', 'port', 'apiPort', 'token', 'device', 'node', 'universe', 'active', 'flip'])
const ENUMS: Record<string, string[]> = { protocol: ['artnet', 'sacn'], mode: PATTERN_MODES, advance: ['step', 'trigger'] }
const LABELS: Record<string, string> = { floor: 'Minimum', fadeIn: 'Fade in (s)', fadeOut: 'Fade out (s)', every: 'Every N', pulse: 'Pulse (Hz)', max: 'Max', ip: 'IP', locked: 'Locked', master: 'Master deck' }
const label = (k: string) => LABELS[k] ?? k[0].toUpperCase() + k.slice(1)
const same = <T,>(values: T[]) => values.every((v) => v === values[0])

function Mixed({ label, values, onCommit, format = String }: { label: string; values: (string | number)[]; onCommit: (v: string) => void; format?: (v: string | number) => string }) {
  const mixed = !same(values)
  const shown = mixed ? '' : format(values[0])
  return (
    <div className={`par${mixed ? ' mixed' : ''}`}>
      <label>{label}</label>
      <input key={shown + values.length} defaultValue={shown} placeholder={mixed ? 'mixed' : ''} onBlur={(e) => e.target.value !== shown && e.target.value !== '' && onCommit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
    </div>
  )
}

function Check({ label, values, onChange }: { label: string; values: boolean[]; onChange: (v: boolean) => void }) {
  const mixed = !same(values)
  return (
    <div className={`par${mixed ? ' mixed' : ''}`}>
      <label>{label}</label>
      <input type="checkbox" checked={!mixed && values[0]} ref={(el) => { if (el) el.indeterminate = mixed }} onChange={(e) => onChange(e.target.checked)} />
    </div>
  )
}

function Choice({ label, values, options, onChange }: { label: string; values: string[]; options: string[]; onChange: (v: string) => void }) {
  const mixed = !same(values)
  return (
    <div className={`par${mixed ? ' mixed' : ''}`}>
      <label>{label}</label>
      <select value={mixed ? '' : values[0]} onChange={(e) => e.target.value && onChange(e.target.value)}>
        {mixed && <option value="">mixed</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

const meters = (v: string | number) => String(Number(Number(v).toFixed(3)))

function PlacementFields({ show, units, onPlace }: { show: Show; units: Unit[]; onPlace: Props['onPlace'] }) {
  const ceiled = units.filter((u) => u.block.kind !== 'box').flatMap((u): [Unit, number][] => { const h = ceilingAt(show, u.placement.position[0], u.placement.position[2]); return h === null ? [] : [[u, h]] })
  const axis = (i: number, v: string) => {
    const m = parseLength(v)
    if (m === null) return
    onPlace(units.map((u) => { const position = [...u.placement.position] as [number, number, number]; position[i] = m; return [u.key, { ...u.placement, position }, undefined] }))
  }
  const ported = units.filter((u) => u.block.kind !== 'box')
  return (
    <>
      <Mixed label="Height (m)" values={units.map((u) => u.placement.position[1])} format={meters} onCommit={(v) => axis(1, v)} />
      <Mixed label="X (m)" values={units.map((u) => u.placement.position[0])} format={meters} onCommit={(v) => axis(0, v)} />
      <Mixed label="Z (m)" values={units.map((u) => u.placement.position[2])} format={meters} onCommit={(v) => axis(2, v)} />
      <Mixed label="Turn (°)" values={units.map((u) => u.placement.rotation[1])} onCommit={(v) => { const d = Number(v); if (!Number.isNaN(d)) onPlace(units.map((u) => [u.key, turned({ ...u.placement, rotation: [u.placement.rotation[0], 0, u.placement.rotation[2]] }, 1, d), undefined])) }} />
      <RotateButtons onTurn={(axis, by) => onPlace(units.map((u) => [u.key, turned(u.placement, axis, by), undefined]))} />
      {ceiled.length > 0 && (
        <div className="par">
          <label />
          <button onClick={() => onPlace(ceiled.map(([u, h]) => [u.key, { ...u.placement, position: [u.placement.position[0], h, u.placement.position[2]] }, undefined]))} title="set each one's height to the ceiling of the room it's in">to ceiling</button>
          <button onClick={() => onPlace(ceiled.flatMap(([u]) => { const p = onWall(show, u.placement); return p ? [[u.key, p, undefined] as [string, Placement, undefined]] : [] }))} title="move each onto the nearest wall of its room, facing in">to wall</button>
        </div>
      )}
      {ported.length > 0 && <Check label="Flip ports" values={ported.map((u) => u.flip)} onChange={(flip) => onPlace(ported.map((u) => [u.key, u.placement, flip]))} />}
    </>
  )
}

function SharedParams({ blocks, onPatch }: { blocks: Block[]; onPatch: Props['onPatch'] }) {
  const records = blocks.map((b) => b as unknown as Record<string, unknown>)
  const kinds = new Set(blocks.map((b) => b.kind))
  const keys = Object.keys(records[0]).filter((k) => !SKIP.has(k) && records.every((r) => k in r && typeof r[k] === typeof records[0][k] && ['number', 'boolean', 'string'].includes(typeof r[k])))
  const set = (k: string, v: unknown) => onPatch(blocks.map((b) => [b.id, { [k]: v } as Partial<Block>]))
  return (
    <>
      {keys.map((k) => {
        const values = records.map((r) => r[k])
        if (typeof values[0] === 'boolean') return <Check key={k} label={label(k)} values={values as boolean[]} onChange={(v) => set(k, v)} />
        if (typeof values[0] === 'number') return <Mixed key={k} label={label(k)} values={values as number[]} onCommit={(v) => !Number.isNaN(Number(v)) && set(k, Number(v))} />
        if (ENUMS[k]) return <Choice key={k} label={label(k)} values={values as string[]} options={ENUMS[k]} onChange={(v) => set(k, v)} />
        if (k === 'ip') return <Mixed key={k} label={label(k)} values={values as string[]} onCommit={(v) => set(k, v)} />
        if (k === 'type' && kinds.size === 1) return <Choice key={k} label="Type" values={values as string[]} options={blocks[0].kind === 'input' ? INPUT_TYPES : ['signal', 'index']} onChange={(v) => set(k, v)} />
        return null
      })}
    </>
  )
}

function Channels({ blocks, onValue }: { blocks: Block[]; onValue: Props['onValue'] }) {
  const lights = blocks.filter(hasProfile)
  if (lights.length !== blocks.length || new Set(lights.map((l) => l.profile)).size !== 1) return null
  const profile = profileOf(lights[0])
  const skip = lights.some((l) => l.kind === 'group') ? profile.position ?? [] : []
  return (
    <>
      <h3>Channels</h3>
      {profile.attrs.map((ch) => {
        const i = ch.key
        if (skip.includes(i)) return null
        const values = lights.map((l) => l.values[i] ?? ch.default)
        const mixed = !same(values)
        const ids = lights.map((l) => l.id)
        if (ch.options) {
          const last = ch.options.length - 1
          return (
            <div className={`par${mixed ? ' mixed' : ''}`} key={ch.key}>
              <label>{ch.label}</label>
              <select value={mixed ? '' : Math.round(values[0] * last)} onChange={(e) => e.target.value !== '' && onValue(ids, i, Number(e.target.value) / last)}>
                {mixed && <option value="">mixed</option>}
                {ch.options.map((o, k) => <option key={o} value={k}>{o}</option>)}
              </select>
            </div>
          )
        }
        return (
          <div className={`par${mixed ? ' mixed' : ''}`} key={ch.key}>
            <label>{ch.label}</label>
            <div className="slider">
              <input type="range" min={0} max={1} step={0.001} value={mixed ? 0 : values[0]} onChange={(e) => onValue(ids, i, Number(e.target.value))} />
              {mixed ? <input className="slider-num" type="number" min={0} max={1} step={0.01} placeholder="mixed" onBlur={(e) => e.target.value !== '' && onValue(ids, i, Math.max(0, Math.min(1, Number(e.target.value))))} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /> : <NumberBox value={values[0]} onCommit={(v) => onValue(ids, i, v)} />}
            </div>
          </div>
        )
      })}
    </>
  )
}

export function MultiPanel({ show, ids, layout, onPatch, onPlace, onValue }: Props) {
  const units = layout ? unitsOf(show).filter((u) => ids.includes(u.key)) : []
  const blockIds = ids
  const blocks = blockIds.map((id) => show.blocks.find((b) => b.id === id)).filter((b): b is Block => !!b)
  return (
    <>
      {units.length > 1 && <PlacementFields show={show} units={units} onPlace={onPlace} />}
      {blocks.length > 0 && <SharedParams blocks={blocks} onPatch={onPatch} />}
      {blocks.length > 0 && <Channels blocks={blocks} onValue={onValue} />}
      <div className="help">Settings every selected node has. Greyed fields differ between them; editing one sets it on all.</div>
    </>
  )
}
