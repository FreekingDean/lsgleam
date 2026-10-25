import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './oscout.py?raw'

export type OscOutBlock = Base & { kind: 'oscout'; host: string; port: number; address: string; scale: number }

export const oscout: BlockDef<OscOutBlock> = {
  kind: 'oscout',
  label: 'OSC out (value → MadMapper etc.)',
  info: 'Sends a value × scale as OSC to another app, e.g. MadMapper',
  tab: 'Logic',
  python,
  create: (base, n) => ({ ...base, id: `osc${n}`, name: `osc${n}`, kind: 'oscout', host: '127.0.0.1', port: 8010, address: '/lsgleam/value', scale: 1 }),
  inputs: () => [typed('value', 'any')],
  outputs: () => [],
  subtitle: (b) => `${b.address} → ${b.host}:${b.port}`,
  accepts: (source) => ['signal', 'number', 'index'].includes(source.type),
}
