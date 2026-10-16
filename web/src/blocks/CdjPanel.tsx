import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { CdjBlock } from './cdj'

export function CdjPanel({ block, onPatch }: Props & { block: CdjBlock }) {
  return (
    <>
      <NumField label="Player" value={block.player} onCommit={(v) => onPatch({ player: Math.max(1, Math.round(v)) })} step={1} />
      <div className="help">A player on the floor. Cable its audio out to an audio input on the layout tab.</div>
    </>
  )
}

