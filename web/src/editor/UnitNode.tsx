import { Position, type NodeProps, type Node } from '@xyflow/react'
import { PortHandle, PortRow } from './PortHandle'
import { TYPE_COLORS } from '../model/catalog'
import type { Unit } from '../model/units'

export type UnitFlowNode = Node<{ unit: Unit; block: Unit['block']; sub: string }, 'unit'>

export function UnitNode({ id, data, selected }: NodeProps<UnitFlowNode>) {
  const { unit, sub } = data
  const [inSide, outSide] = unit.flip ? [Position.Right, Position.Left] : [Position.Left, Position.Right]
  return (
    <div className={`td-node unit ${unit.block.kind}${selected ? ' selected' : ''}`}>
      <div className="td-node-name">{unit.name}</div>
      <div className="td-node-type">{sub}</div>
      <div className="td-node-type">
        height {unit.placement.position[1].toFixed(1)} m <span className="unit-dir" title={`turn ${unit.placement.rotation[1]}°`} style={{ transform: `rotate(${-unit.placement.rotation[1]}deg)` }}>▼</span>
        {Math.abs(unit.placement.rotation[0]) > 90 && ' hung'}
      </div>
      <div className={`td-ports${unit.flip ? ' flipped' : ''}`}>
        <div className="td-ports-in">
          {unit.inputs.map((p) => (
            <PortRow key={p.id} node={id} id={p.id} type="target">
              <PortHandle node={id} id={p.id} type="target" position={inSide} style={{ background: TYPE_COLORS[p.type] }} />
              <span style={{ color: TYPE_COLORS[p.type] }}>{p.label}</span>
            </PortRow>
          ))}
        </div>
        <div className="td-ports-out">
          {unit.outputs.map((p) => (
            <PortRow key={p.id} node={id} id={p.id} type="source">
              <span style={{ color: TYPE_COLORS[p.type] }}>{p.label}</span>
              <PortHandle node={id} id={p.id} type="source" position={outSide} style={{ background: TYPE_COLORS[p.type] }} />
            </PortRow>
          ))}
        </div>
      </div>
    </div>
  )
}

export type BoxFlowNode = Node<{ unit: Unit; block: Unit['block']; sub: string }, 'box'>

export function BoxNode({ data, selected }: NodeProps<BoxFlowNode>) {
  return (
    <div className={`layout-box${selected ? ' selected' : ''}`}>
      <span>{data.unit.name} · {data.sub}</span>
    </div>
  )
}
