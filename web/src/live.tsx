import { createContext, useContext } from 'react'
import { outputPorts, type Block, type Show } from './show'

export type PortValues = Record<string, Record<string, number>>
export type Sample = { value: number; history: number[] }

export const HISTORY = 60

export const liveKey = (show: Show, block: Block, portId: string, isInput: boolean) => {
  if (!isInput) return `${block.id}:${portId}`
  const wire = show.wires.find((w) => w.to === block.id && w.port === portId)
  return wire ? `${wire.from}:${wire.fromPort}` : null
}

export function outputValue(block: Block, chans: Record<string, number> | undefined, portId: string, show: Show) {
  if (!chans) return undefined
  const ports = outputPorts(block, show)
  if (ports.length === 1) return Object.values(chans)[0]
  return chans[portId]
}

export function record(show: Show, values: PortValues, history: Map<string, number[]>) {
  for (const b of show.blocks) {
    for (const p of outputPorts(b, show)) {
      const v = outputValue(b, values[b.id], p.id, show)
      if (v === undefined) continue
      const key = `${b.id}:${p.id}`
      const h = history.get(key) ?? []
      h.push(v)
      if (h.length > HISTORY) h.shift()
      history.set(key, h)
    }
  }
}

export const LiveContext = createContext<{ debug: boolean; get: (key: string) => Sample | undefined }>({ debug: false, get: () => undefined })

export const useLive = () => useContext(LiveContext)

export function Sparkline({ history, type }: { history: number[]; type: string }) {
  const w = 40
  const h = 12
  const lo = type === 'signal' ? 0 : Math.min(...history)
  const hi = type === 'signal' ? 1 : Math.max(...history)
  const span = hi - lo || 1
  const points = history.map((v, i) => `${(i / (HISTORY - 1)) * w},${h - ((v - lo) / span) * h}`).join(' ')
  return (
    <svg className="td-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" />
    </svg>
  )
}

export function LiveValue({ sample, type }: { sample: Sample | undefined; type: string }) {
  if (!sample) return null
  const text = type === 'index' ? String(Math.round(sample.value)) : sample.value.toFixed(3)
  return (
    <span className="td-live">
      <span>{text}</span>
      <Sparkline history={sample.history} type={type} />
    </span>
  )
}
