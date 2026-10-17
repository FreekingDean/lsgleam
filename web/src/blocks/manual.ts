import { type Base, EMPTY_SHOW, scenesOf, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './manual.py?raw'

export type ManualBlock = Base & { kind: 'manual'; active: number }

export const manual: BlockDef<ManualBlock> = {
  kind: 'manual',
  label: 'Scene select (buttons / index)',
  info: 'Scene select: buttons, or an index that picks scene N',
  tab: 'Scenes',
  python,
  create: (base, n) => ({ ...base, id: `manual${n}`, name: `manual${n}`, kind: 'manual', active: 0 }),
  inputs: () => [typed('index', 'index', 'scene index')],
  outputs: (_b, show) => scenesOf(show ?? EMPTY_SHOW).map((s) => typed(`s_${s.id}`, 'signal', s.name)),
  subtitle: () => 'buttons',
  lead: (_b, show) => [scenesOf(show).map((s) => s.id)],
}
