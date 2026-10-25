import { type Base, FIXTURE_PORT, typed } from '../model/show'
import type { BlockDef } from './types'
import python from './oscout.py?raw'

export type OscOutBlock = Base & { kind: 'oscout'; host: string; port: number; address: string; scale: number; glide?: number }

export const oscout: BlockDef<OscOutBlock> = {
  kind: 'oscout',
  label: 'OSC out',
  info: 'Sends a value × scale as OSC to another app, e.g. MadMapper',
  tab: 'Hardware',
  python,
  create: (base, n) => ({ ...base, id: `osc${n}`, name: `osc${n}`, kind: 'oscout', host: '127.0.0.1', port: 8010, address: '/lsgleam/value', scale: 1 }),
  inputs: (b) => [typed(FIXTURE_PORT, 'any', b.name)],
  outputs: () => [],
  subtitle: (b) => `${b.address} → ${b.host}:${b.port}${b.glide ? ` · glide ${b.glide}s` : ''}`,
  accepts: (source) => ['signal', 'number', 'index'].includes(source.type),
}
