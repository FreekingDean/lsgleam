import { NumField } from '../panels/fields'
import { SceneRooms } from '../panels/SceneRooms'
import { scenesOf } from '../model/show'
import type { Props } from '../panels/shared'
import type { SceneBlock } from './scene'

export function ScenePanel({ show, block, onPatch, onOpenScene, onOpenPatch, onMoveScene }: Props & { block: SceneBlock }) {
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
      <SceneRooms show={show} block={block} onPatch={onPatch} />
      <div className="designer-buttons">
        <button onClick={() => onOpenScene(block.id)}>open scene</button>
        <button onClick={() => onOpenPatch(block.id)} title="patch this scene's outputs to fixtures in a grid">patch</button>
      </div>
      <div className="help">Inputs declared inside the scene are ports on the left. Its fixture, group and strip outputs reach fixtures through the patch matrix: the badge under the node (or the patch button) opens it. `on` is the scene's weight, 0–1, smoothed by fade in (as it rises) and fade out (as it falls): each fixture blends every scene driving it by weight, and whatever weight is left shows the fixture's own layout values. An unwired `on` takes whatever weight the others leave. Priority only breaks exact ties.</div>
    </>
  )
}
