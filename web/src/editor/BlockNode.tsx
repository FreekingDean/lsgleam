import { Position, type NodeProps, type Node } from '@xyflow/react'
import { useContext } from 'react'
import { PickTitle, PortHandle, PortRow } from './PortHandle'
import { FocusContext } from './connect'
import { TYPE_COLORS, portHint } from '../model/catalog'
import { defOf, hasDef, kindInfo } from '../blocks'
import { profileOf, type Block, type Patch, type Port, type Rail } from '../model/show'
import { LiveValue, useLive } from './live'

export type FlowNode = Node<{ block: Block; inputs: Port[]; outputs: Port[]; patch: Patch | null; keys: Record<string, string | null>; targets: string[] }, 'block'>
export type RailFlowNode = Node<{ title: string; rails: Rail[]; side: 'in' | 'out' }, 'rail'>

function subtitle(b: Block, patch: Patch | null, targets: string[], outputs: Port[]) {
  if (hasDef(b)) return defOf(b).subtitle(b, outputs, targets)
  switch (b.kind) {
    case 'fixture': return `${profileOf(b).label} · ${patch ? `U${patch.universe}` : 'unpatched'} @${b.address}`
    case 'light': return `${profileOf(b).label} → ${targets.join(', ') || 'nothing yet'}`
    case 'group': return `${b.mode} → ${targets.length}× ${profileOf(b).label}`
    case 'scene': return 'scene'
    case 'input': return b.type
    case 'output': return `${b.type} out`
    case 'composite': return 'double-click to edit'
    case 'manual': return 'buttons'
    case 'tube': return `${b.leds} LEDs`
  }
}

export function BlockNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { block, keys } = data
  const live = useLive()
  const focus = useContext(FocusContext)
  const eye = block.kind === 'scene' || block.kind === 'composite'
  const sample = (portId: string) => {
    const key = keys[portId]
    return live.debug && selected && key ? live.get(key) : undefined
  }
  return (
    <div className={`td-node ${block.kind}${selected ? ' selected' : ''}`} title={kindInfo(block.kind)}>
      <div className="td-node-kind">{block.kind}{eye && <button className={`eye nodrag${focus.hidden.has(id) ? ' off' : ''}`} onClick={(e) => { e.stopPropagation(); focus.toggleHidden(id) }} title={focus.hidden.has(id) ? 'wires hidden: click to show them' : 'click to hide this node\'s wires (selecting it still shows them)'}>{focus.hidden.has(id) ? '◌' : '◉'}</button>}</div>
      <div className="td-node-name">{block.name}</div>
      <div className="td-node-type">{subtitle(block, data.patch, data.targets, data.outputs)}</div>
      <div className="td-ports">
        <div className="td-ports-in">
          {data.inputs.map((p) => (
            <PortRow key={p.id} node={id} id={p.id} type="target">
              <PortHandle node={id} id={p.id} type="target" position={Position.Left} style={{ background: TYPE_COLORS[p.type] }} title={portHint(p)} />
              <span style={{ color: TYPE_COLORS[p.type] }} title={portHint(p)}>{p.label}</span>
              <LiveValue sample={sample(`in:${p.id}`)} type={p.type} />
            </PortRow>
          ))}
        </div>
        <div className="td-ports-out">
          {data.outputs.map((p) => (
            <PortRow key={p.id} node={id} id={p.id} type="source">
              <span style={{ color: TYPE_COLORS[p.type] }} title={portHint(p)}>{p.label}</span>
              <PortHandle node={id} id={p.id} type="source" position={Position.Right} style={{ background: TYPE_COLORS[p.type] }} title={portHint(p)} />
              <LiveValue sample={sample(`out:${p.id}`)} type={p.type} />
            </PortRow>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RailNode({ id, data }: NodeProps<RailFlowNode>) {
  const side = data.side === 'in' ? Position.Right : Position.Left
  const type = data.side === 'in' ? 'source' : 'target'
  return (
    <div className={`td-node rail ${data.side}`} title={data.side === 'in' ? 'Signals from the layout: sources, controllers, audio inputs' : 'Every fixture on the layout; wire scene outputs here'}>
      <div className="td-node-name">{data.title}</div>
      {data.rails.map((r) => (
        <div key={r.title} className="rail-section">
          <PickTitle title={r.title} ports={r.ports.map((p) => ({ node: id, id: p.id, type }))} />
          {r.ports.map((p) => (
            <PortRow key={p.id} node={id} id={p.id} type={type} className={`rail-${data.side}`}>
              <span style={{ color: TYPE_COLORS[p.type] }} title={portHint(p)}>{p.label}</span>
              <PortHandle node={id} id={p.id} type={type} position={side} style={{ background: TYPE_COLORS[p.type] }} title={portHint(p)} />
            </PortRow>
          ))}
        </div>
      ))}
      {data.rails.length === 0 && <div className="td-node-type">{data.side === 'in' ? 'add sources on the layout' : 'add fixtures on the layout'}</div>}
    </div>
  )
}
