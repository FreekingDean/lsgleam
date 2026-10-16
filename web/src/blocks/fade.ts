import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import { flow, multiPort } from './multi'
import python from './fade.py?raw'

export type FadeBlock = Base & { kind: 'fade'; rise: number; fall: number; curve: 'linear' | 'smooth' }

export const fade: BlockDef<FadeBlock> = {
  kind: 'fade',
  label: 'Fade (rise / fall time)',
  info: 'Ramps a signal linearly: up over the rise time, down over the fall time',
  tab: 'Time',
  python,
  create: (base, n) => ({ ...base, id: `fade${n}`, name: `fade${n}`, kind: 'fade', rise: 0, fall: 4, curve: 'linear' }),
  inputs: (b, show, ports) => [multiPort(show, b, 'signal', ports)],
  outputs: (b, show, seen, ports) => [typed('out', flow(show, b, seen, ports), 'faded')],
  subtitle: (b) => `↑ ${b.rise}s · ↓ ${b.fall}s · ${b.curve}`,
}
