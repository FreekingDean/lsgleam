import { useEffect, useState, type ReactNode } from 'react'
import { download } from '../td/blt'
import { compiledOf, type StoredProfile } from '../model/fixtures'
import { buildLibrary, parseLibrary, profileError, rootOf, saveLibraries, savedLibraries, type ColorPalette, type Library, type Picks } from '../model/library'
import type { Clip } from '../model/edit'
import type { Show, TubeDesign } from '../model/show'

type Props = {
  show: Show
  onFixture: (profile: StoredProfile) => void
  onDesign: (design: TubeDesign) => void
  onPalette: (palette: ColorPalette) => void
  onComposite: (clip: Clip) => void
  onEditProfile: (profile: StoredProfile | null) => void
  onClose: () => void
}

const profileDetail = (p: StoredProfile) => {
  const c = compiledOf(p)
  return `${c.modes.map((m) => m.channels.length).join('/')} ch · ${c.sim.kind === 'head' ? 'moving head' : c.sim.kind === 'bar' ? 'bar' : 'PAR'}`
}

const NO_PICKS: Picks = { fixtures: [], designs: [], palettes: [], composites: [] }

function Swatches({ palette }: { palette: ColorPalette }) {
  return <span className="library-swatches">{palette.rows[0].colors.slice(0, palette.steps).map((c, i) => <span key={i} style={{ background: c.hex }} />)}</span>
}

function Item({ label, detail, onUse }: { label: ReactNode; detail: string; onUse: () => void }) {
  return (
    <div className="library-item">
      <span>{label}</span>
      <span className="library-detail">{detail}</span>
      <button onClick={onUse}>use</button>
    </div>
  )
}

function Pick({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return <label className="library-pick"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
}

type OflIndex = { commit: string; manufacturers: Record<string, string>; fixtures: [string, string, string, string[], [string, number][]][] }

function OpenFixtureLibrary({ onPick }: { onPick: (profile: StoredProfile) => void }) {
  const [index, setIndex] = useState<OflIndex | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const open = () => fetch('./ofl/index.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`)))).then(setIndex).catch((e: Error) => setError(e.message))
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const hits = index && words.length ? index.fixtures.filter(([man, , name, cats]) => words.every((w) => `${index.manufacturers[man] ?? man} ${name} ${cats.join(' ')}`.toLowerCase().includes(w))).slice(0, 40) : []
  const pick = (man: string, key: string) => fetch(`./ofl/${man}/${key}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`)))).then((fixture) => {
    const profile = { id: `${man}-${key}`, fixture }
    const problem = profileError(profile)
    if (problem) throw new Error(`${fixture.name}: ${problem}`)
    onPick(profile)
  }).catch((e: Error) => setError(e.message))
  return (
    <section className="library-lib">
      <div className="library-title">
        <h3>Open Fixture Library</h3>
        {!index && <button onClick={open}>search</button>}
      </div>
      {index && <input className="ofl-search" value={query} placeholder={`search ${index.fixtures.length} fixtures: maker, model or type`} onChange={(e) => setQuery(e.target.value)} />}
      {error && <div className="error">{error}</div>}
      {hits.map(([man, key, name, , modes]) => <Item key={`${man}/${key}`} label={`${index!.manufacturers[man] ?? man} ${name}`} detail={modes.map(([, n]) => `${n} ch`).filter((x, i, all) => all.indexOf(x) === i).join(' / ')} onUse={() => pick(man, key)} />)}
      {index && <div className="help">From open-fixture-library.org (MIT), pinned at {index.commit.slice(0, 7)}. Using a fixture copies its profile into this show.</div>}
    </section>
  )
}

