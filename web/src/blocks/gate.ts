import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import { flow, multiPort } from './multi'
import python from './gate.py?raw'

export type GateBlock = Base & { kind: 'gate'; threshold: number; rescale: boolean }

export const gate: BlockDef<GateBlock> = {
  kind: 'gate',
  label: 'Gate (zero below X%)',
  info: 'Zero below a threshold; above it pass through or rescale to 0–1',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `gate${n}`, name: `gate${n}`, kind: 'gate', threshold: 0.3, rescale: true }),
  inputs: (b, show, ports) => [multiPort(show, b, 'signal', ports)],
  outputs: (b, show, seen, ports) => [typed('out', flow(show, b, seen, ports), 'gated')],
  subtitle: (b) => `> ${Math.round(b.threshold * 100)}%${b.rescale ? ' · rescaled' : ''}`,
}
