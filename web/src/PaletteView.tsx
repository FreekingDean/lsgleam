import { useEffect, useState } from 'react'
import { allProfiles } from './fixtures'
import { NumberBox } from './fields'
import { hexToRgb, isRgb, previewLight, profileOf, responseOf, rgbToHex, toSrgb, type ColorResponse, type ColorsBlock, type Show } from './show'

type Props = { show: Show; block: ColorsBlock; onPatch: (patch: Partial<ColorsBlock>) => void; onResponse: (profile: string, response: ColorResponse) => void; onClose: () => void }

const CHANNELS = ['Red', 'Green', 'Blue']
const MAX_BRIGHTNESS = 4
const MIN_GAMMA = 0.5
const MAX_GAMMA = 3

function Slider({ label, value, min, max, step, onChange, onCommit }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; onCommit: (v?: number) => void }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="par">
      <label>{label}</label>
      <div className="slider">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={() => onCommit()} onKeyUp={() => onCommit()} />
        <NumberBox value={value} max={max} onCommit={(v) => onCommit(clamp(v))} />
      </div>
    </div>
  )
}

function Discs({ light, className }: { light: number[]; className: string }) {
  return (
    <div className={`discs ${className}`} title={rgbToHex(light.map(toSrgb))}>
      {light.map((l, c) => {
        const disc = `rgb(${[0, 1, 2].map((n) => (n === c ? Math.round(toSrgb(l) * 255) : 0)).join(' ')})`
        return <span key={c} style={{ background: `radial-gradient(circle closest-side, ${disc} 85%, transparent)` }} />
      })}
    </div>
  )
}

const dmxOf = (color: string) => hexToRgb(color).map((v) => Math.round(v * 255)).join(' ')
const percent = (level: number) => `${Math.round(Math.min(level, 1) * 100)}%`

function ResponseEditor({ response, onChange, onCommit }: { response: ColorResponse; onChange: (r: ColorResponse) => void; onCommit: (r: ColorResponse) => void }) {
  const withBrightness = (c: number, v: number) => ({ ...response, multiplier: response.multiplier.map((m, n) => (n === c ? v : m)) as ColorResponse['multiplier'] })
  return (
    <>
      <h4>LED brightness</h4>
      {CHANNELS.map((name, c) => <Slider key={name} label={name} value={response.multiplier[c]} min={0} max={MAX_BRIGHTNESS} step={0.01} onChange={(v) => onChange(withBrightness(c, v))} onCommit={(v) => onCommit(v === undefined ? response : withBrightness(c, v))} />)}
      <Slider label="Gamma" value={response.gamma} min={MIN_GAMMA} max={MAX_GAMMA} step={0.05} onChange={(gamma) => onChange({ ...response, gamma })} onCommit={(gamma) => onCommit(gamma === undefined ? response : { ...response, gamma })} />
    </>
  )
}

export function PaletteView({ show, block, onPatch, onResponse, onClose }: Props) {
  const used = new Set(show.blocks.flatMap((b) => (b.kind === 'fixture' ? [profileOf(b).id] : [])))
  const profiles = allProfiles().filter(isRgb).sort((a, b) => Number(used.has(b.id)) - Number(used.has(a.id)))
  const [profileId, setProfileId] = useState(profiles[0].id)
  const [dragging, setDragging] = useState<ColorResponse | null>(null)
  const [selected, setSelected] = useState({ row: 0, step: 0 })
  const response = dragging ?? responseOf(show, profileId)
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ColorsBlock['rows']) => onPatch({ rows: next })
  const setColor = (i: number, k: number, color: string) => rows(block.rows.map((r, n) => (n === i ? { ...r, colors: steps.map((s) => (s === k ? color : r.colors[s] ?? '#000000')) } : r)))
  const addStep = () => onPatch({ steps: block.steps + 1, rows: block.rows.map((r) => ({ ...r, colors: [...steps.map((s) => r.colors[s] ?? '#000000'), r.colors[block.steps - 1] ?? '#ffffff'] })) })
  const removeStep = (k: number) => onPatch({ steps: block.steps - 1, rows: block.rows.map((r) => ({ ...r, colors: steps.filter((s) => s !== k).map((s) => r.colors[s] ?? '#000000') })) })
  const row = Math.min(selected.row, block.rows.length - 1)
  const step = Math.min(selected.step, block.steps - 1)
  const selectedColor = block.rows[row].colors[step] ?? '#000000'
  const calibration = previewLight(hexToRgb(selectedColor), response)
  const commitResponse = (r: ColorResponse) => {
    setDragging(null)
    if (JSON.stringify(r) !== JSON.stringify(responseOf(show, profileId))) onResponse(profileId, r)
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="modal palette-view">
      <div className="designer">
        <div className="palette-main">
          <div className="palette-fixture">
            <h4>Colours</h4>
            <div className="palette-row">
              <span className="palette-name" />
              {steps.map((k) => <div key={k} className="palette-cell"><span>index {k}</span><button title="delete step" disabled={block.steps === 1} onClick={() => removeStep(k)}>×</button></div>)}
              <button title="add step" disabled={block.steps >= 32} onClick={addStep}>+ step</button>
            </div>
            {block.rows.map((r, i) => (
              <div key={`${i}:${block.rows.length}`} className="palette-row">
                <div className="palette-name">
                  <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && rows(block.rows.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
                  <button title="delete row" disabled={block.rows.length === 1} onClick={() => rows(block.rows.filter((_, n) => n !== i))}>×</button>
                </div>
                {steps.map((k) => {
                  const color = r.colors[k] ?? '#000000'
                  const { light, level } = previewLight(hexToRgb(color), response)
                  return (
                    <label key={k} className={`palette-cell${i === row && k === step ? ' selected' : ''}`} onClick={() => setSelected({ row: i, step: k })}>
                      <input type="color" className="palette-swatch" value={color} onChange={(e) => setColor(i, k, e.target.value)} />
                      <Discs light={light} className="palette-light" />
                      <span>{dmxOf(color)}</span>
                      <span>light {percent(level)}</span>
                    </label>
                  )
                })}
              </div>
            ))}
            <button onClick={() => rows([...block.rows, { name: `colour ${block.rows.length + 1}`, colors: steps.map(() => '#ffffff') }])}>+ row</button>
          </div>
        </div>
        <aside className="designer-side pars">
          <h2>{block.name}</h2>
          <div className="par">
            <label>Preview on</label>
            <select value={profileId} onChange={(e) => { setDragging(null); setProfileId(e.target.value) }}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}{used.has(p.id) ? '' : ' · not in this show'}</option>)}
            </select>
          </div>
          <Discs light={calibration.light} className="palette-calibrate" />
          <div className="help">{block.rows[row].name} · index {step} on {profiles.find((p) => p.id === profileId)?.label}: DMX {dmxOf(selectedColor)}, light {percent(calibration.level)}</div>
          <div className="help">Put this colour on the real fixture and adjust LED brightness until the centre matches what you see. Raise gamma if low values look dimmer than expected. Only changes this preview, not the show.</div>
          <ResponseEditor response={response} onChange={setDragging} onCommit={commitResponse} />
          <div className="help">Saved per fixture type in the show. Click a swatch to calibrate with it. Under each swatch is its light on that fixture, the DMX red, green and blue TD sends and its overall light level.</div>
          <div className="designer-actions">
            <button onClick={onClose}>close</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
