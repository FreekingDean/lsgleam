import { NumField } from './fields'
import { scenesOf, type SceneBlock, type InputBlock, type InputType, INPUT_TYPES, type ManualBlock } from '../model/show'
import type { Props } from './shared'

export function ScenePanel({ show, block, onPatch, onOpenScene, onMoveScene }: Props & { block: SceneBlock }) {
  const scenes = scenesOf(show)
  const i = scenes.findIndex((s) => s.id === block.id)
  return (
    <>
      <div className="par">
        <label>Priority</label>
        <div className="sim-modes">
          <button disabled={i === 0} onClick={() => onMoveScene(block.id, -1)}>↑</button>
          <span className="position-index">{i}</span>
          <button disabled={i === scenes.length - 1} onClick={() => onMoveScene(block.id, 1)}>↓</button>
        </div>
      </div>
      <NumField label="Fade in (s)" value={block.fadeIn} onCommit={(v) => onPatch({ fadeIn: Math.max(0, v) })} />
      <NumField label="Fade out (s)" value={block.fadeOut} onCommit={(v) => onPatch({ fadeOut: Math.max(0, v) })} />
      <div className="par">
        <label />
        <button onClick={() => onOpenScene(block.id)}>open scene</button>
      </div>
      <div className="help">Inputs declared inside the scene are ports on the left, its fixture and group outputs on the right; wire those to fixtures on the Outputs node. `on` is the scene's weight, 0–1, smoothed by fade in (as it rises) and fade out (as it falls): each fixture blends every scene driving it by weight, and whatever weight is left shows the fixture's own layout values. An unwired `on` takes whatever weight the others leave. Priority only breaks exact ties.</div>
    </>
  )
}

export function InputPanel({ block, onPatch }: Props & { block: InputBlock }) {
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={block.type} onChange={(e) => onPatch({ type: e.target.value as InputType })}>
          {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="help">Shows up as an input port on the node of the scene or composite it lives in. Wire a value into that port outside; it comes out here. The name is the port label.</div>
    </>
  )
}

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
