import par7 from '../fixtures/par7.json'
import mh11 from '../fixtures/mh11.json'
import { compile, type Compiled, type OflFixture } from './ofl'

export type StoredProfile = { id: string; fixture: OflFixture }
export type FixtureProfile = Compiled & { id: string; fixture: OflFixture }
export type Values = Record<string, number>

export const FIXTURES: StoredProfile[] = [{ id: 'par7', fixture: par7 as unknown as OflFixture }, { id: 'mh11', fixture: mh11 as unknown as OflFixture }]

const compiled = new WeakMap<StoredProfile, FixtureProfile>()
export function compiledOf(p: StoredProfile): FixtureProfile {
  const hit = compiled.get(p)
  if (hit) return hit
  const made = { ...compile(p.fixture), id: p.id, fixture: p.fixture }
  compiled.set(p, made)
  return made
}

let custom: StoredProfile[] = []
export const setCustomProfiles = (profiles: StoredProfile[]) => { custom = profiles }
export const allProfiles = () => [...FIXTURES, ...custom].map(compiledOf)
export const findProfile = (id: string) => allProfiles().find((f) => f.id === id) ?? compiledOf(FIXTURES[0])

export const defaultValues = (p: FixtureProfile): Values => Object.fromEntries(p.attrs.map((a) => [a.key, a.default]))
export const valuePairs = (p: FixtureProfile, values: Values) => p.attrs.map((a): [string, number] => [a.key, values[a.key] ?? a.default])
export const modeOf = (p: FixtureProfile, name?: string) => p.modes.find((m) => m.name === name) ?? p.modes[0]
