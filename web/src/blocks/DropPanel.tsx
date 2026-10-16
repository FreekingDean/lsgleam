import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { DropBlock } from './drop'

export function DropPanel({ block, onPatch }: Props & { block: DropBlock }) {
  return (
    <>
      <NumField label="Kick threshold" value={block.threshold} onCommit={(threshold) => onPatch({ threshold })} />
      <NumField label="Quiet beats" value={block.beats} onCommit={(beats) => onPatch({ beats: Math.max(1, Math.round(beats)) })} step={1} />
      <NumField label="Cooldown (s)" value={block.cooldown} onCommit={(cooldown) => onPatch({ cooldown })} step={1} />
      <div className="help">Wire kick energy into kick and a beat pulse (AudioSlice beat/energy or a BLT beat) into beat. Beats are counted since the last kick; once that many pass the detector arms, and the first kick back is the drop: `armed` is 1 while waiting for it, `drop` pulses for a quarter second, `drops` counts them, at most once per cooldown.</div>
    </>
  )
}
