import { Field } from '../panels/fields'
import type { Props } from '../panels/shared'
import { combineSlots, type CombineBlock } from './combine'
import type { Ports } from './types'

export function CombinePanel({ show, block, ports, onPatch }: Props & { block: CombineBlock; ports: Ports }) {
  const slots = combineSlots(show, block, ports)
  return (
    <>
      {slots.map((p, i) => <Field key={p.id} label={`Slot ${i + 1}`} value={block.names[p.id] ?? ''} placeholder={p.label} onCommit={(v) => onPatch({ names: { ...block.names, [p.id]: v } })} />)}
      <div className="help">Wire into the open + slot to add a value; removing its wire removes the slot. The first wire sets the type{slots.length ? ` (${slots[0].type})` : ''} and every slot takes that type. Gate, Not, Fade, Range, Mix and And run per channel on a signal Combine; Split unbundles any type. Blank names use the source's name.</div>
    </>
  )
}
