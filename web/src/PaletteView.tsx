import { useEffect, useState } from 'react'
import { FIXTURES, type FixtureProfile } from './fixtures'
import { NumberBox } from './fields'
import { hexToRgb, isRgb, profileOf, responseOf, rgbToHex, sentColor, type ColorResponse, type ColorsBlock, type Show } from './show'

type Props = { show: Show; block: ColorsBlock; onPatch: (patch: Partial<ColorsBlock>) => void; onResponse: (profile: string, response: ColorResponse) => void; onClose: () => void }

const CHANNELS = ['Red', 'Green', 'Blue']
const MAX_MULTIPLIER = 4

function onFixture(hex: string, response: ColorResponse) {
  const sent = sentColor(hexToRgb(hex), response)
  return { dmx: sent.map((v) => Math.round(v * 255)), sent: rgbToHex(sent) }
}

function Looks({ block, profile, response, used }: { block: ColorsBlock; profile: FixtureProfile; response: ColorResponse; used: boolean }) {
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  return (
    <div className="palette-fixture">
      <h4>Sent to {profile.label}{used ? '' : ' · not in this show'}</h4>
      {block.rows.map((r, i) => (
        <div key={i} className="palette-row">
          <span className="palette-name">{r.name}</span>
          {steps.map((k) => {
            const { dmx, sent } = onFixture(r.colors[k] ?? '#000000', response)
            return (
              <div key={k} className="palette-cell" title={`sends DMX R ${dmx[0]} · G ${dmx[1]} · B ${dmx[2]}`}>
                <div className="palette-swatch" style={{ background: sent }} />
                <span>{dmx.join(' ')}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function ResponseEditor({ profile, response, onChange, onCommit }: { profile: FixtureProfile; response: ColorResponse; onChange: (r: ColorResponse) => void; onCommit: (r: ColorResponse) => void }) {
  const withMultiplier = (c: number, v: number) => ({ multiplier: response.multiplier.map((m, n) => (n === c ? Math.max(0, Math.min(MAX_MULTIPLIER, v)) : m)) as ColorResponse['multiplier'] })
  return (
    <>
      <h4>{profile.label}</h4>
      {CHANNELS.map((name, c) => (
        <div key={name} className="par">
          <label>{name} ×</label>
          <div className="slider">
            <input type="range" min={0} max={MAX_MULTIPLIER} step={0.01} value={response.multiplier[c]} onChange={(e) => onChange(withMultiplier(c, Number(e.target.value)))} onPointerUp={() => onCommit(response)} onKeyUp={() => onCommit(response)} />
            <NumberBox value={response.multiplier[c]} max={MAX_MULTIPLIER} onCommit={(v) => onCommit(withMultiplier(c, v))} />
          </div>
        </div>
      ))}
    </>
  )
}

export function PaletteView({ show, block, onPatch, onResponse, onClose }: Props) {
  const [dragging, setDragging] = useState<{ profile: string; response: ColorResponse } | null>(null)
  const used = new Set(show.blocks.flatMap((b) => (b.kind === 'fixture' ? [profileOf(b).id] : [])))
  const profiles = FIXTURES.filter(isRgb).sort((a, b) => Number(used.has(b.id)) - Number(used.has(a.id)))
  const responseFor = (id: string) => (dragging?.profile === id ? dragging.response : responseOf(show, id))
  const steps = Array.from({ length: block.steps }, (_, k) => k)
  const rows = (next: ColorsBlock['rows']) => onPatch({ rows: next })
  const setColor = (i: number, k: number, color: string) => rows(block.rows.map((r, n) => (n === i ? { ...r, colors: steps.map((s) => (s === k ? color : r.colors[s] ?? '#000000')) } : r)))
  const addStep = () => onPatch({ steps: block.steps + 1, rows: block.rows.map((r) => ({ ...r, colors: [...steps.map((s) => r.colors[s] ?? '#000000'), r.colors[block.steps - 1] ?? '#ffffff'] })) })
  const removeStep = (k: number) => onPatch({ steps: block.steps - 1, rows: block.rows.map((r) => ({ ...r, colors: steps.filter((s) => s !== k).map((s) => r.colors[s] ?? '#000000') })) })
  const commitResponse = (id: string, r: ColorResponse) => {
    setDragging(null)
    if (JSON.stringify(r) !== JSON.stringify(responseOf(show, id))) onResponse(id, r)
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
                {steps.map((k) => <label key={k} className="palette-cell"><input type="color" className="palette-swatch" value={r.colors[k] ?? '#000000'} onChange={(e) => setColor(i, k, e.target.value)} /><span>{r.colors[k] ?? '#000000'}</span></label>)}
              </div>
            ))}
            <button onClick={() => rows([...block.rows, { name: `colour ${block.rows.length + 1}`, colors: steps.map(() => '#ffffff') }])}>+ row</button>
          </div>
          {profiles.map((p) => <Looks key={p.id} block={block} profile={p} response={responseFor(p.id)} used={used.has(p.id)} />)}
        </div>
        <aside className="designer-side pars">
          <h2>{block.name}</h2>
          <div className="help">Each channel sent to the fixture is the colour × its multiplier, capped at 255: e.g. blue 0.25 if your fixture's blue overpowers red and green.</div>
          {profiles.map((p) => <ResponseEditor key={p.id} profile={p} response={responseFor(p.id)} onChange={(response) => setDragging({ profile: p.id, response })} onCommit={(r) => commitResponse(p.id, r)} />)}
          <div className="help">Multipliers are saved per fixture type in the show. Each swatch's small numbers are the DMX red, green and blue it sends.</div>
          <div className="designer-actions">
            <button onClick={onClose}>close</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
