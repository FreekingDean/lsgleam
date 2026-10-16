import { Field, NumberBox, NumField } from './fields'
import type { DropBlock, HoldBlock, RangeBlock, LevelBlock, Scene, LooksBlock, SequenceBlock, ConstantBlock, CounterBlock, SplitBlock, ColorsBlock, ValuesBlock, EqualsBlock, PatternAdvance, PatternBlock, StepsBlock, GateBlock, FadeBlock } from '../model/show'
import { splitSource } from '../model/ports'
import { type Props, Every, PatternFields, Wired } from './shared'

export function ConstantPanel({ block, onPatch }: Props & { block: ConstantBlock }) {
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={block.type} onChange={(e) => onPatch({ type: e.target.value as 'signal' | 'index' })}>
          <option value="signal">signal (0–1)</option>
          <option value="index">index (integer)</option>
        </select>
      </div>
      {block.type === 'signal' ? (
        <div className="par">
          <label>Value</label>
          <div className="slider">
            <input type="range" min={0} max={1} step={0.01} value={block.value} onChange={(e) => onPatch({ value: Number(e.target.value) })} />
            <NumberBox value={block.value} onCommit={(value) => onPatch({ value })} />
          </div>
        </div>
      ) : (
        <NumField label="Value" value={block.value} onCommit={(value) => onPatch({ value: Math.round(value) })} step={1} />
      )}
      <NumField label="Pulse (Hz)" value={block.pulse} onCommit={(pulse) => onPatch({ pulse: Math.max(0, pulse) })} />
      <div className="help">A test source. Pulse above 0 makes it a square wave between 0 and the value at that rate, handy for triggers and beats.</div>
    </>
  )
}

export function CounterPanel({ block, onPatch }: Props & { block: CounterBlock }) {
  return (
    <>
      <NumField label="Max" value={block.max} onCommit={(max) => onPatch({ max: Math.max(0, Math.round(max)) })} step={1} />
      <div className="help">Each rising edge on count adds one, clamped at max; reset (while high) zeroes it. Wire the output into Scene select's index to step through scenes.</div>
    </>
  )
}

export function SplitPanel({ show, block }: Props & { block: SplitBlock }) {
  const from = splitSource(show, block)
  return <div className="help">{from ? `One output per slot of ${from.name}, in order, with its names and type.` : 'No Combine upstream yet: wire a Combine into in, directly or through per-channel transforms and multichannel Inputs and Outputs.'}</div>
}

export function EqualsPanel({ block, onPatch }: Props & { block: EqualsBlock }) {
  return (
    <>
      <NumField label="Value" value={block.value} onCommit={(value) => onPatch({ value: Math.round(value) })} step={1} />
      <div className="help">1 while the index equals the value. Wire BLT's song index in and a scene's `on` out.</div>
    </>
  )
}

export function ValuesPanel({ block, onPatch }: Props & { block: ValuesBlock }) {
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ValuesBlock['rows']) => onPatch({ rows: next })
  const setValue = (i: number, k: number, v: number) => rows(block.rows.map((r, n) => (n === i ? { ...r, values: steps.map((s) => (s === k ? v : r.values[s] ?? 0)) } : r)))
  return (
    <>
      <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <div className="positions-head">
        <h4>Values</h4>
        <button onClick={() => rows([...block.rows, { name: `value ${block.rows.length + 1}`, values: steps.map(() => 0) }])}>add</button>
      </div>
      {block.rows.map((r, i) => (
        <div key={`${i}:${block.rows.length}`} className="look">
          <div className="color-head">
            <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && rows(block.rows.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <button title="delete" disabled={block.rows.length === 1} onClick={() => rows(block.rows.filter((_, n) => n !== i))}>×</button>
          </div>
          <div className="color-steps">
            {steps.map((k) => <label key={k}><span>{k}</span><NumberBox value={r.values[k] ?? 0} onCommit={(v) => setValue(i, k, v)} /></label>)}
          </div>
        </div>
      ))}
      <div className="help">Each row is a signal output; the column follows the `index` input (wrapping). Wire Season into index and feed rows like "min" and "max" into a Range's tame/wild min and max.</div>
    </>
  )
}

