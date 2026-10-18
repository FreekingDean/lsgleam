import { NumField } from '../panels/fields'
import { memberPort, POSITION_PORT, profileOf, type GroupPosition } from '../model/show'
import { type Props, Slider, PatternFields } from '../panels/shared'
import { type GroupBlock, fixturesOf } from './group'
import { PositionRows } from './PositionRows'

function GroupPositions({ block, driven, onPatch, onValue, readValues }: Props & { block: GroupBlock }) {
  const names = profileOf(block).position ?? []
  const members = Array.from({ length: block.size }, (_, i) => String(i))
  const readAll = async () => Object.fromEntries(await Promise.all(members.map(async (id) => [id, await readValues(names, id)])))
  return (
    <PositionRows<GroupPosition>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => `${Object.keys(p.members).length} members`}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, members: await readAll() })}
      onSet={async (p) => ({ ...p, members: await readAll() })}
      onGo={(p) => Object.entries(p.members).forEach(([id, m]) => names.forEach((n) => m[n] !== undefined && onValue(n, m[n], id)))}
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
      <div className="help">Each member is its own port on the scene node (show tab); wire each to one or more fixtures on the Outputs node. The pattern spreads brightness over them by mode: it takes the pattern input if wired, else the intensity input, else the intensity slider. Other inputs and sliders apply to every member.</div>
      <hr />
      {profile.attrs.map((a) => aimed.includes(a.key) ? null : (
        <Slider key={a.key} label={a.label} value={block.values[a.key] ?? a.default} driven={driven.has(a.key)} onChange={(n) => onValue(a.key, n)} options={a.options} />
      ))}
      {aimed.length > 0 && members.map((id, k) => (
        <div className="member" key={id}>
          <h4>{k + 1} → {names(id)}</h4>
          {profile.attrs.filter((a) => aimed.includes(a.key)).map((a) => (
            <Slider key={a.key} label={a.label} value={block.aims[id]?.[a.key] ?? a.default} driven={driven.has(a.key)} onChange={(v) => onValue(a.key, v, id)} />
          ))}
        </div>
      ))}
      {profile.position && <GroupPositions {...props} />}
    </>
  )
}
