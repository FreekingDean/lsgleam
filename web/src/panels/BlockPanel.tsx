import { Field } from './fields'
import { PlacementEditor } from './Placement'
import { scenesOf, type InputType, INPUT_TYPES } from '../model/show'
import { fixturesOf } from '../model/patch'
import { ceilingAt, onWall } from '../model/units'
import { inputPorts, PORTS } from '../model/ports'
import type { Layout, Props } from './shared'
import { AudioPanel, DmxInPanel, ArtnetPanel, CdjPanel, BoxPanel, BltPanel, AudioSlicePanel } from './hardware'
import { TubeSetPanel, BoardPanel, StripPanel } from './pixels'
import { ScenePanel, InputPanel, ManualPanel } from './scene'
import { GroupPanel, FixturePanel, LightPanel } from './lights'
import { blockDef, hasDef } from '../blocks'
import { panelOf } from '../blocks/panels'

function PlacementFields({ show, layout, block }: Props & { layout: Layout }) {
  const { placement, onPlace } = layout
  const ceiling = ceilingAt(show, placement.position[0], placement.position[2])
  return (
    <>
      <PlacementEditor placement={placement} onPlace={(p) => onPlace(p)} floor={block.kind === 'box'} />
      {block.kind !== 'box' && ceiling !== null && (
        <div className="par">
          <label />
          <button onClick={() => onPlace({ ...placement, position: [placement.position[0], ceiling, placement.position[2]] })} title="set height to the ceiling of the room it's in">to ceiling ({ceiling.toFixed(2)} m)</button>
          <button onClick={() => { const p = onWall(show, placement); if (p) onPlace(p) }} title="move onto the nearest wall of its room, facing in">to wall</button>
        </div>
      )}
      {block.kind !== 'box' && (
        <div className="par">
          <label>Flip ports</label>
          <input type="checkbox" checked={layout.flip} onChange={(e) => onPlace(placement, e.target.checked)} />
        </div>
      )}
      <div className="help">Lengths in metres; type 100ft or 30' for feet. Turn is around the vertical, flip V hangs a light upside down. The simulator edits the same placement.</div>
      <hr />
    </>
  )
}

function HiddenPorts({ show, block, onPatch }: Props) {
  const hidden = new Set(block.hidden ?? [])
  const all = inputPorts({ ...block, hidden: [] }, show)
  if (all.length < 2 || blockDef(block.kind)?.slotted) return null
  const toggle = (id: string, on: boolean) => {
    const next = new Set(hidden)
    if (on) next.delete(id)
    else next.add(id)
    onPatch({ hidden: [...next] })
  }
  return (
    <>
      <h3>Ports</h3>
      <div className="signals">
        {all.map((p) => (
          <label key={p.id} title={p.hint ?? p.id}>
            <input type="checkbox" checked={!hidden.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
            {p.label}
          </label>
        ))}
      </div>
      <div className="help">Untick inputs you don't use to keep the node short. Hiding a wired port removes its wires. On a light, wiring `look` hides colour and dimmer (and vice versa), and wiring `position` hides Pan/Tilt.</div>
    </>
  )
}

function body(props: Props) {
  const { block } = props
  if (hasDef(block)) {
    const Panel = panelOf(block.kind)
    return <Panel {...props} ports={PORTS} />
  }
  switch (block.kind) {
    case 'audio': return <AudioPanel {...props} block={block} />
    case 'dmxin': return <DmxInPanel {...props} block={block} />
    case 'blt': return <BltPanel {...props} block={block} />
    case 'audioslice': return <AudioSlicePanel {...props} block={block} />
    case 'fixture': return <FixturePanel {...props} block={block} />
    case 'light': return <LightPanel {...props} block={block} />
    case 'group': return <GroupPanel {...props} block={block} />
    case 'artnet': return <ArtnetPanel {...props} block={block} />
    case 'cdj': return <CdjPanel {...props} block={block} />
    case 'box': return <BoxPanel {...props} block={block} />
    case 'tubeset': return <TubeSetPanel {...props} block={block} />
    case 'strip': return <StripPanel {...props} block={block} />
    case 'board': return <BoardPanel {...props} block={block} />
    case 'scene': return <ScenePanel {...props} block={block} />
    case 'input': return <InputPanel {...props} block={block} />
    case 'output': return (
      <>
        <div className="par">
          <label>Type</label>
          <select value={block.type} onChange={(e) => props.onPatch({ type: e.target.value as InputType })}>
            {INPUT_TYPES.filter((t) => t !== 'audio').map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="help">Shows up as an output port on this composite's node. Whatever you wire in here comes out of that port. The name is the port label.</div>
      </>
    )
    case 'composite': return (
      <>
        <div className="par"><label /><button onClick={() => props.onOpenScene(block.id)}>open</button></div>
        <div className="help">Your own block. Double-click it (or open) to edit inside: Input blocks become its input ports, Output blocks its output ports, and transformers in between do the work. Composites can hold other composites. In TD it is a COMP of the same name.</div>
      </>
    )
    case 'manual': return <ManualPanel {...props} block={block} />
  }
}

export function BlockPanel(props: Props) {
  const { block, onPatch, show } = props
  const { values: _values, positions: _positions, aims: _aims, rows: _rows, ...identity } = block as Record<string, unknown>
  const key = JSON.stringify({ ...identity, flip: props.layout?.flip, placement: props.layout?.placement, targets: fixturesOf(show, block.id, true), scenes: scenesOf(show).map((s) => s.id), cables: show.cables.filter((c) => c.from === block.id) })
  return (
    <aside className="panel">
      <h2>{block.name}</h2>
      <div className="path">/project1/{block.id}</div>
      <div className="pars" key={key}>
        {props.layout && <PlacementFields {...props} layout={props.layout} />}
        <Field label="Name" value={block.name} onCommit={(v) => onPatch({ name: v })} />
        {body(props)}
        <HiddenPorts {...props} />
      </div>
    </aside>
  )
}
