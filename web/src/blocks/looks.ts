import { type Base, type PatternAdvance, type Scene, COLOR_PORT, LOOK_CHANS, LOOK_PORT, typed } from '../model/show'
import { colorOf, colorValues } from '../model/format'
import type { BlockDef } from './types'
import python from './looks.py?raw'

export type LooksBlock = Base & { kind: 'looks'; scenes: Scene[]; advance: PatternAdvance; every: number }

export const looks: BlockDef<LooksBlock> = {
  kind: 'looks',
  label: 'Looks (colour + window)',
  info: 'Looks (colour + brightness window), switched by index or trigger',
  tab: 'Time',
  python,
  builder: 'build_scenes',
  create: (base, n) => ({ ...base, id: `look${n}`, name: `look${n}`, kind: 'looks', scenes: [{ name: 'Q1', color: colorOf('#ff4040'), window: [0.1, 0.4] }, { name: 'Q2', color: colorOf('#4080ff'), window: [0.2, 0.8] }], advance: 'trigger', every: 1 }),
  inputs: (b) => [b.advance === 'step' ? typed('scene', 'index', 'look index') : typed('next', 'signal', 'next look'), typed('offset', 'index', 'look offset'), typed('dimmer', 'signal'), typed('wild', 'signal'), { id: COLOR_PORT, label: 'color', type: 'color' }],
  outputs: () => [{ id: LOOK_PORT, label: 'look', type: 'look', chans: LOOK_CHANS }, typed('scene', 'index')],
  subtitle: (b) => b.scenes.map((s) => s.name).join(' · '),
  args: (b) => [b.scenes.map((s) => [colorValues(s.color), ...s.window])],
}
