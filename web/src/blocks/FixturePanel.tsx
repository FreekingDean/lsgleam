import { NumField } from '../panels/fields'
import { profileOf } from '../model/show'
import { type Props, Slider } from '../panels/shared'
import type { FixtureBlock } from './fixture'

export function FixturePanel({ block, onPatch, onValue }: Props & { block: FixtureBlock }) {
  const profile = profileOf(block)
  return (
    <>
      <NumField label="Address" value={block.address} onCommit={(v) => onPatch({ address: v })} step={1} />
      <hr />
      <div className="help">Values when no scene is driving it (the weight scenes leave over).</div>
      {profile.channels.map((ch, i) => (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={false} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
    </>
  )
}
