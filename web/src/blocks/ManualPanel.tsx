import { scenesOf } from '../model/show'
import type { Props } from '../panels/shared'
import type { ManualBlock } from './manual'

export function ManualPanel({ show, block, driven, onPatch }: Props & { block: ManualBlock }) {
  const byIndex = driven.has('index')
  return (
    <>
      {scenesOf(show).map((s, i) => (
        <div className={`par${byIndex ? ' driven' : ''}`} key={s.id}>
          <label>{s.name}</label>
          <button className={block.active === i ? 'on' : ''} disabled={byIndex} onClick={() => onPatch({ active: i })}>{block.active === i ? 'live' : 'go'}</button>
        </div>
      ))}
      <div className="help">One output per scene, 1 for the chosen one; wire each into its scene's `on`. With an index wired (Steps on a fader, BLT's song, a Drop count) scene N is chosen by the index and the buttons are off.</div>
    </>
  )
}
