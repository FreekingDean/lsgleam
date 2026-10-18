import { type Base, type Port, type Position, COLOR_PORT, LOOK_CHANS, LOOK_PORT, POSITION_PORT, profileOf, typed } from '../model/show'
import { defaultValues, findProfile, valuePairs, type Values } from '../model/fixtures'
import type { BlockDef } from './types'
import type { GroupBlock } from './group'
import python from './light.py?raw'

export type LightBlock = Base & { kind: 'light'; profile: string; values: Values; positions: Position[] }

export const hasRgb = (b: LightBlock | GroupBlock) => profileOf(b).color
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
    return { ...base, id: `lt${n}`, name: `${profile.label} out`, kind: 'light', profile: profile.id, values: defaultValues(profile), positions: [] }
  },
  inputs: (b) => {
    const profile = profileOf(b)
    const ports = profile.attrs.map((a) => typed(a.key, 'signal', a.label))
    return [look(), ...(hasRgb(b) ? [color()] : []), ...(profile.position ? [typed(POSITION_PORT, 'index')] : []), ...ports]
  },
  outputs: () => [],
  subtitle: (b, _outputs, targets) => `${profileOf(b).label} → ${targets.join(', ') || 'nothing yet'}`,
  lead: (b) => [valuePairs(profileOf(b), b.values), profileOf(b).position ?? []],
}
