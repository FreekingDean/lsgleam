import { Fragment, useEffect, useState } from 'react'
import { Field, LengthField, NumberBox, NumField } from './fields'
import { PlacementEditor } from './Placement'
import { bltConfig, bltExpressions, download } from './blt'
import { TubeDesigner } from './TubeDesigner'
import { STRIP_ALONG, type StripAlong, membersOf, type TubeDesign, type TubeSetBlock, STRIP_MODES, type StripBlock, type StripMode, PIXEL_PROTOCOLS, formatLength, outputUniverses, pixelChain, tubePatch, universesPerOutput, type BoardBlock, ceilingAt, onWall, chainOf, controllerPatch, fixturesOf, memberPort, type LightBlock, type BoxBlock, type CdjBlock, type Placement, AUDIOSLICE_SOURCES, BLT_SIGNALS, PATTERN_LABELS, PATTERN_MODES, POSITION_PORT, inputPorts, profileOf, scenesOf, type AudioBlock, type AudioSliceBlock, type Block, type BltBlock, type DmxInBlock, type DropBlock, type FixtureBlock, type HoldBlock, type RangeBlock, type GroupBlock, type GroupPosition, type LevelBlock, type Scene, type LooksBlock, type SequenceBlock, type ConstantBlock, type CounterBlock, type ArtnetBlock, type SceneBlock, type InputBlock, type InputType, INPUT_TYPES, type ColorsBlock, type ValuesBlock, type ManualBlock, type EqualsBlock, type Show, type PatternAdvance, type PatternBlock, type PatternMode, type Position, type StepsBlock, type GateBlock, type FadeBlock } from './show'

export type Layout = { placement: Placement; flip: boolean; onPlace: (p: Placement, flip?: boolean) => void }

type Props = {
  show: Show
  block: Block
  driven: Set<string>
  onOpenScene: (id: string) => void
  onMoveScene: (id: string, dir: -1 | 1) => void
  onPatchOther: (id: string, patch: Partial<Block>) => void
  onResetPattern: () => void
  onDesign: (design: TubeDesign) => void
  layout?: Layout
  onPatch: (patch: Partial<Block>) => void
  onValue: (index: number, value: number, member?: string) => void
  listAudioDevices: () => Promise<[string, string][]>
  readValues: (names: string[], member?: string) => Promise<Record<string, number>>
  configureAudioSlice: () => Promise<string>
}

function Protocol({ value, onChange }: { value: 'artnet' | 'sacn'; onChange: (v: 'artnet' | 'sacn') => void }) {
  return (
    <div className="par">
      <label>Protocol</label>
      <select value={value} onChange={(e) => onChange(e.target.value as 'artnet' | 'sacn')}>
        <option value="artnet">Art-Net</option>
        <option value="sacn">sACN</option>
      </select>
    </div>
  )
}

