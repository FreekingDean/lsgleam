import { useState } from 'react'
import { Field } from './fields'
import { TubeDesigner } from '../views/TubeDesigner'
import { membersOf, type TubeSetBlock } from '../model/show'
import { formatLength } from '../model/format'
import { tubePatch } from '../model/patch'
import type { Props } from './shared'

export function TubeSetPanel({ show, block, onPatch, onDesign }: Props & { block: TubeSetBlock }) {
  const [designing, setDesigning] = useState(false)
  const design = show.designs?.find((d) => d.id === block.design)
  const copies = show.blocks.filter((b) => b.kind === 'tubeset' && b.design === block.design).length
  return (
    <>
      <div className="par">
        <label>Design</label>
        <select value={block.design} onChange={(e) => onPatch({ design: e.target.value })}>
          {(show.designs ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      {design && (
        <>
          <Field key={design.id} label="Design name" value={design.name} onCommit={(name) => onDesign({ ...design, name })} />
          <div className="par"><label /><button onClick={() => setDesigning(true)}>edit design</button></div>
          <div className="help">Used by {copies} cop{copies === 1 ? 'y' : 'ies'} on the layout; editing the design changes them all.</div>
        </>
      )}
      <h4>Tubes</h4>
      {membersOf(show, block.id).map((t) => {
        const patch = tubePatch(show, t.id)
        const board = show.blocks.find((b) => b.id === patch?.board)
        return <div className="help" key={t.id}>{t.name.slice(block.name.length + 1)}: {t.leds} LEDs · {formatLength(t.length)} · {patch && board ? `${board.name} out ${patch.output}, LEDs ${patch.offset + 1}–${patch.offset + t.leds}` : 'not cabled'}</div>
      })}
      <div className="help">Each tube has its own pixel in and out on this node: cable them to any controller output, or chain one tube's out into the next. On the show tab each tube is its own port under the Outputs node.</div>
      {designing && design && <TubeDesigner name={design.name} tubes={design.tubes} onSave={(tubes) => onDesign({ ...design, tubes })} onClose={() => setDesigning(false)} />}
    </>
  )
}
