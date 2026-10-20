import { NumField } from '../panels/fields'
import { type Props, Wired } from '../panels/shared'
import type { AddBlock } from './add'

export function AddPanel({ block, driven, onPatch }: Props & { block: AddBlock }) {
  return (
    <>
      <Wired label="Amount" wired={driven.has('amount')}>
        <NumField label="Amount" value={block.amount} onCommit={(amount) => onPatch({ amount })} step={1} />
      </Wired>
      <div className="help">out = in + amount. An index stays a whole number and is not wrapped, so a Colours block after it wraps round: index + 1 picks the next colour. A multichannel wire gets the amount added to every channel.</div>
    </>
  )
}
