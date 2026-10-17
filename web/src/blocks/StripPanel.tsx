import { Fragment } from 'react'
import { NumberBox } from '../panels/fields'
import { STRIP_ALONG, type StripAlong, STRIP_MODES, type StripMode } from '../model/show'
import type { Props } from '../panels/shared'
import type { StripBlock } from './strip'

export function StripPanel({ block, driven, onPatch, targets }: Props & { block: StripBlock; targets: string[] }) {
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
