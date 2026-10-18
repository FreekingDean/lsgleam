import { createContext, useContext } from 'react'
import { useConnection } from '@xyflow/react'

export type CanConnect = (from: string, fromPort: string, to: string, port: string) => boolean
export const ConnectContext = createContext<CanConnect>(() => true)

export type PortKey = { node: string; id: string; type: 'source' | 'target' }
export const portKey = (p: PortKey) => JSON.stringify([p.type, p.node, p.id])
export type Picks = { picked: Set<string>; toggle: (ports: PortKey[]) => void }
export const PickContext = createContext<Picks>({ picked: new Set(), toggle: () => {} })

export type Focus = { hidden: Set<string>; toggleHidden: (id: string) => void; hover: (port: string | null) => void }
export const FocusContext = createContext<Focus>({ hidden: new Set(), toggleHidden: () => {}, hover: () => {} })
export const PatchContext = createContext<(scene: string) => void>(() => {})

export function usePick(ports: PortKey[]) {
  const { picked, toggle } = useContext(PickContext)
  const on = ports.length > 0 && ports.every((p) => picked.has(portKey(p)))
  const onClickCapture = (e: React.MouseEvent) => {
    if (!(e.shiftKey || e.metaKey || e.ctrlKey)) return
    e.stopPropagation()
    e.preventDefault()
    toggle(ports)
  }
  return { on, onClickCapture }
}

export function useHandleClass(nodeId: string, portId: string, type: 'source' | 'target') {
  const can = useContext(ConnectContext)
  const from = useConnection((c) => (c.inProgress ? c.fromHandle : null))
  if (!from) return ''
  if (from.nodeId === nodeId && from.id === portId && from.type === type) return ''
  if (from.type === type) return 'no-connect'
  const ok = type === 'target' ? can(from.nodeId, from.id ?? '', nodeId, portId) : can(nodeId, portId, from.nodeId, from.id ?? '')
  return ok ? 'can-connect' : 'no-connect'
}
