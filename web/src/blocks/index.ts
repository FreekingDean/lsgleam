import type { Kind } from '../model/show'
import { KIND_INFO } from '../model/catalog'
import type { BlockDef } from './types'
import { timer } from './timer'
import { combine } from './combine'

export { ELEMENT_TYPES, WIDE_TYPES, combineSlots, elementOf } from './combine'

export const BLOCKS = { timer, combine }
export type DefKind = keyof typeof BLOCKS

export const blockDef = (kind: Kind): BlockDef | undefined => (BLOCKS as Partial<Record<Kind, BlockDef>>)[kind]
export const hasDef = <T extends { kind: Kind }>(x: T): x is Extract<T, { kind: DefKind }> => !!blockDef(x.kind)
export const defOf = (x: { kind: DefKind }): BlockDef => BLOCKS[x.kind]
export const kindInfo = (kind: Kind) => blockDef(kind)?.info ?? KIND_INFO[kind]
