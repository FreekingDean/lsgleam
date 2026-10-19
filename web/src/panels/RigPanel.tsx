import type { ReactNode } from 'react'
import { fixtureMode, profileOf, type Kind, type Show } from '../model/show'
import { formatLength } from '../model/format'
import { unitsOf } from '../model/units'

const DEVICES: Partial<Record<Kind, string>> = { artnet: 'Art-Net / sACN nodes', board: 'Pixel boards', dmxin: 'DMX controllers', audio: 'Audio inputs', cdj: 'Audio sources', blt: 'Beat Link Triggers', audioslice: 'AudioSlice', box: 'Rooms' }

const tally = (names: string[]) => [...names.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])

export function RigPanel({ show, onSchedule, children }: { show: Show; onSchedule: () => void; children?: ReactNode }) {
  const units = unitsOf(show)
  const fixtures = units.flatMap((u) => (u.block.kind === 'fixture' ? [u.block] : []))
  const tubes = show.blocks.flatMap((b) => (b.kind === 'tube' ? [b] : []))
  const devices = tally(units.flatMap((u) => DEVICES[u.block.kind] ?? []))
  return (
    <aside className="panel">
      <h2>Rig</h2>
      <div className="pars">
        {children}
        <h3>Fixtures · {fixtures.length}</h3>
        {tally(fixtures.map((f) => profileOf(f).label)).map(([name, n]) => <div key={name} className="help">{n} × {name}</div>)}
        <div className="help">{fixtures.reduce((sum, f) => sum + fixtureMode(f).channels.length, 0)} DMX channels</div>
        <h3>LED tubes · {tubes.length}</h3>
        <div className="help">{tubes.reduce((sum, t) => sum + t.leds, 0)} LEDs · {formatLength(tubes.reduce((sum, t) => sum + t.length, 0))}</div>
        <h3>Devices · {devices.reduce((sum, [, n]) => sum + n, 0)}</h3>
        {devices.map(([name, n]) => <div key={name} className="help">{n} × {name}</div>)}
        <button onClick={onSchedule}>open schedule</button>
      </div>
    </aside>
  )
}
