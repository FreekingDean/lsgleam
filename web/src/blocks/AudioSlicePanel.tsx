import { useState } from 'react'
import { Field, NumField } from '../panels/fields'
import { type Props, SignalPicker } from '../panels/shared'
import { AUDIOSLICE_SOURCES, type AudioSliceBlock } from './audioslice'

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
