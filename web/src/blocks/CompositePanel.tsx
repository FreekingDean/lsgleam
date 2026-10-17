import type { Props } from '../panels/shared'
import type { CompositeBlock } from './composite'

export function CompositePanel({ block, onOpenScene }: Props & { block: CompositeBlock }) {
  return (
    <>
      <div className="par"><label /><button onClick={() => onOpenScene(block.id)}>open</button></div>
      <div className="help">Your own block. Double-click it (or open) to edit inside: Input blocks become its input ports, Output blocks its output ports, and transformers in between do the work. Composites can hold other composites. In TD it is a COMP of the same name.</div>
    </>
  )
}
