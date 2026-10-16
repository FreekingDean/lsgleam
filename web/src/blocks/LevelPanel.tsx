import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { LevelBlock } from './level'

export function LevelPanel({ block, onPatch }: Props & { block: LevelBlock }) {
  return (
    <>
      <NumField label="Gain" value={block.gain} onCommit={(v) => onPatch({ gain: v })} step={0.1} />
      <NumField label="Attack (s)" value={block.attack} onCommit={(v) => onPatch({ attack: v })} />
      <NumField label="Release (s)" value={block.release} onCommit={(v) => onPatch({ release: v })} />
    </>
  )
}
