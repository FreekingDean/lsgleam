import { Position, type NodeProps, type Node } from '@xyflow/react'
import { useContext } from 'react'
import { PickTitle, PortHandle, PortRow } from './PortHandle'
import { FocusContext } from './connect'
import { KIND_INFO, TYPE_COLORS, portHint, profileOf, type Block, type Patch, type Port, type Rail } from './show'
import { LiveValue, useLive } from './live'

export type FlowNode = Node<{ block: Block; inputs: Port[]; outputs: Port[]; patch: Patch | null; keys: Record<string, string | null>; targets: string[] }, 'block'>
export type RailFlowNode = Node<{ title: string; rails: Rail[]; side: 'in' | 'out' }, 'rail'>

function subtitle(b: Block, patch: Patch | null, targets: string[]) {
  switch (b.kind) {
    case 'audio': return b.device || 'default device'
    case 'dmxin': return `${b.channels} faders`
    case 'blt': return `OSC :${b.port} · ${b.decks} decks`
    case 'audioslice': return `OSC :${b.port} · ${b.signals.length} signals`
    case 'level': return `RMS ×${b.gain}`
    case 'steps': return `${b.steps} steps`
    case 'gate': return `> ${Math.round(b.threshold * 100)}%${b.rescale ? ' · rescaled' : ''}`
    case 'pattern': return `${b.mode} · ${b.slots} slots`
    case 'drop': return `${b.beats} quiet beats`
    case 'hold': return `${b.beats} beats`
    case 'range': return `${b.tame.join('–')} → ${b.wild.join('–')}`
    case 'sequence': return b.values.join(' ')
    case 'looks': return b.scenes.map((s) => s.name).join(' · ')
    case 'fixture': return `${profileOf(b).label} · ${patch ? `U${patch.universe}` : 'unpatched'} @${b.address}`
    case 'light': return `${profileOf(b).label} → ${targets.join(', ') || 'nothing yet'}`
    case 'group': return `${b.mode} → ${targets.length}× ${profileOf(b).label}`
    case 'artnet': return `${b.protocol} → ${b.ip} · U${b.universes.join(',')}`
    case 'scene': return 'scene'
    case 'input': return b.type
    case 'output': return `${b.type} out`
    case 'composite': return 'double-click to edit'
    case 'manual': return 'buttons'
    case 'equals': return `== ${b.value}`
    case 'tube': return `${b.leds} LEDs`
    case 'strip': return `${b.mode} → ${targets.join(', ') || 'nothing yet'}`
    case 'board': return b.ip
    case 'values': return `${b.rows.length} values × ${b.steps}`
    case 'colors': return `${b.rows.length} colours × ${b.steps}`
    case 'latch': return 'set / reset'
    case 'and': return 'a × b'
    case 'not': return '1 − x'
    case 'mix': return `${b.type}: a → b`
    case 'fade': return `↑ ${b.rise}s · ↓ ${b.fall}s · ${b.curve}`
    case 'counter': return `0…${b.max}`
    case 'combine': return `${b.channels} → multichannel`
    case 'split': return `multichannel → ${b.channels}`
    case 'cdj': return `player ${b.player}`
    case 'box': return b.size.map((v) => v.toFixed(1)).join(' × ') + ' m'
    case 'constant': return b.pulse > 0 ? `pulse ${b.pulse} Hz × ${b.value}` : `${b.type} ${b.value}`
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
    <div className={`td-node ${block.kind}${selected ? ' selected' : ''}`} title={KIND_INFO[block.kind]}>
      <div className="td-node-kind">{block.kind}{eye && <button className={`eye nodrag${focus.hidden.has(id) ? ' off' : ''}`} onClick={(e) => { e.stopPropagation(); focus.toggleHidden(id) }} title={focus.hidden.has(id) ? 'wires hidden: click to show them' : 'click to hide this node\'s wires (selecting it still shows them)'}>{focus.hidden.has(id) ? '◌' : '◉'}</button>}</div>
      <div className="td-node-name">{block.name}</div>
      <div className="td-node-type">{subtitle(block, data.patch, data.targets)}</div>
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
