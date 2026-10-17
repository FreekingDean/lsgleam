import { type Base, typed } from '../model/show'
import type { BlockDef } from './types'
import type { OutputBlock } from './output'
import { innerInputs } from './input'

export type CompositeBlock = Base & { kind: 'composite' }

export const composite: BlockDef<CompositeBlock> = {
  kind: 'composite',
  label: 'Composite (your own block)',
  info: 'Your own block: double-click to build it from inputs, transformers and outputs inside',
  tab: 'Math',
  create: (base, n) => ({ ...base, id: `comp${n}`, name: `Composite ${n}`, kind: 'composite' }),
  inputs: (b, show) => innerInputs(b, show),
  outputs: (b, show) => (show?.blocks ?? []).filter((x): x is OutputBlock => x.kind === 'output' && x.scene === b.id).map((x) => typed(x.id, x.type, x.name)),
  subtitle: () => 'double-click to edit',
}
