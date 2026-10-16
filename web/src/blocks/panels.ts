import type { ReactNode } from 'react'
import type { Block } from '../model/show'
import type { Props } from '../panels/shared'
import type { DefKind } from '.'
import { TimerPanel } from './TimerPanel'
import { CombinePanel } from './CombinePanel'

export const PANELS: { [K in DefKind]: (props: Props & { block: Extract<Block, { kind: K }> }) => ReactNode } = { timer: TimerPanel, combine: CombinePanel }
export const panelOf = (kind: DefKind) => PANELS[kind] as (props: Props) => ReactNode
