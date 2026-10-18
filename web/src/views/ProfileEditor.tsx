import { useEffect, useState } from 'react'
import type { StoredProfile } from '../model/fixtures'
import { profileError } from '../model/library'
import { ATTRIBUTES, attributeOf, channelFor, type Attribute, type OflChannel, type OflFixture, type OflSlot } from '../model/ofl'

type Props = { profile: StoredProfile | null; taken: string[]; onSave: (profile: StoredProfile) => void; onClose: () => void }

const CATEGORIES = ['Color Changer', 'Moving Head', 'Pixel Bar', 'Dimmer', 'Other']
const TYPE_LABELS: Record<Attribute, string> = { intensity: 'Intensity', red: 'Red', green: 'Green', blue: 'Blue', white: 'White', amber: 'Amber', uv: 'UV', cyan: 'Cyan', magenta: 'Magenta', yellow: 'Yellow', hue: 'Hue', saturation: 'Saturation', strobe: 'Strobe', pan: 'Pan', tilt: 'Tilt', panTiltSpeed: 'Pan/tilt speed', colorWheel: 'Colour wheel', gobo: 'Gobo wheel', zoom: 'Zoom', focus: 'Focus', raw: 'Other (plain slider)' }

const blank = (): OflFixture => ({
  name: '',
  categories: ['Color Changer'],
  physical: { lens: { degreesMinMax: [40, 40] } },
  availableChannels: {
    Dimmer: { defaultValue: 255, capability: { type: 'Intensity' } },
    Red: { capability: { type: 'ColorIntensity', color: 'Red' } },
    Green: { capability: { type: 'ColorIntensity', color: 'Green' } },
    Blue: { capability: { type: 'ColorIntensity', color: 'Blue' } },
  },
  modes: [{ name: '4-channel', channels: ['Dimmer', 'Red', 'Green', 'Blue'] }],
})

const bits = (ch: OflChannel) => 8 * ((ch.fineChannelAliases?.length ?? 0) + 1)
const percent = (ch: OflChannel) => (typeof ch.defaultValue === 'string' ? Number.parseFloat(ch.defaultValue) : ((ch.defaultValue ?? 0) / (2 ** bits(ch) - 1)) * 100)
const wheelName = (key: string, ch: OflChannel) => ch.name ?? key
const rangeOf = (ch: OflChannel) => Number.parseFloat(ch.capability?.angleEnd ?? '') || 0

