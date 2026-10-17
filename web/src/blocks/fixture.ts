import { type Base, type Show, FIXTURE_PORT, profileOf, typed } from '../model/show'
import { findProfile } from '../model/fixtures'
import type { BlockDef } from './types'
import python from './fixture.py?raw'

export type FixtureBlock = Base & { kind: 'fixture'; profile: string; address: number; values: number[] }

export function nextAddress(show: Show) {
  return show.blocks.reduce((max, b) => {
    return b.kind === 'fixture' ? Math.max(max, b.address + profileOf(b).channels.length) : max
  }, 1)
}

export const fixture: BlockDef<FixtureBlock> = {
  kind: 'fixture',
  label: 'Fixture',
  info: 'A light in the room, patched on a DMX chain',
  tab: 'Fixtures',
  python,
  create: (base, n, item, show) => {
    const profile = findProfile(item.profile)
    return { ...base, id: `fix${n}`, name: `fix${n}`, kind: 'fixture', profile: profile.id, address: nextAddress(show), values: profile.channels.map((c) => c.default) }
  },
  inputs: (b) => [{ ...typed(FIXTURE_PORT, 'fixture', b.name), profile: b.profile }],
  outputs: () => [],
  subtitle: (b, _outputs, _targets, patch) => `${profileOf(b).label} · ${patch ? `U${patch.universe}` : 'unpatched'} @${b.address}`,
  lead: (b) => [profileOf(b)],
}
