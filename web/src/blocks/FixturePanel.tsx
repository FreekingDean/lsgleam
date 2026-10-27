import { NumField } from '../panels/fields'
import { allProfiles } from '../model/fixtures'
import { fixtureMode, profileOf } from '../model/show'
import { type Props, Slider } from '../panels/shared'
import type { FixtureBlock } from './fixture'

export function FixturePanel({ block, onPatch, onValue }: Props & { block: FixtureBlock }) {
  const profile = profileOf(block)
  const mode = fixtureMode(block)
  return (
    <>
      <div className="par">
        <label>Type</label>
        <select value={profile.id} onChange={(e) => onPatch({ profile: e.target.value })}>
          {allProfiles().map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div className="par">
        <label>Mode</label>
        <select value={mode.name} onChange={(e) => onPatch({ mode: e.target.value })}>
          {profile.modes.map((m) => <option key={m.name} value={m.name}>{m.name} ({m.channels.length} ch)</option>)}
        </select>
      </div>
      <NumField label="Address" value={block.address} onCommit={(v) => onPatch({ address: v })} step={1} />
      <div className="help">Changing type keeps name, place and address, picks the closest mode and clears this fixture's patches: repatch it from the scenes' patch panels.</div>
      <hr />
      <div className="help">Values when no scene is driving it (the weight scenes leave over).</div>
      {profile.attrs.map((a) => (
        <Slider key={a.key} label={a.label} value={block.values[a.key] ?? a.default} driven={false} onChange={(n) => onValue(a.key, n)} options={a.options} />
      ))}
    </>
  )
}
