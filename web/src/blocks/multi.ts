import { type Block, type Port, type Show, typed } from '../model/show'
import type { Ports } from './types'

export const multiPort = (show: Show | undefined, b: Block, id: string, ports: Ports): Port => ({ ...typed(id, ports.multiFeeds(show, b).some((w) => w.port === id) ? 'multi' : 'signal'), multi: true })
export const flow = (show: Show | undefined, b: Block, seen: Set<string>, ports: Ports) => (ports.multiFeeds(show, b, seen).length ? 'multi' : 'signal')
