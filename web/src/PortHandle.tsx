import { Handle, type Position } from '@xyflow/react'
import { useContext } from 'react'
import { FocusContext, useHandleClass, usePick, type PortKey } from './connect'

export function PortHandle({ node, id, type, position, style, title }: { node: string; id: string; type: 'source' | 'target'; position: Position; style?: React.CSSProperties; title?: string }) {
  return <Handle id={id} type={type} position={position} style={style} title={title} className={useHandleClass(node, id, type)} />
}

export function PortRow({ node, id, type, className = '', children }: { node: string; id: string; type: 'source' | 'target'; className?: string; children: React.ReactNode }) {
  const pick = usePick([{ node, id, type }])
  const focus = useContext(FocusContext)
  const rail = node.startsWith('__')
  return <div className={`td-port ${className}${pick.on ? ' picked' : ''}`} onClickCapture={pick.onClickCapture} onMouseEnter={rail ? () => focus.hover(id) : undefined} onMouseLeave={rail ? () => focus.hover(null) : undefined}>{children}</div>
}

export function PickTitle({ ports, title }: { ports: PortKey[]; title: string }) {
  const pick = usePick(ports)
  return <div className={`td-node-kind${pick.on ? ' picked' : ''}`} onClickCapture={pick.onClickCapture} title="⌘ or shift-click to pick every port in this section">{title}</div>
}
