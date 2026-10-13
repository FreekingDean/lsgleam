import { useEffect, useState } from 'react'
import type { Channel, FixtureProfile } from './fixtures'
import { profileError } from './library'

type Props = { profile: FixtureProfile | null; taken: string[]; onSave: (profile: FixtureProfile) => void; onClose: () => void }

const BLANK: FixtureProfile = { id: '', label: '', sim: { kind: 'par' }, channels: [{ name: 'Dimmer', label: 'Dimmer', default: 1 }, { name: 'Red', label: 'Red', default: 0 }, { name: 'Green', label: 'Green', default: 0 }, { name: 'Blue', label: 'Blue', default: 0 }] }

export function ProfileEditor({ profile: initial, taken, onSave, onClose }: Props) {
  const [profile, setProfile] = useState(initial ?? BLANK)
  const change = (patch: Partial<FixtureProfile>) => setProfile((p) => ({ ...p, ...patch }))
  const channels = profile.channels
  const position = profile.position ?? []
  const head = profile.sim.kind === 'head' ? profile.sim : null
  const setChannel = (i: number, patch: Partial<Channel>) => {
    const old = channels[i].name
    change({ channels: channels.map((c, k) => (k === i ? { ...c, ...patch } : c)), position: position.map((n) => (n === old && patch.name !== undefined ? patch.name : n)) })
  }
  const move = (i: number, dir: -1 | 1) => {
    const next = channels.map((c, k) => (k === i ? channels[i + dir] : k === i + dir ? channels[i] : c))
    change({ channels: next, position: next.filter((c) => position.includes(c.name)).map((c) => c.name) })
  }
  const remove = (i: number) => change({ channels: channels.filter((_, k) => k !== i), position: position.filter((n) => n !== channels[i].name) })
  const aim = (name: string, on: boolean) => change({ position: channels.filter((c) => (c.name === name ? on : position.includes(c.name))).map((c) => c.name) })
  const saved: FixtureProfile = { ...profile, position: position.length ? position : undefined }
  const error = !initial && taken.includes(profile.id) ? `id "${profile.id}" is already in this show` : profileError(saved)

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="modal">
      <div className="dialog pars">
        <h2>{initial ? `Edit ${initial.label}` : 'New fixture profile'}</h2>
        <div className="par"><label>Label</label><input value={profile.label} placeholder="e.g. Chauvet SlimPAR 4ch" onChange={(e) => change({ label: e.target.value })} /></div>
        <div className="par"><label>Id</label><input value={profile.id} disabled={!!initial} placeholder="e.g. slimpar4" onChange={(e) => change({ id: e.target.value.trim() })} /></div>
        <div className="par">
          <label>Simulator</label>
          <select value={profile.sim.kind} onChange={(e) => change({ sim: e.target.value === 'head' ? { kind: 'head', pan: 540, tilt: 270 } : { kind: 'par' } })}>
            <option value="par">PAR (wash)</option>
            <option value="head">Moving head</option>
          </select>
        </div>
        {head && (
          <>
            <div className="par"><label>Pan range (°)</label><input type="number" value={head.pan} onChange={(e) => change({ sim: { ...head, pan: Number(e.target.value) } })} /></div>
            <div className="par"><label>Tilt range (°)</label><input type="number" value={head.tilt} onChange={(e) => change({ sim: { ...head, tilt: Number(e.target.value) } })} /></div>
          </>
        )}
        <h4>Channels (DMX order)</h4>
        <div className="profile-channel profile-head"><span>#</span><span>Name</span><span>Label</span><span>Default</span><span>Options</span><span title="part of the stored positions (pan / tilt)">Aim</span><span /></div>
        {channels.map((c, i) => (
          <div key={i} className="profile-channel">
            <span>{i + 1}</span>
            <input value={c.name} onChange={(e) => setChannel(i, { name: e.target.value.trim() })} />
            <input value={c.label} onChange={(e) => setChannel(i, { label: e.target.value })} />
            <input type="number" min={0} max={1} step={0.01} value={c.default} onChange={(e) => setChannel(i, { default: Number(e.target.value) })} />
            <input value={c.options?.join(', ') ?? ''} placeholder="none" title="comma-separated names for a stepped channel, e.g. a colour wheel" onChange={(e) => setChannel(i, { options: e.target.value.trim() ? e.target.value.split(',').map((o) => o.trim()) : undefined })} />
            <input type="checkbox" checked={position.includes(c.name)} onChange={(e) => aim(c.name, e.target.checked)} />
            <span className="profile-buttons">
              <button disabled={i === 0} onClick={() => move(i, -1)} title="move up">↑</button>
              <button disabled={i === channels.length - 1} onClick={() => move(i, 1)} title="move down">↓</button>
              <button disabled={channels.length === 1} onClick={() => remove(i)} title="delete channel">×</button>
            </span>
          </div>
        ))}
        <button onClick={() => change({ channels: [...channels, { name: `Ch${channels.length + 1}`, label: `Channel ${channels.length + 1}`, default: 0 }] })}>+ channel</button>
        <div className="help">Names are TouchDesigner channel names: a capital letter, then letters and digits. Dimmer, Red, Green and Blue get the look and colour ports; the simulator also reads Pan, Tilt and Colorwheel. Aim channels are what a light output's stored positions save and switch.</div>
        <div className="error">{error}</div>
        <div className="designer-actions">
          <button onClick={onClose}>cancel</button>
          <button className="on" disabled={!!error} onClick={() => { onSave(saved); onClose() }}>save profile</button>
        </div>
      </div>
    </div>
  )
}
