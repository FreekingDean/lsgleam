import { type Base, type Port, type Position, COLOR_PORT, LOOK_CHANS, LOOK_PORT, POSITION_PORT, profileOf, typed } from '../model/show'
import { findProfile } from '../model/fixtures'
import type { BlockDef } from './types'
import type { GroupBlock } from './group'
import python from './light.py?raw'

export type LightBlock = Base & { kind: 'light'; profile: string; values: number[]; positions: Position[] }

export const hasRgb = (b: LightBlock | GroupBlock) => profileOf(b).channels.some((ch) => ch.name === 'Red')
export const color = (): Port => ({ id: COLOR_PORT, label: 'color', type: 'color' })
export const look = (): Port => ({ id: LOOK_PORT, label: 'look', type: 'look', chans: LOOK_CHANS })

export const light: BlockDef<LightBlock> = {
  kind: 'light',
  label: 'Fixture out',
  info: 'What this scene sends to every fixture wired to it on the show tab',
  tab: 'Outputs',
  python,
  create: (base, n, item) => {
    const profile = findProfile(item.profile)
    return { ...base, id: `lt${n}`, name: `${profile.label} out`, kind: 'light', profile: profile.id, values: profile.channels.map((c) => c.default), positions: [] }
  },
  inputs: (b) => {
    const profile = profileOf(b)
    const ports = profile.channels.map((ch) => typed(ch.name, 'signal', ch.label))
    return [look(), ...(hasRgb(b) ? [color()] : []), ...(profile.position ? [typed(POSITION_PORT, 'index')] : []), ...ports]
  },
  outputs: () => [],
  subtitle: (b, _outputs, targets) => `${profileOf(b).label} → ${targets.join(', ') || 'nothing yet'}`,
  lead: (b) => [profileOf(b)],
}
