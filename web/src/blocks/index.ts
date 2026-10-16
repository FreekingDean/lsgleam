import type { Kind } from '../model/show'
import { KIND_INFO } from '../model/catalog'
import type { BlockDef } from './types'

export type { Ports } from './types'
import { timer } from './timer'
import { combine } from './combine'
import { constant } from './constant'
import { latch } from './latch'
import { and } from './and'
import { not } from './not'
import { equals } from './equals'
import { counter } from './counter'
import { steps } from './steps'
import { level } from './level'
import { gate } from './gate'
import { fade } from './fade'
import { mix } from './mix'
import { hold } from './hold'
import { drop } from './drop'
import { range } from './range'

export { ELEMENT_TYPES, WIDE_TYPES, combineSlots, elementOf } from './combine'

export const BLOCKS = { timer, combine, constant, latch, and, not, equals, counter, steps, level, gate, fade, mix, hold, drop, range }
export type DefKind = keyof typeof BLOCKS

export const blockDef = (kind: Kind): BlockDef | undefined => (BLOCKS as Partial<Record<Kind, BlockDef>>)[kind]
export const hasDef = <T extends { kind: Kind }>(x: T): x is Extract<T, { kind: DefKind }> => !!blockDef(x.kind)
export const defOf = (x: { kind: DefKind }): BlockDef => BLOCKS[x.kind]
export const kindInfo = (kind: Kind) => blockDef(kind)?.info ?? KIND_INFO[kind]
