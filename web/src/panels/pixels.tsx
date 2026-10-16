import { Fragment, useState } from 'react'
import { Field, NumberBox, NumField } from './fields'
import { TubeDesigner } from '../views/TubeDesigner'
import { STRIP_ALONG, type StripAlong, membersOf, type TubeSetBlock, STRIP_MODES, type StripBlock, type StripMode, type BoardBlock } from '../model/show'
import { formatLength } from '../model/format'
import { outputUniverses, pixelChain, tubePatch, universesPerOutput, fixturesOf } from '../model/patch'
import { type Props, PixelProtocol } from './shared'

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

export function StripPanel({ show, block, driven, onPatch }: Props & { block: StripBlock }) {
  const targets = fixturesOf(show, block.id).map((id) => show.blocks.find((b) => b.id === id)?.name ?? id)
  const slider = (label: string, key: string, value: number, set: (v: number) => void, max = 1) => (
    <div className={`par${driven.has(key) ? ' driven' : ''}`} key={key}>
      <label>{label}</label>
      <div className="slider">
        <input type="range" min={0} max={max} step={0.01} disabled={driven.has(key)} defaultValue={value} onPointerUp={(e) => set(Number((e.target as HTMLInputElement).value))} onKeyUp={(e) => set(Number((e.target as HTMLInputElement).value))} />
        {driven.has(key) ? <span>input</span> : <NumberBox value={value} max={max} onCommit={set} />}
      </div>
    </div>
  )
  const swatch = (label: string, key: string, value: string, set: (v: string) => void) => (
    <div className={`par${driven.has(key) ? ' driven' : ''}`} key={key}>
      <label>{label}</label>
      {driven.has(key) ? <span>input</span> : <input type="color" defaultValue={value} onBlur={(e) => e.target.value !== value && set(e.target.value)} />}
    </div>
  )
  const num = (label: string, key: 'dimmer' | 'position' | 'width' | 'speed' | 'spread', max = 1) => slider(label, key, block[key], (v) => onPatch({ [key]: v }), max)
  const setStop = (i: number, patch: Partial<StripBlock['stops'][number]>) => onPatch({ stops: block.stops.map((st, k) => (k === i ? { ...st, ...patch } : st)) })
  return (
    <>
      <div className="help">Drives {targets.length ? targets.join(', ') : 'nothing yet: wire it to LED tubes on the show tab'}.</div>
      <div className="par">
        <label>Effect</label>
        <select value={block.mode} onChange={(e) => onPatch({ mode: e.target.value as StripMode })}>
          {STRIP_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {block.mode !== 'ramp' && swatch('Colour', 'color', block.color, (color) => onPatch({ color }))}
      {num('Dimmer', 'dimmer')}
      {block.mode !== 'solid' && num(block.mode === 'fill' ? 'Fill level' : block.mode === 'ramp' ? 'Offset' : 'Position', 'position')}
      {block.mode !== 'solid' && block.mode !== 'ramp' && num(block.mode === 'fill' ? 'Edge' : 'Width', 'width')}
      {(block.mode === 'chase' || block.mode === 'ramp') && num('Speed (laps/s)', 'speed', 4)}
      {block.mode !== 'solid' && num('Spread across tubes', 'spread')}
      {block.mode !== 'solid' && (
        <div className="par">
          <label>Runs along</label>
          <select value={block.along} onChange={(e) => onPatch({ along: e.target.value as StripAlong })}>
            {Object.entries(STRIP_ALONG).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      )}
      {block.mode === 'ramp' && block.stops.map((st, i) => (
        <Fragment key={`${i}:${block.stops.length}`}>
          <h4 className="stop-head">Stop {i + 1}<button disabled={block.stops.length <= 2} onClick={() => onPatch({ stops: block.stops.filter((_, k) => k !== i) })} title="remove stop">×</button></h4>
          {swatch('Colour', `stop${i}`, st.color, (color) => setStop(i, { color }))}
          {slider('Spot (0–1)', `at${i}`, st.at, (at) => setStop(i, { at }))}
        </Fragment>
      ))}
      {block.mode === 'ramp' && <div className="par"><label /><button onClick={() => onPatch({ stops: [...block.stops, { at: 1, color: '#ffffff' }] })}>add colour stop</button></div>}
      <div className="help">Effects run along each tube from its start (blue end in the designer), whatever its LED count. Solid: the whole tube. Band: a soft band centred at position, width each side. Fill: lit from the start up to the fill level (wire kick energy in for a meter), with a soft edge. Chase: a band that laps the tube at the speed, offset by position. Ramp: a gradient through the colour stops from start (0) to end (1), shifted by offset and scrolled at the speed; make the last stop match the first for a seamless loop. Spread shifts the effect by tube number, so at 1 a chase or ramp goes once round a tree. Runs along picks the 0–1 axis: each tube from its start, height across the whole design (rings, flames, a level meter up the tree), or distance from the base (shockwaves out to the tips).</div>
      <div className="help">Every setting is also an input port on the node: wire it to drive the setting, and its field greys out and reads "input". Untick the ports you don't use below to keep the node short.</div>
    </>
  )
}