export function ProfileEditor({ profile: initial, taken, onSave, onClose }: Props) {
  const [id, setId] = useState(initial?.id ?? '')
  const [fixture, setFixture] = useState<OflFixture>(initial?.fixture ?? blank())
  const channels = fixture.availableChannels ?? {}
  const keys = Object.keys(channels)
  const change = (patch: Partial<OflFixture>) => setFixture((f) => ({ ...f, ...patch }))
  const modes = (f: (list: string[]) => string[]) => fixture.modes.map((m) => ({ ...m, channels: f(m.channels.filter((c): c is string => typeof c === 'string')) }))
  const setChannels = (next: Record<string, OflChannel>, patch: Partial<OflFixture> = {}) => change({ availableChannels: next, ...patch })
  const replace = (key: string, nextKey: string, ch: OflChannel, wheel?: OflSlot[]) => {
    const wheels = { ...fixture.wheels }
    delete wheels[wheelName(key, channels[key])]
    if (wheel) wheels[wheelName(nextKey, ch)] = { slots: wheel }
    const next = Object.fromEntries(keys.map((k) => (k === key ? [nextKey, ch] : [k, channels[k]])))
    const fineOld = channels[key].fineChannelAliases?.[0]
    const fineNew = ch.fineChannelAliases?.[0]
    setChannels(next, {
      wheels,
      modes: modes((list) => list.flatMap((c) => (c === key ? [nextKey, ...(fineNew && !fineOld ? [fineNew] : [])] : c === fineOld ? (fineNew ? [fineNew] : []) : [c]))),
    })
  }
  const retype = (key: string, attribute: Attribute, slots = slotsOf(key), range = rangeOf(channels[key]) || (attribute === 'tilt' ? 270 : 540)) => {
    const old = channels[key]
    const made = channelFor(attribute, old.name ?? key, slots, range)
    replace(key, key, { ...made.channel, ...(old.defaultValue !== undefined ? { defaultValue: old.defaultValue } : {}), ...(old.fineChannelAliases ? { fineChannelAliases: old.fineChannelAliases } : {}) }, made.wheel)
  }
  const slotsOf = (key: string) => (fixture.wheels?.[wheelName(key, channels[key])]?.slots ?? []).map((s) => s.name ?? s.type)
  const rename = (key: string, next: string) => {
    if (!next || (next !== key && keys.includes(next))) return
    const ch = channels[key]
    replace(key, next, { ...ch, ...(ch.fineChannelAliases ? { fineChannelAliases: [`${next} fine`] } : {}) }, fixture.wheels?.[wheelName(key, ch)]?.slots)
  }
  const fine = (key: string, on: boolean) => {
    const { fineChannelAliases: _old, ...rest } = channels[key]
    replace(key, key, on ? { ...rest, fineChannelAliases: [`${key} fine`] } : rest, fixture.wheels?.[wheelName(key, channels[key])]?.slots)
  }
  const remove = (key: string) => {
    const gone = [key, ...(channels[key].fineChannelAliases ?? [])]
    setChannels(Object.fromEntries(keys.filter((k) => k !== key).map((k) => [k, channels[k]])), { modes: modes((list) => list.filter((c) => !gone.includes(c))) })
  }
  const add = () => {
    let n = keys.length + 1
    while (keys.includes(`Channel ${n}`)) n++
    const key = `Channel ${n}`
    setChannels({ ...channels, [key]: { capability: { type: 'Generic' } } }, { modes: modes((list) => [...list, key]) })
  }
  const lens = fixture.physical?.lens?.degreesMinMax?.[1] ?? 40
  const saved: StoredProfile = { id, fixture }
  const error = !initial && taken.includes(id) ? `id "${id}" is already in this show` : profileError(saved)

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="modal">
      <div className="dialog pars">
        <h2>{initial ? `Edit ${initial.fixture.name}` : 'New fixture profile'}</h2>
        <div className="par"><label>Name</label><input value={fixture.name} placeholder="e.g. Chauvet SlimPAR 4ch" onChange={(e) => change({ name: e.target.value })} /></div>
        <div className="par"><label>Id</label><input value={id} disabled={!!initial} placeholder="e.g. slimpar4" onChange={(e) => setId(e.target.value.trim())} /></div>
        <div className="par">
          <label>Type</label>
          <select value={fixture.categories[0]} onChange={(e) => change({ categories: [e.target.value] })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="par"><label>Beam angle (°)</label><input type="number" value={lens} onChange={(e) => change({ physical: { ...fixture.physical, lens: { degreesMinMax: [Number(e.target.value), Number(e.target.value)] } } })} /></div>
        <h4>Channels</h4>
        <div className="profile-channel profile-head"><span /><span>Name</span><span>Does</span><span>Default %</span><span title="colour or gobo slot names, or the pan / tilt range in degrees">Slots / range</span><span title="16-bit: adds a fine channel">Fine</span><span /></div>
        {keys.map((key, i) => {
          const ch = channels[key]
          const attribute = attributeOf(fixture, key)
          const wheel = attribute === 'colorWheel' || attribute === 'gobo'
          return (
            <div key={i} className="profile-channel">
              <span>{i + 1}</span>
              <input defaultValue={key} onBlur={(e) => rename(key, e.target.value.trim())} />
              <select value={attribute} onChange={(e) => retype(key, e.target.value as Attribute)}>
                {ATTRIBUTES.map((a) => <option key={a} value={a}>{TYPE_LABELS[a]}</option>)}
              </select>
              <input type="number" min={0} max={100} step={1} value={Number(percent(ch).toFixed(2))} onChange={(e) => replace(key, key, { ...ch, defaultValue: `${Math.max(0, Math.min(100, Number(e.target.value)))}%` }, fixture.wheels?.[wheelName(key, ch)]?.slots)} />
              {wheel ? <input defaultValue={slotsOf(key).join(', ')} placeholder="Open, Red, Blue" onBlur={(e) => retype(key, attribute, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
                : attribute === 'pan' || attribute === 'tilt' ? <input type="number" value={rangeOf(ch)} onChange={(e) => retype(key, attribute, [], Number(e.target.value))} />
                : <span />}
              <input type="checkbox" checked={!!ch.fineChannelAliases?.length} onChange={(e) => fine(key, e.target.checked)} />
              <span className="profile-buttons"><button disabled={keys.length === 1} onClick={() => remove(key)} title="delete channel">×</button></span>
            </div>
          )
        })}
        <button onClick={add}>+ channel</button>
        <h4>Modes (DMX order)</h4>
        {fixture.modes.map((m, i) => (
          <div key={i} className="par">
            <input className="mode-name" value={m.name} onChange={(e) => change({ modes: fixture.modes.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
            <input key={m.channels.join('|')} defaultValue={m.channels.join(', ')} title="channel names in DMX order, comma separated" onBlur={(e) => change({ modes: fixture.modes.map((x, k) => (k === i ? { ...x, channels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : x)) })} />
            <button disabled={fixture.modes.length === 1} onClick={() => change({ modes: fixture.modes.filter((_, k) => k !== i) })} title="delete mode">×</button>
          </div>
        ))}
        <button onClick={() => change({ modes: [...fixture.modes, { name: `Mode ${fixture.modes.length + 1}`, channels: [...fixture.modes[0].channels] }] })}>+ mode</button>
        <div className="help">Saved as an Open Fixture Library fixture. Each channel says what it does; lsgleam drives intensity, colour, strobe, pan / tilt and wheels from those, and gives every other channel a plain slider. Hue and saturation channels are fed from the colour; with no intensity channel, intensity is mixed into the colours.</div>
        <div className="error">{error}</div>
        <div className="designer-actions">
          <button onClick={onClose}>cancel</button>
          <button className="on" disabled={!!error} onClick={() => { onSave(saved); onClose() }}>save profile</button>
        </div>
      </div>
    </div>
  )
}
