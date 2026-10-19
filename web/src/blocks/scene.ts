import { type Base, ON_PORT, memberPort, typed } from '../model/show'
import type { BlockDef } from './types'
import { innerInputs } from './input'

export type SceneBlock = Base & { kind: 'scene'; fadeIn: number; fadeOut: number; rooms?: string[] }

export const scene: BlockDef<SceneBlock> = {
  kind: 'scene',
  label: 'Scene',
  info: 'Turns its inputs into fixture outputs, weighted by on',
  tab: 'Scenes',
  create: (base, n) => ({ ...base, id: `scene${n}`, name: `Scene ${n}`, kind: 'scene', fadeIn: 0.5, fadeOut: 0.5, w: 260 }),
  inputs: (b, show) => [typed(ON_PORT, 'signal'), ...innerInputs(b, show)],
  outputs: (b, show) => (show?.blocks ?? []).filter((x) => x.scene === b.id).flatMap((x) => {
    if (x.kind === 'group') return Array.from({ length: x.size }, (_, i) => ({ ...typed(memberPort(x.id, i), 'fixture', `${x.name} ${i + 1}`), profile: x.profile }))
    if (x.kind === 'light') return [{ ...typed(x.id, 'fixture', x.name), profile: x.profile }]
    if (x.kind === 'strip') return [typed(x.id, 'pixels', x.name)]
    return []
  }),
  subtitle: () => 'scene',
}