function Slider({ label, value, driven, onChange, options }: { label: string; value: number; driven: boolean; onChange: (v: number) => void; options?: string[] }) {
  if (options) {
    const last = options.length - 1
    const index = Math.round(value * last)
    return (
      <div className={`par${driven ? ' driven' : ''}`} title={driven ? 'driven by an input' : undefined}>
        <label>{label}</label>
        <select value={index} disabled={driven} onChange={(e) => onChange(Number(e.target.value) / last)}>
          {options.map((o, i) => <option key={o} value={i}>{o}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div className={`par${driven ? ' driven' : ''}`} title={driven ? 'driven by an input' : undefined}>
      <label>{label}</label>
      <div className="slider">
        <input type="range" min={0} max={1} step={0.001} value={value} disabled={driven} onChange={(e) => onChange(Number(e.target.value))} />
        {driven ? <span>input</span> : <NumberBox value={value} onCommit={onChange} />}
      </div>
    </div>
  )
}

function AudioPanel({ block, onPatch, listAudioDevices }: Props & { block: AudioBlock }) {
  const [devices, setDevices] = useState<[string, string][]>([])
  useEffect(() => {
    listAudioDevices().then(setDevices).catch(() => setDevices([]))
  }, [listAudioDevices])
  return (
    <>
      <div className="par">
        <label>Device</label>
        <select value={block.device} onChange={(e) => onPatch({ device: e.target.value })}>
          <option value="">default</option>
          {devices.map(([name, label]) => <option key={name} value={name}>{label}</option>)}
        </select>
      </div>
      <NumField label="Channels" value={block.channels} onCommit={(v) => onPatch({ channels: Math.max(1, Math.min(64, Math.round(v))) })} step={1} />
      <div className="par">
        <label>Stereo pairs</label>
        <input type="checkbox" checked={block.stereo} onChange={(e) => onPatch({ stereo: e.target.checked })} />
      </div>
      <div className="help">Mono input channels on the interface (a Scarlett 18i8 is 8). Stereo pairs makes one port per pair. Each port takes one cable from an audio source on the layout.</div>
    </>
  )
}

function DmxInPanel({ show, block, onPatch }: Props & { block: DmxInBlock }) {
  const patch = controllerPatch(show, block.id)
  const node = show.blocks.find((b) => b.id === patch?.node)
  return (
    <>
      <NumField label="Faders" value={block.channels} onCommit={(v) => onPatch({ channels: Math.max(1, Math.min(512, Math.round(v))) })} step={1} />
      <div className="help">{patch ? `Listening on ${node?.name ?? patch.node} U${patch.universe}.` : 'Not cabled.'} Cable its DMX out into an Art-Net node's input universe on the layout tab. Its faders (channels 1…N) appear on the show tab's Inputs node, ready to override scene select, drop mode and the like.</div>
    </>
  )
}

function ArtnetPanel({ show, block, onPatch }: Props & { block: ArtnetBlock }) {
  const rows = [...block.universes.map((u) => ({ u, out: true })), ...block.inputs.map((u) => ({ u, out: false }))].sort((x, y) => x.u - y.u)
  const set = (next: { u: number; out: boolean }[]) => onPatch({ universes: [...new Set(next.filter((r) => r.out).map((r) => r.u))], inputs: [...new Set(next.filter((r) => !r.out).map((r) => r.u))] })
  const free = () => { let u = 0; while (rows.some((r) => r.u === u)) u++; return u }
  const label = (key: string) => {
    const b = show.blocks.find((x) => x.id === key)
    return b?.kind === 'fixture' ? `${b.name} @${b.address}` : b?.name ?? key
  }
  return (
    <>
      <Protocol value={block.protocol} onChange={(protocol) => onPatch({ protocol })} />
      <Field label="IP" value={block.ip} onCommit={(v) => onPatch({ ip: v })} />
      <div className="par">
        <label>Active</label>
        <input type="checkbox" checked={block.active} onChange={(e) => onPatch({ active: e.target.checked })} />
      </div>
      <h3>Universes</h3>
      {rows.map((r, i) => (
        <div className="light-row" key={i}>
          <input type="number" min={0} defaultValue={r.u} onBlur={(e) => { const u = Math.max(0, Math.round(Number(e.target.value))); if (u !== r.u) set(rows.map((x, k) => (k === i ? { ...x, u } : x))) }} />
          <select value={r.out ? 'out' : 'in'} onChange={(e) => set(rows.map((x, k) => (k === i ? { ...x, out: e.target.value === 'out' } : x)))}>
            <option value="out">out</option>
            <option value="in">in</option>
          </select>
          <button title="remove universe" onClick={() => set(rows.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
      <div className="par">
        <label />
        <button onClick={() => set([...rows, { u: free(), out: true }])}>add universe</button>
      </div>
      {block.universes.map((u) => (
        <Fragment key={u}>
          <h4>U{u} chain</h4>
          {chainOf(show, block.id, u).map((k) => <div className="help" key={k}>{label(k)}</div>)}
          {chainOf(show, block.id, u).length === 0 && <div className="help">nothing cabled</div>}
        </Fragment>
      ))}
      <div className="help">On the layout tab, cable an out universe to a fixture's DMX in, then that fixture's DMX out to the next. Repatch numbers addresses along each chain. Cable a DMX controller into an in universe to read its faders.</div>
    </>
  )
}

function PixelProtocol({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="par">
      <label>Pixel protocol</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {PIXEL_PROTOCOLS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
      </select>
    </div>
  )
}

function TubeSetPanel({ show, block, onPatch, onDesign }: Props & { block: TubeSetBlock }) {
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

function BoardPanel({ show, block, onPatch }: Props & { block: BoardBlock }) {
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

function StripPanel({ show, block, driven, onPatch }: Props & { block: StripBlock }) {
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

function CdjPanel({ block, onPatch }: Props & { block: CdjBlock }) {
  return (
    <>
      <NumField label="Player" value={block.player} onCommit={(v) => onPatch({ player: Math.max(1, Math.round(v)) })} step={1} />
      <div className="help">A player on the floor. Cable its audio out to an audio input on the layout tab.</div>
    </>
  )
}

function BoxPanel({ block, onPatch }: Props & { block: BoxBlock }) {
  const set = (i: number, v: number) => { const size = [...block.size] as [number, number, number]; size[i] = Math.max(0.1, v); onPatch({ size }) }
  return (
    <>
      <LengthField label="Width (m)" value={block.size[0]} onCommit={(v) => set(0, v)} />
      <LengthField label="Depth (m)" value={block.size[1]} onCommit={(v) => set(1, v)} />
      <LengthField label="Height (m)" value={block.size[2]} onCommit={(v) => set(2, v)} />
      <div className="par">
        <label>Locked</label>
        <input type="checkbox" checked={block.locked} onChange={(e) => onPatch({ locked: e.target.checked })} />
      </div>
      <div className="help">A room, stage or bar. Lock it once placed so dragging on it pans the view.</div>
    </>
  )
}

function PlacementFields({ show, layout, block }: Props & { layout: Layout }) {
  const { placement, onPlace } = layout
  const ceiling = ceilingAt(show, placement.position[0], placement.position[2])
  return (
    <>
      <PlacementEditor placement={placement} onPlace={(p) => onPlace(p)} floor={block.kind === 'box'} />
      {block.kind !== 'box' && ceiling !== null && (
        <div className="par">
          <label />
          <button onClick={() => onPlace({ ...placement, position: [placement.position[0], ceiling, placement.position[2]] })} title="set height to the ceiling of the room it's in">to ceiling ({ceiling.toFixed(2)} m)</button>
          <button onClick={() => { const p = onWall(show, placement); if (p) onPlace(p) }} title="move onto the nearest wall of its room, facing in">to wall</button>
        </div>
      )}
      {block.kind !== 'box' && (
        <div className="par">
          <label>Flip ports</label>
          <input type="checkbox" checked={layout.flip} onChange={(e) => onPlace(placement, e.target.checked)} />
        </div>
      )}
      <div className="help">Lengths in metres; type 100ft or 30' for feet. Turn is around the vertical, flip V hangs a light upside down. The simulator edits the same placement.</div>
      <hr />
    </>
  )
}

function ScenePanel({ show, block, onPatch, onOpenScene, onMoveScene }: Props & { block: SceneBlock }) {
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

function InputPanel({ block, onPatch }: Props & { block: InputBlock }) {
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

function ManualPanel({ show, block, driven, onPatch }: Props & { block: ManualBlock }) {
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

function ConstantPanel({ block, onPatch }: Props & { block: ConstantBlock }) {
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

function CounterPanel({ block, onPatch }: Props & { block: CounterBlock }) {
  return (
    <>
      <NumField label="Max" value={block.max} onCommit={(max) => onPatch({ max: Math.max(0, Math.round(max)) })} step={1} />
      <div className="help">Each rising edge on count adds one, clamped at max; reset (while high) zeroes it. Wire the output into Scene select's index to step through scenes.</div>
    </>
  )
}

function EqualsPanel({ block, onPatch }: Props & { block: EqualsBlock }) {
  return (
    <>
      <NumField label="Value" value={block.value} onCommit={(value) => onPatch({ value: Math.round(value) })} step={1} />
      <div className="help">1 while the index equals the value. Wire BLT's song index in and a scene's `on` out.</div>
    </>
  )
}

function SignalPicker({ groups, selected, onChange }: { groups: { title: string; ids: string[]; labels?: string[] }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const all = groups.flatMap((g) => g.ids)
  const toggle = (id: string, on: boolean) => {
    const set = new Set(selected)
    if (on) set.add(id)
    else set.delete(id)
    onChange(all.filter((x) => set.has(x)))
  }
  return (
    <div className="signals">
      {groups.map((g) => (
        <Fragment key={g.title}>
          <h4>{g.title}</h4>
          {g.ids.map((id, i) => (
            <label key={id} title={id}>
              <input type="checkbox" checked={selected.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />
              {g.labels?.[i] ?? id}
            </label>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

function BltPanel({ block, onPatch }: Props & { block: BltBlock }) {
  return (
    <>
      <NumField label="OSC port" value={block.port} onCommit={(v) => onPatch({ port: Math.round(v) })} step={1} />
      <NumField label="Decks" value={block.decks} onCommit={(v) => onPatch({ decks: Math.max(1, Math.min(4, Math.round(v))) })} step={1} />
      <div className="par">
        <label>Master</label>
        <input type="checkbox" checked={block.master} onChange={(e) => onPatch({ master: e.target.checked })} />
      </div>
      <SignalPicker groups={[{ title: 'signals per deck', ids: BLT_SIGNALS.map((s) => s.id) }]} selected={block.signals} onChange={(signals) => onPatch({ signals })} />
      <div className="par">
        <label>Songs</label>
        <textarea rows={4} placeholder="one title per line" defaultValue={block.songs.join('\n')} onBlur={(e) => onPatch({ songs: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
      </div>
      <div className="par">
        <label />
        <button onClick={() => download(`lsgleam-${block.id}.blt`, bltConfig(block))}>download BLT config</button>
      </div>
      <div className="help">
        Load that file in Beat Link Trigger (Triggers window → File → Load), or start it with <code>-c lsgleam-{block.id}.blt</code>. It holds one Custom trigger per deck (and one watching the Master Player, sending /blt/master/…) plus the OSC client setup. Re-download after changing the port, decks or songs. To do it by hand instead, the expressions are:
        <pre>{Object.entries(bltExpressions(block)).map(([k, v]) => `${k}:\n${v}`).join('\n\n')}</pre>
      </div>
    </>
  )
}

function AudioSlicePanel({ block, onPatch, configureAudioSlice }: Props & { block: AudioSliceBlock }) {
  const [status, setStatus] = useState('')
  const groups = AUDIOSLICE_SOURCES.map((s) => ({ title: s.stem, ids: s.streams.map((st) => `${s.stem}/${st}`), labels: s.streams }))
  const push = () => {
    setStatus('…')
    configureAudioSlice().then(setStatus, (e: Error) => setStatus(e.message))
  }
  return (
    <>
      <NumField label="OSC port" value={block.port} onCommit={(v) => onPatch({ port: Math.round(v) })} step={1} />
      <SignalPicker groups={groups} selected={block.signals} onChange={(signals) => onPatch({ signals })} />
      <h3>AudioSlice API</h3>
      <NumField label="API port" value={block.apiPort} onCommit={(v) => onPatch({ apiPort: Math.round(v) })} step={1} />
      <Field label="Token" value={block.token} onCommit={(token) => onPatch({ token })} />
      <NumField label="Smoothing ms" value={block.smoothing} onCommit={(v) => onPatch({ smoothing: Math.max(0, v) })} step={1} />
      <div className="par">
        <label />
        <button onClick={push}>push to AudioSlice</button>
      </div>
      <div className="help">Creates an output group named “lsgleam {block.id}” sending to 127.0.0.1:{block.port} with one modulator per ticked signal. Onsets and the beat stems get AudioSlice’s envelope (no attack, 1/8-note release for hits, 1/4 for beats, retrigger on) so each hit is a decaying 0–1 shape rather than a one-off message TD would hold forever. Needs the HTTP API on in AudioSlice’s Advanced settings.{status && <pre>{status}</pre>}</div>
    </>
  )
}

function ValuesPanel({ block, onPatch }: Props & { block: ValuesBlock }) {
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

function ColorsPanel({ block, onPatch }: Props & { block: ColorsBlock }) {
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ColorsBlock['rows']) => onPatch({ rows: next })
  const setColor = (i: number, k: number, color: string) => rows(block.rows.map((r, n) => (n === i ? { ...r, colors: steps.map((s) => (s === k ? color : r.colors[s] ?? '#000000')) } : r)))
  return (
    <>
      <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
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

function LevelPanel({ block, onPatch }: Props & { block: LevelBlock }) {
  return (
    <>
      <NumField label="Gain" value={block.gain} onCommit={(v) => onPatch({ gain: v })} step={0.1} />
      <NumField label="Attack (s)" value={block.attack} onCommit={(v) => onPatch({ attack: v })} />
      <NumField label="Release (s)" value={block.release} onCommit={(v) => onPatch({ release: v })} />
    </>
  )
}

function GatePanel({ block, onPatch }: Props & { block: GateBlock }) {
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

function FadePanel({ block, onPatch }: Props & { block: FadeBlock }) {
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

function StepsPanel({ block, onPatch }: Props & { block: StepsBlock }) {
  return <NumField label="Steps" value={block.steps} onCommit={(v) => onPatch({ steps: Math.max(1, Math.round(v)) })} step={1} />
}

type Named = { name: string }

function PositionRows<T extends Named>({ positions, locked, summary, onStore, onSet, onGo, onChange }: {
  positions: T[]; locked: boolean; summary: (p: T) => string
  onStore: () => Promise<T>; onSet: (p: T) => Promise<T>; onGo: (p: T) => void; onChange: (positions: T[]) => void
}) {
  const [error, setError] = useState('')
  const attempt = (work: () => Promise<void>) => work().catch((e: Error) => setError(e.message))
  const store = () => attempt(async () => onChange([...positions, await onStore()]))
  const overwrite = (i: number) => attempt(async () => {
    const next = await onSet(positions[i])
    onChange(positions.map((q, k) => (k === i ? next : q)))
  })
  return (
    <>
      <hr />
      <div className="positions-head">
        <h4>Positions</h4>
        <button onClick={store}>store current</button>
      </div>
      {error && <div className="error">{error}</div>}
      {positions.map((p, i) => (
        <div key={i} className={`position${locked ? ' driven' : ''}`}>
          <span className="position-index">{i}</span>
          <input value={p.name} onChange={(e) => onChange(positions.map((q, k) => (k === i ? { ...q, name: e.target.value } : q)))} />
          <span className="position-values">{summary(p)}</span>
          <button disabled={locked} title="move here" onClick={() => onGo(p)}>go</button>
          <button title="overwrite with current" onClick={() => overwrite(i)}>set</button>
          <button title="delete" onClick={() => onChange(positions.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
    </>
  )
}

function Positions({ block, driven, onPatch, onValue, readValues }: Props & { block: LightBlock }) {
  const profile = profileOf(block)
  const names = profile.position ?? []
  const index = (n: string) => profile.channels.findIndex((ch) => ch.name === n)
  return (
    <PositionRows<Position>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => names.map((n) => (p.values[n] ?? 0).toFixed(2)).join(' / ')}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, values: await readValues(names) })}
      onSet={async (p) => ({ ...p, values: await readValues(names) })}
      onGo={(p) => names.forEach((n) => p.values[n] !== undefined && onValue(index(n), p.values[n]))}
      onChange={(positions) => onPatch({ positions })}
    />
  )
}

function GroupPositions({ block, driven, onPatch, onValue, readValues }: Props & { block: GroupBlock }) {
  const profile = profileOf(block)
  const names = profile.position ?? []
  const index = (n: string) => profile.channels.findIndex((ch) => ch.name === n)
  const members = Array.from({ length: block.size }, (_, i) => String(i))
  const readAll = async () => Object.fromEntries(await Promise.all(members.map(async (id) => [id, await readValues(names, id)])))
  return (
    <PositionRows<GroupPosition>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => `${Object.keys(p.members).length} members`}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, members: await readAll() })}
      onSet={async (p) => ({ ...p, members: await readAll() })}
      onGo={(p) => Object.entries(p.members).forEach(([id, m]) => names.forEach((n) => m[n] !== undefined && onValue(index(n), m[n], id)))}
      onChange={(positions) => onPatch({ positions })}
    />
  )
}

function Every({ block, onPatch }: { block: { advance?: PatternAdvance; every: number }; onPatch: Props['onPatch'] }) {
  if (block.advance === 'step') return null
  return <NumField label="Every N triggers" value={block.every} onCommit={(v) => onPatch({ every: Math.max(1, Math.round(v)) })} step={1} />
}

function PatternFields({ block, driven, onPatch, onResetPattern }: { block: { mode: PatternMode; advance: PatternAdvance; every: number; floor: number }; driven: Set<string>; onPatch: Props['onPatch']; onResetPattern: () => void }) {
  return (
    <>
      <div className="par">
        <label>Mode</label>
        <select value={block.mode} onChange={(e) => onPatch({ mode: e.target.value as PatternMode })}>
          {PATTERN_MODES.map((m) => <option key={m} value={m}>{PATTERN_LABELS[m]}</option>)}
        </select>
      </div>
      <div className="par">
        <label>Advance</label>
        <select value={block.advance} onChange={(e) => onPatch({ advance: e.target.value as PatternAdvance })}>
          <option value="step">by step index</option>
          <option value="trigger">on each trigger</option>
        </select>
      </div>
      <Every block={block} onPatch={onPatch} />
      <Wired label="Minimum" wired={driven.has('floor')}>
        <div className="par" title="no light goes below this level, even when its step is off or the dimmer is low">
          <label>Minimum</label>
          <div className="slider">
            <input type="range" min={0} max={1} step={0.01} defaultValue={block.floor} onPointerUp={(e) => onPatch({ floor: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => onPatch({ floor: Number((e.target as HTMLInputElement).value) })} />
            <NumberBox value={block.floor} onCommit={(floor) => onPatch({ floor })} />
          </div>
        </div>
      </Wired>
      {block.advance === 'trigger' && <div className="par"><label /><button onClick={onResetPattern} title="jump back to step 1 now, to line patterns up">reset pattern</button></div>}
    </>
  )
}

function DropPanel({ block, onPatch }: Props & { block: DropBlock }) {
  return (
    <>
      <NumField label="Kick threshold" value={block.threshold} onCommit={(threshold) => onPatch({ threshold })} />
      <NumField label="Quiet beats" value={block.beats} onCommit={(beats) => onPatch({ beats: Math.max(1, Math.round(beats)) })} step={1} />
      <NumField label="Cooldown (s)" value={block.cooldown} onCommit={(cooldown) => onPatch({ cooldown })} step={1} />
      <div className="help">Wire kick energy into kick and a beat pulse (AudioSlice beat/energy or a BLT beat) into beat. Beats are counted since the last kick; once that many pass the detector arms, and the first kick back is the drop: `armed` is 1 while waiting for it, `drop` pulses for a quarter second, `drops` counts them, at most once per cooldown.</div>
    </>
  )
}

function HoldPanel({ block, onPatch }: Props & { block: HoldBlock }) {
  return (
    <>
      <NumField label="Beats" value={block.beats} onCommit={(beats) => onPatch({ beats: Math.max(1, Math.round(beats)) })} step={1} />
      <div className="help">Wire a trigger (a drop, a downbeat) and a beat pulse. `hold` is 1 from the trigger until that many beats have passed.</div>
    </>
  )
}

function Wired({ label, wired, children }: { label: string; wired: boolean; children: React.ReactNode }) {
  if (!wired) return <>{children}</>
  return (
    <div className="par driven" title="set by a wired input">
      <label>{label}</label>
      <span>input</span>
    </div>
  )
}

function RangePanel({ block, driven, onPatch }: Props & { block: RangeBlock }) {
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

function SequencePanel({ block, onPatch }: Props & { block: SequenceBlock }) {
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

function LooksPanel({ block, driven, onPatch }: Props & { block: LooksBlock }) {
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

function PatternPanel({ block, driven, onPatch, onResetPattern }: Props & { block: PatternBlock }) {
  return (
    <>
      <NumField label="Slots" value={block.slots} onCommit={(v) => onPatch({ slots: Math.max(1, Math.min(32, Math.round(v))) })} step={1} />
      <PatternFields block={block} driven={driven} onPatch={onPatch} onResetPattern={onResetPattern} />
      <div className="help">Each slot outputs signal × mask. “By step index” sits on whatever step the index says (wire a beat). “On each trigger” moves one step every time the trigger rises (wire an onset).</div>
    </>
  )
}

function GroupPanel(props: Props & { block: GroupBlock }) {
  const { show, block, driven, onPatch, onValue } = props
  const profile = profileOf(block)
  const aimed = profile.position ?? []
  const members = Array.from({ length: block.size }, (_, i) => String(i))
  const names = (k: string) => fixturesOf(show, memberPort(block.id, Number(k))).map((id) => show.blocks.find((b) => b.id === id)?.name ?? id).join(', ') || 'unwired'
  return (
    <>
      <NumField label="Members" value={block.size} onCommit={(v) => onPatch({ size: Math.max(1, Math.min(64, Math.round(v))) })} step={1} />
      <PatternFields block={block} driven={driven} onPatch={onPatch} onResetPattern={props.onResetPattern} />
      <div className="help">Each member is its own port on the scene node (show tab); wire each to one or more fixtures on the Outputs node. The pattern spreads brightness over them by mode: it takes the pattern input if wired, else the Dimmer input, else the Dimmer slider. Other channel inputs and sliders apply to every member.</div>
      <hr />
      {profile.channels.map((ch, i) => aimed.includes(ch.name) ? null : (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={driven.has(ch.name)} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
      {aimed.length > 0 && members.map((id, k) => (
        <div className="member" key={id}>
          <h4>{k + 1} → {names(id)}</h4>
          {aimed.map((n) => {
            const i = profile.channels.findIndex((ch) => ch.name === n)
            return <Slider key={n} label={profile.channels[i].label} value={block.aims[id]?.[n] ?? profile.channels[i].default} driven={driven.has(n)} onChange={(v) => onValue(i, v, id)} />
          })}
        </div>
      ))}
      {profile.position && <GroupPositions {...props} />}
    </>
  )
}

function HiddenPorts({ show, block, onPatch }: Props) {
  const hidden = new Set(block.hidden ?? [])
  const all = inputPorts({ ...block, hidden: [] }, show)
  if (all.length < 2) return null
  const toggle = (id: string, on: boolean) => {
    const next = new Set(hidden)
    if (on) next.delete(id)
    else next.add(id)
    onPatch({ hidden: [...next] })
  }
  return (
    <>
      <h3>Ports</h3>
      <div className="signals">
        {all.map((p) => (
          <label key={p.id} title={p.hint ?? p.id}>
            <input type="checkbox" checked={!hidden.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
            {p.label}
          </label>
        ))}
      </div>
      <div className="help">Untick inputs you don't use to keep the node short. Hiding a wired port removes its wires. On a light, wiring `look` hides colour and dimmer (and vice versa), and wiring `position` hides Pan/Tilt.</div>
    </>
  )
}

function FixturePanel({ block, onPatch, onValue }: Props & { block: FixtureBlock }) {
  const profile = profileOf(block)
  return (
    <>
      <NumField label="Address" value={block.address} onCommit={(v) => onPatch({ address: v })} step={1} />
      <hr />
      <div className="help">Values when no scene is driving it (the weight scenes leave over).</div>
      {profile.channels.map((ch, i) => (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={false} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
    </>
  )
}

function LightPanel(props: Props & { block: LightBlock }) {
  const { show, block, driven, onValue } = props
  const profile = profileOf(block)
  const targets = fixturesOf(show, block.id).map((id) => show.blocks.find((b) => b.id === id)?.name ?? id)
  return (
    <>
      <div className="help">Drives {targets.length ? targets.join(', ') : 'nothing yet: wire it to fixtures on the show tab'}. Unwired channels send these values.</div>
      {profile.channels.map((ch, i) => (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={driven.has(ch.name)} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
      {profile.position && <Positions {...props} />}
    </>
  )
}

function body(props: Props) {
  const { block } = props
  switch (block.kind) {
    case 'audio': return <AudioPanel {...props} block={block} />
    case 'dmxin': return <DmxInPanel {...props} block={block} />
    case 'blt': return <BltPanel {...props} block={block} />
    case 'audioslice': return <AudioSlicePanel {...props} block={block} />
    case 'level': return <LevelPanel {...props} block={block} />
    case 'steps': return <StepsPanel {...props} block={block} />
    case 'gate': return <GatePanel {...props} block={block} />
    case 'fade': return <FadePanel {...props} block={block} />
    case 'pattern': return <PatternPanel {...props} block={block} />
    case 'drop': return <DropPanel {...props} block={block} />
    case 'hold': return <HoldPanel {...props} block={block} />
    case 'range': return <RangePanel {...props} block={block} />
    case 'sequence': return <SequencePanel {...props} block={block} />
    case 'looks': return <LooksPanel {...props} block={block} />
    case 'fixture': return <FixturePanel {...props} block={block} />
    case 'light': return <LightPanel {...props} block={block} />
    case 'group': return <GroupPanel {...props} block={block} />
    case 'artnet': return <ArtnetPanel {...props} block={block} />
    case 'cdj': return <CdjPanel {...props} block={block} />
    case 'box': return <BoxPanel {...props} block={block} />
    case 'tubeset': return <TubeSetPanel {...props} block={block} />
    case 'strip': return <StripPanel {...props} block={block} />
    case 'board': return <BoardPanel {...props} block={block} />
    case 'scene': return <ScenePanel {...props} block={block} />
    case 'input': return <InputPanel {...props} block={block} />
    case 'output': return (
      <>
        <div className="par">
          <label>Type</label>
          <select value={block.type} onChange={(e) => props.onPatch({ type: e.target.value as InputType })}>
            {INPUT_TYPES.filter((t) => t !== 'audio').map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="help">Shows up as an output port on this composite's node. Whatever you wire in here comes out of that port. The name is the port label.</div>
      </>
    )
    case 'composite': return (
      <>
        <div className="par"><label /><button onClick={() => props.onOpenScene(block.id)}>open</button></div>
        <div className="help">Your own block. Double-click it (or open) to edit inside: Input blocks become its input ports, Output blocks its output ports, and transformers in between do the work. Composites can hold other composites. In TD it is a COMP of the same name.</div>
      </>
    )
    case 'manual': return <ManualPanel {...props} block={block} />
    case 'equals': return <EqualsPanel {...props} block={block} />
    case 'constant': return <ConstantPanel {...props} block={block} />
    case 'counter': return <CounterPanel {...props} block={block} />
    case 'colors': return <ColorsPanel {...props} block={block} />
    case 'values': return <ValuesPanel {...props} block={block} />
    case 'latch': return <div className="help">1 from a rising edge on set until reset goes high. Song match sets it, the drop resets it: that's "primed".</div>
    case 'mix': return (
      <>
        <div className="par">
          <label>Type</label>
          <select value={block.type} onChange={(e) => props.onPatch({ type: e.target.value as 'signal' | 'color' })}>
            <option value="signal">signal</option>
            <option value="color">colour</option>
          </select>
        </div>
        <div className="help">out = a × (1 − mix) + b × mix. Crossfade one value instead of a whole scene: a = the season value, b = the drop value, mix = a Fade of the drop (rise 0, fall 15) brought in as a scene input.</div>
      </>
    )
    case 'not': return <div className="help">1 − the signal, clamped 0–1. For precedence: season `on` = Not(battle) × Not(drop) (two Nots into an And), drop `on` = drop × Not(battle), battle `on` = battle.</div>
    case 'and': return <div className="help">Multiplies the two signals, so it's 1 only while both are on. Drop × primed is "an accepted drop".</div>
  }
}

export function BlockPanel(props: Props) {
  const { block, onPatch, show } = props
  const { values: _values, positions: _positions, aims: _aims, rows: _rows, ...identity } = block as Record<string, unknown>
  const key = JSON.stringify({ ...identity, flip: props.layout?.flip, placement: props.layout?.placement, targets: fixturesOf(show, block.id, true), scenes: scenesOf(show).map((s) => s.id), cables: show.cables.filter((c) => c.from === block.id) })
  return (
    <aside className="panel">
      <h2>{block.name}</h2>
      <div className="path">/project1/{block.id}</div>
      <div className="pars" key={key}>
        {props.layout && <PlacementFields {...props} layout={props.layout} />}
        <Field label="Name" value={block.name} onCommit={(v) => onPatch({ name: v })} />
        {body(props)}
        <HiddenPorts {...props} />
      </div>
    </aside>
  )
}
