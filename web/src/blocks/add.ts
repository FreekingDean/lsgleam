import { type Base, type Show, typed } from '../model/show'
import type { BlockDef, Ports } from './types'
import python from './add.py?raw'

export type AddBlock = Base & { kind: 'add'; amount: number }

const NUMERIC = ['signal', 'number', 'index']

function fed(b: AddBlock, port: string, show: Show | undefined, seen: Set<string>, ports: Ports) {
  if (port === 'in' && ports.multiFeeds(show, b, seen).length) return 'multi'
  const w = show?.wires.find((x) => x.to === b.id && x.port === port)
  const type = show && w && !seen.has(b.id) ? ports.sourcePort(show, w, new Set(seen).add(b.id))?.type : undefined
  return type && NUMERIC.includes(type) ? type : undefined
}

export const add: BlockDef<AddBlock> = {
  kind: 'add',
  label: 'Add (offset)',
  info: 'Adds an amount to a signal, number or index: an index + 1 picks the next colour',
  tab: 'Math',
  python,
  create: (base, n) => ({ ...base, id: `add${n}`, name: `add${n}`, kind: 'add', amount: 1 }),
  inputs: (b, show, ports) => [{ ...typed('in', fed(b, 'in', show, new Set(), ports) ?? 'any'), multi: true }, typed('amount', fed(b, 'amount', show, new Set(), ports) ?? 'any')],
  outputs: (b, show, seen, ports) => [typed('out', fed(b, 'in', show, seen, ports) ?? 'signal', 'out')],
  subtitle: (b) => `${b.amount < 0 ? '−' : '+'} ${Math.abs(b.amount)}`,
  args: (b, show, ports) => [fed(b, 'in', show, new Set(), ports) === 'index'],
  accepts: (source, target) => [...NUMERIC, ...(target.id === 'in' ? ['multi'] : [])].includes(source.type),
}