export function LibraryView({ show, onFixture, onDesign, onPalette, onComposite, onEditProfile, onClose }: Props) {
  const [libraries, setLibraries] = useState(savedLibraries)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [name, setName] = useState('My library')
  const [author, setAuthor] = useState('')
  const [picks, setPicks] = useState(NO_PICKS)
  const colors = show.blocks.filter((b) => b.kind === 'colors')
  const composites = show.blocks.filter((b) => b.kind === 'composite')
  const picked = Object.values(picks).some((ids) => ids.length)

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  const keep = (raw: unknown) => {
    const lib = parseLibrary(raw)
    const next = [...libraries.filter((l) => l.name !== lib.name), lib]
    setLibraries(next)
    saveLibraries(next)
    setError('')
    setNote(`Imported ${lib.name}`)
  }
  const fail = (e: Error) => { setNote(''); setError(e.message) }
  const fromFile = (file: File) => file.text().then((text) => keep(JSON.parse(text))).catch(fail)
  const fromUrl = () => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`)))).then(keep).catch((e: Error) => fail(new Error(`${url}: ${e.message}`)))
  const forget = (lib: Library) => {
    const next = libraries.filter((l) => l !== lib)
    setLibraries(next)
    saveLibraries(next)
  }
  const use = (what: string, act: () => void) => { act(); setError(''); setNote(`Added ${what} to the show`) }
  const toggle = (kind: keyof Picks, id: string, on: boolean) => setPicks((p) => ({ ...p, [kind]: on ? [...p[kind], id] : p[kind].filter((x) => x !== id) }))
  const exportLibrary = () => download(`${name.trim().replace(/[^\w.-]+/g, '-') || 'library'}.lsgleam.json`, JSON.stringify(buildLibrary(show, name.trim(), author.trim(), picks), null, 2))

  return (
    <div className="modal">
      <div className="designer library">
        <div className="palette-main">
          {!libraries.length && <div className="help">No libraries yet. Import a .lsgleam.json file or a URL (a GitHub raw link or a gist) on the right; imported libraries stay in this browser for every show.</div>}
          <OpenFixtureLibrary onPick={(p) => use(p.fixture.name, () => onFixture(p))} />
          {libraries.map((lib) => (
            <section key={lib.name} className="library-lib">
              <div className="library-title">
                <h3>{lib.name}{lib.author && <span className="library-detail"> by {lib.author}</span>}</h3>
                <button onClick={() => forget(lib)} title="remove from this browser">remove</button>
              </div>
              {!!lib.fixtures.length && <h4>Fixture profiles</h4>}
              {lib.fixtures.map((f) => <Item key={f.id} label={f.fixture.name} detail={profileDetail(f)} onUse={() => use(f.fixture.name, () => onFixture(f))} />)}
              {!!lib.designs.length && <h4>Tube designs</h4>}
              {lib.designs.map((d) => <Item key={d.id} label={d.name} detail={`${d.tubes.length} tube${d.tubes.length === 1 ? '' : 's'}`} onUse={() => use(d.name, () => onDesign(d))} />)}
              {!!lib.palettes.length && <h4>Colour palettes</h4>}
              {lib.palettes.map((p, i) => <Item key={i} label={<>{p.name} <Swatches palette={p} /></>} detail={`${p.rows.length} row${p.rows.length === 1 ? '' : 's'} × ${p.steps}`} onUse={() => use(p.name, () => onPalette(p))} />)}
              {!!lib.composites.length && <h4>Composites</h4>}
              {lib.composites.map((c, i) => <Item key={i} label={rootOf(c).name} detail={`${c.blocks.length - 1} blocks inside`} onUse={() => use(rootOf(c).name, () => onComposite(c))} />)}
            </section>
          ))}
        </div>
        <aside className="designer-side pars">
          <h2>Libraries</h2>
          <h4>Import</h4>
          <div className="par"><label>File</label><label className="file-button"><input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) fromFile(f); e.target.value = '' }} />choose file…</label></div>
          <div className="par"><label>URL</label><input value={url} placeholder="https://…/my.lsgleam.json" onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && url && fromUrl()} /></div>
          <div className="par"><label /><button disabled={!url} onClick={fromUrl}>import URL</button></div>
          {error && <div className="error">{error}</div>}
          {note && <div className="help">{note}</div>}
          <hr />
          <h4>This show's fixture profiles</h4>
          {(show.profiles ?? []).map((p) => <div key={p.id} className="library-item"><span>{p.fixture.name}</span><span className="library-detail">{p.id}</span><button onClick={() => onEditProfile(p)}>edit</button></div>)}
          <button onClick={() => onEditProfile(null)}>+ new fixture profile</button>
          <hr />
          <h4>Export a library</h4>
          <div className="par"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="par"><label>Author</label><input value={author} placeholder="optional" onChange={(e) => setAuthor(e.target.value)} /></div>
          {!!show.profiles?.length && <h5>Fixture profiles</h5>}
          {show.profiles?.map((p) => <Pick key={p.id} label={p.fixture.name} on={picks.fixtures.includes(p.id)} onChange={(on) => toggle('fixtures', p.id, on)} />)}
          {!!show.designs?.length && <h5>Tube designs</h5>}
          {show.designs?.map((d) => <Pick key={d.id} label={d.name} on={picks.designs.includes(d.id)} onChange={(on) => toggle('designs', d.id, on)} />)}
          {!!colors.length && <h5>Colour palettes</h5>}
          {colors.map((b) => <Pick key={b.id} label={b.name} on={picks.palettes.includes(b.id)} onChange={(on) => toggle('palettes', b.id, on)} />)}
          {!!composites.length && <h5>Composites</h5>}
          {composites.map((b) => <Pick key={b.id} label={b.name} on={picks.composites.includes(b.id)} onChange={(on) => toggle('composites', b.id, on)} />)}
          <div className="designer-actions">
            <button onClick={onClose}>close</button>
            <button className="on" disabled={!picked || !name.trim()} onClick={exportLibrary}>export library</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
