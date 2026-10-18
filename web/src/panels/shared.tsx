import { Fragment } from 'react'
import { NumberBox, NumField } from './fields'
import { type TubeDesign, PIXEL_PROTOCOLS, type Placement, type Block, type Show, type PatternAdvance, type PatternMode } from '../model/show'
import { PATTERN_LABELS, PATTERN_MODES } from '../model/catalog'

export type Layout = { placement: Placement; flip: boolean; onPlace: (p: Placement, flip?: boolean) => void }

export type Props = {
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
  onValue: (key: string, value: number, member?: string) => void
  listAudioDevices: () => Promise<[string, string][]>
  readValues: (names: string[], member?: string) => Promise<Record<string, number>>
  configureAudioSlice: () => Promise<string>
  onOpenPalette: (id: string) => void
}

export function Protocol({ value, onChange }: { value: 'artnet' | 'sacn'; onChange: (v: 'artnet' | 'sacn') => void }) {
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

export function Slider({ label, value, driven, onChange, options }: { label: string; value: number; driven: boolean; onChange: (v: number) => void; options?: string[] }) {
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

export function PixelProtocol({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="par">
      <label>Pixel protocol</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {PIXEL_PROTOCOLS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
      </select>
    </div>
  )
}

export function SignalPicker({ groups, selected, onChange }: { groups: { title: string; ids: string[]; labels?: string[] }[]; selected: string[]; onChange: (ids: string[]) => void }) {
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

export function Every({ block, onPatch }: { block: { advance?: PatternAdvance; every: number }; onPatch: Props['onPatch'] }) {
  if (block.advance === 'step') return null
  return <NumField label="Every N triggers" value={block.every} onCommit={(v) => onPatch({ every: Math.max(1, Math.round(v)) })} step={1} />
}

export function PatternFields({ block, driven, onPatch, onResetPattern }: { block: { mode: PatternMode; advance: PatternAdvance; every: number; floor: number }; driven: Set<string>; onPatch: Props['onPatch']; onResetPattern: () => void }) {
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

export function Wired({ label, wired, children }: { label: string; wired: boolean; children: React.ReactNode }) {
  if (!wired) return <>{children}</>
  return (
    <div className="par driven" title="set by a wired input">
      <label>{label}</label>
      <span>input</span>
    </div>
  )
}