export function ColorsPanel({ block, onPatch, onOpenPalette }: Props & { block: ColorsBlock }) {
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ColorsBlock['rows']) => onPatch({ rows: next })
  const setColor = (i: number, k: number, color: string) => rows(block.rows.map((r, n) => (n === i ? { ...r, colors: steps.map((s) => (s === k ? color : r.colors[s] ?? '#000000')) } : r)))
  return (
    <>
      <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <div className="par"><label /><button onClick={() => onOpenPalette(block.id)} title="or double-click the node">palette view</button></div>
      <div className="positions-head">
        <h4>Colours</h4>
        <button onClick={() => rows([...block.rows, { name: `colour ${block.rows.length + 1}`, colors: steps.map(() => '#ffffff') }])}>add</button>
      </div>
      {block.rows.map((r, i) => (
        <div key={`${i}:${block.rows.length}`} className="look">
          <div className="color-head">
            <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && rows(block.rows.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <button title="delete" disabled={block.rows.length === 1} onClick={() => rows(block.rows.filter((_, n) => n !== i))}>×</button>
          </div>
          <div className="color-steps">
            {steps.map((k) => <label key={k}><span>{k}</span><input type="color" title={`index ${k}`} value={r.colors[k] ?? '#000000'} onChange={(e) => setColor(i, k, e.target.value)} /></label>)}
          </div>
        </div>
      ))}
      <div className="help">Each row is a colour output; the column follows the `index` input (wrapping), so wire the season count in and each row gives that season's colour. Feed them into scene Colour inputs, then into a fixture output's `color` or a Looks block's `color`.</div>
    </>
  )
}

export function LevelPanel({ block, onPatch }: Props & { block: LevelBlock }) {
  return (
    <>
      <NumField label="Gain" value={block.gain} onCommit={(v) => onPatch({ gain: v })} step={0.1} />
      <NumField label="Attack (s)" value={block.attack} onCommit={(v) => onPatch({ attack: v })} />
      <NumField label="Release (s)" value={block.release} onCommit={(v) => onPatch({ release: v })} />
    </>
  )
}

export function GatePanel({ block, onPatch }: Props & { block: GateBlock }) {
  return (
    <>
      <div className="par">
        <label>Threshold</label>
        <div className="slider">
          <input type="range" min={0} max={0.99} step={0.01} defaultValue={block.threshold} onPointerUp={(e) => onPatch({ threshold: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => onPatch({ threshold: Number((e.target as HTMLInputElement).value) })} />
          <NumberBox value={block.threshold} max={0.99} onCommit={(threshold) => onPatch({ threshold })} />
        </div>
      </div>
      <div className="par">
        <label>Rescale</label>
        <input type="checkbox" checked={block.rescale} onChange={(e) => onPatch({ rescale: e.target.checked })} />
      </div>
      <div className="help">Below the threshold the output is 0. Rescale on: the part above it is stretched back to 0–1, so lights fade up from nothing. Off: the signal passes through unchanged once it's over.</div>
    </>
  )
}

export function FadePanel({ block, onPatch }: Props & { block: FadeBlock }) {
  return (
    <>
      <NumField label="Rise (s)" value={block.rise} onCommit={(v) => onPatch({ rise: Math.max(0, v) })} />
      <NumField label="Fall (s)" value={block.fall} onCommit={(v) => onPatch({ fall: Math.max(0, v) })} />
      <div className="par">
        <label>Curve</label>
        <select value={block.curve} onChange={(e) => onPatch({ curve: e.target.value as FadeBlock['curve'] })}>
          <option value="linear">linear (straight ramp, exact time)</option>
          <option value="smooth">smooth (fast start, eases in)</option>
        </select>
      </div>
      <div className="help">The output follows the signal in straight ramps: a full 0→1 change takes the rise time, 1→0 the fall time (0 = instant). E.g. drop → Fade (rise 0, fall 4) holds a drop and lets it fade out; its Not fades the season back in over the same 4 s. Needs TD's timeline playing.</div>
    </>
  )
}

export function StepsPanel({ block, onPatch }: Props & { block: StepsBlock }) {
  return <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.round(v)) })} step={1} />
}

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

export function HoldPanel({ block, onPatch }: Props & { block: HoldBlock }) {
  return (
    <>
      <NumField label="Beats" value={block.beats} onCommit={(beats) => onPatch({ beats: Math.max(1, Math.round(beats)) })} step={1} />
      <div className="help">Wire a trigger (a drop, a downbeat) and a beat pulse. `hold` is 1 from the trigger until that many beats have passed.</div>
    </>
  )
}

