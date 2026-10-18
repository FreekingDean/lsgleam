import { POSITION_PORT, profileOf, type Position } from '../model/show'
import { type Props, Slider } from '../panels/shared'
import type { LightBlock } from './light'
import { PositionRows } from './PositionRows'

function Positions({ block, driven, onPatch, onValue, readValues }: Props & { block: LightBlock }) {
  const names = profileOf(block).position ?? []
  return (
    <PositionRows<Position>
      positions={block.positions}
      locked={driven.has(POSITION_PORT)}
      summary={(p) => names.map((n) => (p.values[n] ?? 0).toFixed(2)).join(' / ')}
      onStore={async () => ({ name: `pos ${block.positions.length + 1}`, values: await readValues(names) })}
      onSet={async (p) => ({ ...p, values: await readValues(names) })}
      onGo={(p) => names.forEach((n) => p.values[n] !== undefined && onValue(n, p.values[n]))}
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
      {profile.attrs.map((a) => (
        <Slider key={a.key} label={a.label} value={block.values[a.key] ?? a.default} driven={driven.has(a.key)} onChange={(n) => onValue(a.key, n)} options={a.options} />
      ))}
      {profile.position && <Positions {...props} />}
    </>
  )
}
