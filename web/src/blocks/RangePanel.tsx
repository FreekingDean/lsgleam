import { NumField } from '../panels/fields'
import { type Props, Wired } from '../panels/shared'
import type { RangeBlock } from './range'

export function RangePanel({ block, driven, onPatch }: Props & { block: RangeBlock }) {
  const set = (key: 'tame' | 'wild', i: 0 | 1, v: number) => {
    const next: [number, number] = [...block[key]] as [number, number]
    next[i] = Math.max(0, Math.min(1, v))
    onPatch({ [key]: next })
  }
  const edge = (label: string, port: string, key: 'tame' | 'wild', i: 0 | 1) => (
    <Wired label={label} wired={driven.has(port)}>
      <NumField label={label} value={block[key][i]} onCommit={(v) => set(key, i, v)} />
    </Wired>
  )
  return (
    <>
      {edge('Tame min', 'tameMin', 'tame', 0)}
      {edge('Tame max', 'tameMax', 'tame', 1)}
      {edge('Wild min', 'wildMin', 'wild', 0)}
      {edge('Wild max', 'wildMax', 'wild', 1)}
      <div className="help">Output = min + signal × (max − min), where min and max slide from the tame pair at amount 0 to the wild pair at amount 1. Feed amount from a Scenes level, a Hold after a drop, or several summed.</div>
    </>
  )
}
