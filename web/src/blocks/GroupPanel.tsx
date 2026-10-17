import { NumField } from '../panels/fields'
import { memberPort, POSITION_PORT, profileOf, type GroupPosition } from '../model/show'
import { type Props, Slider, PatternFields } from '../panels/shared'
import { type GroupBlock, fixturesOf } from './group'
import { PositionRows } from './PositionRows'

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