export function RangePanel({ block, driven, onPatch }: Props & { block: RangeBlock }) {
  const set = (key: 'tame' | 'wild', i: 0 | 1, v: number) => {
    const next: [number, number] = [...block[key]] as [number, number]
    next[i] = Math.max(0, Math.min(1, v))
    onPatch({ [key]: next })
  }
  const edge = (label: string, port: string, key: 'tame' | 'wild', i: 0 | 1) => (
    <Wired label={label} wired={driven.has(port)}>
      <NumField label={label} value={block[key][i]} onCommit={(v) => set(key, i, v)} />
    </Wired>
  )
  return (
    <>
      {edge('Tame min', 'tameMin', 'tame', 0)}
      {edge('Tame max', 'tameMax', 'tame', 1)}
      {edge('Wild min', 'wildMin', 'wild', 0)}
      {edge('Wild max', 'wildMax', 'wild', 1)}
      <div className="help">Output = min + signal × (max − min), where min and max slide from the tame pair at amount 0 to the wild pair at amount 1. Feed amount from a Scenes level, a Hold after a drop, or several summed.</div>
    </>
  )
}

export function SequencePanel({ block, onPatch }: Props & { block: SequenceBlock }) {
  const parse = (text: string) => text.split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n))
  return (
    <>
      <Field label="Values" value={block.values.join(' ')} onCommit={(v) => onPatch({ values: parse(v) })} />
      <NumField label="Unit" value={block.unit} onCommit={(unit) => onPatch({ unit })} />
      <NumField label="Center" value={block.center} onCommit={(center) => onPatch({ center })} />
      <Every block={block} onPatch={onPatch} />
      <div className="help">Each trigger moves to the next value and wraps. Output is center + value × unit, so “1 -1 2” with unit 0.05 nudges right, left, right twice as far. `reset` jumps back to the first value.</div>
    </>
  )
}

export function LooksPanel({ block, driven, onPatch }: Props & { block: LooksBlock }) {
  const update = (scenes: Scene[]) => onPatch({ scenes })
  const set = (i: number, patch: Partial<Scene>) => update(block.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  return (
    <>
      <div className="par">
        <label>Advance</label>
        <select value={block.advance} onChange={(e) => onPatch({ advance: e.target.value as PatternAdvance })}>
          <option value="step">by look index</option>
          <option value="trigger">on each next</option>
        </select>
      </div>
      <Every block={block} onPatch={onPatch} />
      <div className="positions-head">
        <h4>Looks</h4>
        <button onClick={() => update([...block.scenes, { name: `Q${block.scenes.length + 1}`, color: '#ffffff', window: [0, 1] }])}>add</button>
      </div>
      {block.scenes.map((s, i) => (
        <div key={i} className="look">
          <div className="look-head">
            <span className="position-index">{i}</span>
            <input value={s.name} onChange={(e) => set(i, { name: e.target.value })} />
            <button title="delete" disabled={block.scenes.length === 1} onClick={() => update(block.scenes.filter((_, k) => k !== i))}>×</button>
          </div>
          <div className="look-body">
            <input type="color" value={s.color} disabled={driven.has('color')} title={driven.has('color') ? 'colour comes from the wired color input' : undefined} style={driven.has('color') ? { opacity: 0.3 } : undefined} onChange={(e) => set(i, { color: e.target.value })} />
            <label>dimmer</label>
            <input type="number" min={0} max={1} step={0.05} value={s.window[0]} title="dimmer min" onChange={(e) => set(i, { window: [Number(e.target.value), s.window[1]] })} />
            <span>–</span>
            <input type="number" min={0} max={1} step={0.05} value={s.window[1]} title="dimmer max" onChange={(e) => set(i, { window: [s.window[0], Number(e.target.value)] })} />
          </div>
        </div>
      ))}
      <div className="help">Each scene is a look: a colour and a dimmer window (min, max). The `look` output carries both on one wire into any fixture or group; `wild` (0–1) widens the window toward 0–1, so a Hold after a drop goes extreme.</div>
    </>
  )
}

export function PatternPanel({ block, driven, onPatch, onResetPattern }: Props & { block: PatternBlock }) {
  return (
    <>
      <NumField label="Slots" value={block.slots} onCommit={(v) => onPatch({ slots: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <PatternFields block={block} driven={driven} onPatch={onPatch} onResetPattern={onResetPattern} />
      <div className="help">Each slot outputs signal × mask. “By step index” sits on whatever step the index says (wire a beat). “On each trigger” moves one step every time the trigger rises (wire an onset).</div>
    </>
  )
}
