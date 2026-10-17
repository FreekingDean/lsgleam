import { Fragment } from 'react'
import { Field, NumField } from '../panels/fields'
import { type Props, PixelProtocol } from '../panels/shared'
import { type BoardBlock, outputUniverses, pixelChain, universesPerOutput } from './board'

export function BoardPanel({ show, block, onPatch }: Props & { block: BoardBlock }) {
  const outputs = Array.from({ length: block.outputs }, (_, i) => i + 1)
  return (
    <>
      <PixelProtocol value={block.protocol} onChange={(protocol) => onPatch({ protocol })} />
      <Field label="IP" value={block.ip} onCommit={(ip) => onPatch({ ip })} />
      <div className="par">
        <label>Active</label>
        <input type="checkbox" checked={block.active} onChange={(e) => onPatch({ active: e.target.checked })} />
      </div>
      <NumField label="Outputs" value={block.outputs} onCommit={(v) => onPatch({ outputs: Math.max(1, Math.min(64, Math.round(v))) })} step={1} />
      <NumField label="LEDs per output" value={block.ledsPerOutput} onCommit={(v) => onPatch({ ledsPerOutput: Math.max(1, Math.round(v)) })} step={1} />
      <NumField label="LEDs per universe" value={block.ledsPerUniverse} onCommit={(v) => onPatch({ ledsPerUniverse: Math.max(1, Math.min(170, Math.round(v))) })} step={1} />
      <NumField label="Start universe" value={block.startUniverse} onCommit={(v) => onPatch({ startUniverse: Math.max(0, Math.round(v)) })} step={1} />
      <h3>Board config</h3>
      {outputs.map((o) => {
        const us = outputUniverses(block, o)
        const tubes = pixelChain(show, block.id, o)
        const used = tubes.reduce((n, t) => n + t.leds, 0)
        let at = 0
        return (
          <Fragment key={o}>
            <h4>Output {o} · {used}/{block.ledsPerOutput} LEDs{used > block.ledsPerOutput ? ' · over!' : ''}</h4>
            {us.map((u, k) => {
              const first = k * block.ledsPerUniverse + 1
              const last = Math.min(block.ledsPerOutput, (k + 1) * block.ledsPerUniverse)
              return <div className="help" key={u}>LEDs {first}–{last} → universe {u}, ch 1–{(last - first + 1) * 3}</div>
            })}
            {tubes.map((t) => {
              const from = at + 1
              at += t.leds
              return <div className="help" key={t.id}>{t.name}: LEDs {from}–{at}</div>
            })}
          </Fragment>
        )
      })}
      <div className="help">Art-Net only: TD sends {universesPerOutput(block)} universe{universesPerOutput(block) > 1 ? 's' : ''} per output ({block.ledsPerUniverse} RGB LEDs, 3 channels each) to {block.ip}, outputs numbered on from the start universe. Set the board itself up the same way. Cable each output to a tube of the same protocol on the layout tab.</div>
    </>
  )
}
