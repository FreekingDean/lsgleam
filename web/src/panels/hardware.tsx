import { Fragment, useEffect, useState } from 'react'
import { Field, LengthField, NumField } from './fields'
import { bltConfig, bltExpressions, download } from '../td/blt'
import type { BoxBlock, CdjBlock, AudioBlock, AudioSliceBlock, BltBlock, DmxInBlock, ArtnetBlock } from '../model/show'
import { chainOf, controllerPatch } from '../model/patch'
import { AUDIOSLICE_SOURCES, BLT_SIGNALS } from '../model/catalog'
import { type Props, Protocol, SignalPicker } from './shared'

export function AudioPanel({ block, onPatch, listAudioDevices }: Props & { block: AudioBlock }) {
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

export function DmxInPanel({ show, block, onPatch }: Props & { block: DmxInBlock }) {
  const patch = controllerPatch(show, block.id)
  const node = show.blocks.find((b) => b.id === patch?.node)
  return (
    <>
      <NumField label="Faders" value={block.channels} onCommit={(v) => onPatch({ channels: Math.max(1, Math.min(512, Math.round(v))) })} step={1} />
      <div className="help">{patch ? `Listening on ${node?.name ?? patch.node} U${patch.universe}.` : 'Not cabled.'} Cable its DMX out into an Art-Net node's input universe on the layout tab. Its faders (channels 1…N) appear on the show tab's Inputs node, ready to override scene select, drop mode and the like.</div>
    </>
  )
}

export function ArtnetPanel({ show, block, onPatch }: Props & { block: ArtnetBlock }) {
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

export function CdjPanel({ block, onPatch }: Props & { block: CdjBlock }) {
  return (
    <>
      <NumField label="Player" value={block.player} onCommit={(v) => onPatch({ player: Math.max(1, Math.round(v)) })} step={1} />
      <div className="help">A player on the floor. Cable its audio out to an audio input on the layout tab.</div>
    </>
  )
}

export function BoxPanel({ block, onPatch }: Props & { block: BoxBlock }) {
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

export function BltPanel({ block, onPatch }: Props & { block: BltBlock }) {
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

export function AudioSlicePanel({ block, onPatch, configureAudioSlice }: Props & { block: AudioSliceBlock }) {
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
