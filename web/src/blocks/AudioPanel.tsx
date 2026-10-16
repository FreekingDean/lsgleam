import { useEffect, useState } from 'react'
import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { AudioBlock } from './audio'

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

