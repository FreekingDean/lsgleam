import { POSITION_PORT, profileOf, type Position } from '../model/show'
import { type Props, Slider } from '../panels/shared'
import type { LightBlock } from './light'
import { PositionRows } from './PositionRows'

function Positions({ block, driven, onPatch, onValue, readValues }: Props & { block: LightBlock }) {
  const profile = profileOf(block)
  const names = profile.position ?? []
  const index = (n: string) => profile.channels.findIndex((ch) => ch.name === n)
  return (
    <PositionRows<Position>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => names.map((n) => (p.values[n] ?? 0).toFixed(2)).join(' / ')}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, values: await readValues(names) })}
      onSet={async (p) => ({ ...p, values: await readValues(names) })}
      onGo={(p) => names.forEach((n) => p.values[n] !== undefined && onValue(index(n), p.values[n]))}
      onChange={(positions) => onPatch({ positions })}
    />
  )
}

export function LightPanel(props: Props & { block: LightBlock; targets: string[] }) {
  const { block, driven, onValue, targets } = props
  const profile = profileOf(block)
  return (
    <>
      <div className="help">Drives {targets.length ? targets.join(', ') : 'nothing yet: wire it to fixtures on the show tab'}. Unwired channels send these values.</div>
      {profile.channels.map((ch, i) => (
        <Slider key={ch.name} label={ch.label} value={block.values[i] ?? 0} driven={driven.has(ch.name)} onChange={(n) => onValue(i, n)} options={ch.options} />
      ))}
      {profile.position && <Positions {...props} />}
    </>
  )
}
