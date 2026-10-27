import { ColorExtras, NumberBox, NumField } from '../panels/fields'
import { memberPort, POSITION_PORT, profileOf, type GroupPosition } from '../model/show'
import { type Props, Slider, PatternFields, Wired } from '../panels/shared'
import { type GroupBlock, type Wipe, type WipeOrder, COLOR_B_PORT, fixturesOf, PROGRESS_PORT, WIPE_OFF, WIPE_ORDERS } from './group'
import { hasRgb } from './light'
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

function WipeFields({ block, driven, onPatch }: Props & { block: GroupBlock }) {
  const wipe = { ...WIPE_OFF, ...block.wipe }
  const set = (patch: Partial<Wipe>) => onPatch({ wipe: { ...wipe, ...patch } })
  const fraction = (label: string, key: 'softness' | 'progress') => (
    <Wired label={label} wired={driven.has(key)}>
      <div className="par">
        <label>{label}</label>
        <div className="slider">
          <input type="range" min={0} max={1} step={0.01} key={wipe[key]} defaultValue={wipe[key]} onPointerUp={(e) => set({ [key]: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => set({ [key]: Number((e.target as HTMLInputElement).value) })} />
          <NumberBox value={wipe[key]} onCommit={(v) => set({ [key]: v })} />
        </div>
      </div>
    </Wired>
  )
  return (
    <>
      <hr />
      <div className="par">
        <label>Wipe</label>
        <input type="checkbox" checked={wipe.on} onChange={(e) => set({ on: e.target.checked })} />
      </div>
      {wipe.on && (
        <>
          <Wired label="Colour B" wired={driven.has(COLOR_B_PORT)}>
            <div className="par">
              <label>Colour B</label>
              <span className="color-field">
                <input type="color" key={wipe.colorB.hex} defaultValue={wipe.colorB.hex} onBlur={(e) => e.target.value !== wipe.colorB.hex && set({ colorB: { ...wipe.colorB, hex: e.target.value } })} />
                <ColorExtras value={wipe.colorB} onCommit={(colorB) => set({ colorB })} />
              </span>
            </div>
          </Wired>
          <div className="par">
            <label>Order</label>
            <select value={wipe.order} onChange={(e) => set({ order: e.target.value as WipeOrder })}>
              {Object.entries(WIPE_ORDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {fraction('Softness', 'softness')}
          {fraction('Progress', PROGRESS_PORT)}
        </>
      )}
      <div className="help">Wipe: each member shows colour A (the color input or the colour sliders) or colour B, and as progress rises 0 → 1 they flip to B one at a time in the chosen order (left/right/front/back use the fixtures' layout positions; unwired members go last). Softness 0 flips hard; higher crossfades each member over that fraction of its step. Brightness, pattern and positions apply as usual.</div>
    </>
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
      {hasRgb(block) && <WipeFields {...props} />}
    </>
  )
}
