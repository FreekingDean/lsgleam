import { FIXTURES, compiledOf, setCustomProfiles, type StoredProfile } from './fixtures'
import { compile, unresolved } from './ofl'
import { isLegacy, legacyFixture } from './migrate'
import { normalize } from './migrate'
import { LAYOUT_KINDS, PIXEL_PROTOCOLS, hasProfile, type Block, type ColorRow, type Show, type TubeDesign } from './show'
import { copyBlocks, newBlock, pasteBlocks, patchBlock, type Clip } from './edit'

export type ColorPalette = { name: string; steps: number; rows: ColorRow[] }
export type Library = { format: 'lsgleam-library'; version: 1; name: string; author?: string; fixtures: StoredProfile[]; designs: TubeDesign[]; palettes: ColorPalette[]; composites: Clip[] }
export type Picks = { fixtures: string[]; designs: string[]; palettes: string[]; composites: string[] }

const STORE = 'libraries'
const PROFILE_ID = /^[a-z0-9][a-z0-9_-]*$/i
const HEX = /^#[0-9a-f]{6}$/i

function fail(message: string): never {
  throw new Error(message)
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const listOf = (v: unknown, what: string): unknown[] => (Array.isArray(v) ? v : fail(`${what} must be a list`))

export function profileError(p: StoredProfile): string | null {
  if (!PROFILE_ID.test(p.id ?? '')) return 'id: letters, digits, - and _ only'
  if (FIXTURES.some((f) => f.id === p.id)) return `id "${p.id}" is a built-in profile`
  const f = p.fixture
  if (!isObj(f) || !isText(f.name)) return 'needs a name'
  if (!Array.isArray(f.modes) || !f.modes.length) return 'needs at least one mode'
  try {
    const compiled = compile(f)
    for (const [i, m] of compiled.modes.entries()) {
      if (!isText(m.name) || compiled.modes.findIndex((x) => x.name === m.name) !== i) return `mode ${i + 1}: needs a unique name`
      if (!m.channels.length) return `${m.name}: needs at least one channel`
    }
    const missing = unresolved(f)
    if (missing.length) return missing[0]
  } catch (e) {
    return `not a valid Open Fixture Library fixture: ${(e as Error).message}`
  }
  return null
}

function parseProfile(raw: unknown, what: string): StoredProfile {
  if (!isObj(raw)) fail(`${what} is not an object`)
  const p = isLegacy(raw) ? { id: raw.id, fixture: legacyFixture(raw) } : raw as StoredProfile
  const error = profileError(p)
  if (error) fail(`${what} (${String(p.id)}): ${error}`)
  return { id: p.id, fixture: p.fixture }
}

function parseDesign(raw: unknown, what: string): TubeDesign {
  if (!isObj(raw) || !isText(raw.id) || !isText(raw.name)) fail(`${what} needs an id and a name`)
  const tubes = listOf(raw.tubes, `${what} tubes`).map((t, i) => {
    const at = `${what} tube ${i + 1}`
    if (!isObj(t) || !isText(t.id) || typeof t.name !== 'string') fail(`${at} needs an id and a name`)
    if (!Number.isInteger(t.leds) || (t.leds as number) < 1 || !isNum(t.length) || t.length <= 0) fail(`${at} needs LEDs and a length`)
    if (!PIXEL_PROTOCOLS.includes(t.protocol as string)) fail(`${at}: unknown pixel protocol ${String(t.protocol)}`)
    const path = listOf(t.path, `${at} path`)
    if (path.length < 2 || !path.every((p) => Array.isArray(p) && p.length === 3 && p.every(isNum))) fail(`${at} path must be two or more [x, y, z] points`)
    return { id: t.id, name: t.name, leds: t.leds as number, length: t.length, protocol: t.protocol as string, path: path as TubeDesign['tubes'][number]['path'] }
  })
  if (!tubes.length) fail(`${what} has no tubes`)
  return { id: raw.id, name: raw.name, tubes }
}

function parsePalette(raw: unknown, what: string): ColorPalette {
  if (!isObj(raw) || !isText(raw.name)) fail(`${what} needs a name`)
  if (!Number.isInteger(raw.steps) || (raw.steps as number) < 1 || (raw.steps as number) > 32) fail(`${what} steps must be 1–32`)
  const rows = listOf(raw.rows, `${what} rows`).map((r, i) => {
    if (!isObj(r) || typeof r.name !== 'string') fail(`${what} row ${i + 1} needs a name`)
    const colors = listOf(r.colors, `${what} row ${i + 1} colours`)
    if (!colors.every((c) => typeof c === 'string' && HEX.test(c))) fail(`${what} row ${i + 1}: colours must be #rrggbb`)
    return { name: r.name, colors: colors as string[] }
  })
  if (!rows.length) fail(`${what} has no rows`)
  return { name: raw.name, steps: raw.steps as number, rows }
}

function parseComposite(raw: unknown, what: string): Clip {
  if (!isObj(raw)) fail(`${what} is not an object`)
  const blocks = listOf(raw.blocks, `${what} blocks`)
  const wires = listOf(raw.wires, `${what} wires`)
  if (!blocks.every((b) => isObj(b) && isText(b.id) && isText(b.kind))) fail(`${what}: every block needs an id and a kind`)
  const typed = blocks as Block[]
  const ids = new Set(typed.map((b) => b.id))
  const roots = typed.filter((b) => !b.scene || !ids.has(b.scene))
  if (roots.length !== 1 || roots[0].kind !== 'composite') fail(`${what} must be one composite with its inner blocks`)
  const bad = typed.find((b) => LAYOUT_KINDS.includes(b.kind) || b.kind === 'scene' || b.kind === 'manual')
  if (bad) fail(`${what}: ${bad.kind} blocks can't be inside a composite`)
  const { scene: _scene, ...root } = roots[0]
  const clean = normalize({ nextId: 1, blocks: [root as Block, ...typed.filter((b) => b !== roots[0])], wires: wires as Clip['wires'], cables: [] })
  return { blocks: clean.blocks, wires: clean.wires }
}

export function parseLibrary(raw: unknown): Library {
  if (!isObj(raw) || raw.format !== 'lsgleam-library') fail('not an lsgleam library (format must be "lsgleam-library")')
  if (raw.version !== 1) fail(`unsupported library version ${String(raw.version)} (this app reads version 1)`)
  if (!isText(raw.name)) fail('the library needs a name')
  if (raw.author !== undefined && typeof raw.author !== 'string') fail('author must be text')
  return {
    format: 'lsgleam-library',
    version: 1,
    name: raw.name,
    ...(raw.author ? { author: raw.author } : {}),
    fixtures: listOf(raw.fixtures ?? [], 'fixtures').map((f, i) => parseProfile(f, `fixture ${i + 1}`)),
    designs: listOf(raw.designs ?? [], 'designs').map((d, i) => parseDesign(d, `tube design ${i + 1}`)),
    palettes: listOf(raw.palettes ?? [], 'palettes').map((p, i) => parsePalette(p, `palette ${i + 1}`)),
    composites: listOf(raw.composites ?? [], 'composites').map((c, i) => parseComposite(c, `composite ${i + 1}`)),
  }
}

function clipOf(show: Show, id: string): Clip {
  const { blocks, wires } = copyBlocks(show, [id])
  const ids = new Set(blocks.map((b) => b.id))
  const root = blocks.find((b) => b.id === id)!
  const { scene: _scene, ...top } = root
  return { blocks: [top as Block, ...blocks.filter((b) => b !== root)], wires: wires.filter((w) => ids.has(w.to)) }
}

export function buildLibrary(show: Show, name: string, author: string, picks: Picks): Library {
  return {
    format: 'lsgleam-library',
    version: 1,
    name,
    ...(author ? { author } : {}),
    fixtures: (show.profiles ?? []).filter((p) => picks.fixtures.includes(p.id)),
    designs: (show.designs ?? []).filter((d) => picks.designs.includes(d.id)),
    palettes: show.blocks.flatMap((b) => (b.kind === 'colors' && picks.palettes.includes(b.id) ? [{ name: b.name, steps: b.steps, rows: b.rows }] : [])),
    composites: show.blocks.filter((b) => b.kind === 'composite' && picks.composites.includes(b.id)).map((b) => clipOf(show, b.id)),
  }
}

export function setProfile(show: Show, profile: StoredProfile): Show {
  const old = show.profiles?.find((p) => p.id === profile.id)
  const profiles = old ? show.profiles!.map((p) => (p === old ? profile : p)) : [...(show.profiles ?? []), profile]
  setCustomProfiles(profiles)
  const next = compiledOf(profile)
  const users = show.blocks.filter(hasProfile).filter((b) => b.profile === profile.id)
  return users.reduce<Show>((s, b) => {
    const values = Object.fromEntries(next.attrs.map((a) => [a.key, b.values[a.key] ?? a.default]))
    return patchBlock(s, b.id, b.kind === 'fixture' ? { values, mode: next.modes.some((m) => m.name === b.mode) ? b.mode : next.modes[0].name } : { values })
  }, { ...show, profiles })
}

export const addDesign = (show: Show, design: TubeDesign): Show => ({ ...show, nextId: show.nextId + 1, designs: [...(show.designs ?? []), { ...design, id: `design${show.nextId}` }] })

export function addPalette(show: Show, palette: ColorPalette, tab: string | null, x: number, y: number): [Show, Block] {
  const [made, block] = newBlock(show, { kind: 'colors' }, x, y, tab)
  const next = patchBlock(made, block.id, { name: palette.name, steps: palette.steps, rows: palette.rows })
  return [next, next.blocks.find((b) => b.id === block.id)!]
}

export const rootOf = (clip: Clip) => clip.blocks.find((b) => !b.scene)!

export function addComposite(show: Show, clip: Clip, tab: string | null, x: number, y: number): [Show, string[]] {
  const [pasted, ids] = pasteBlocks(show, clip, tab)
  const named = (b: Block) => {
    const from = clip.blocks[ids.indexOf(b.id)]
    return from ? { ...b, name: from.name, ...(from === rootOf(clip) ? { x, y } : {}) } : b
  }
  return [{ ...pasted, blocks: pasted.blocks.map(named) }, ids]
}

export function savedLibraries(): Library[] {
  try {
    return listOf(JSON.parse(localStorage.getItem(STORE) ?? '[]'), 'libraries').map(parseLibrary)
  } catch {
    return []
  }
}

export function saveLibraries(libraries: Library[]) {
  try { localStorage.setItem(STORE, JSON.stringify(libraries)) } catch { /* private mode */ }
}
