import { useState } from 'react'
import type { FixtureProfile } from '../model/fixtures'
import { TYPE_COLORS } from '../model/catalog'
import { BLOCKS, blockDef, kindInfo, type DefKind } from '../blocks'
import { LAYOUT, type PaletteItem, type TubeDesign } from '../model/show'

type Props = { onAdd: (item: PaletteItem) => void; tab: string | null; composite: boolean; designs: TubeDesign[]; profiles: FixtureProfile[]; onNewProfile: () => void }

type Category = { title: string; items: { label: string; item: PaletteItem }[] }
type Tab = { title: string; sections: Category[] }

const defined = (kind: DefKind) => ({ label: BLOCKS[kind].label, item: { kind } as PaletteItem })

const TRANSFORMERS: Category = { title: 'Transformers', items: [defined('constant'), defined('level'), defined('gate'), defined('steps'), defined('equals'), defined('latch'), defined('and'), defined('not'), defined('mix'), defined('fade'), defined('counter'), defined('timer'), defined('combine'), defined('split'), defined('pattern'), defined('drop'), defined('hold'), defined('range'), defined('sequence'), defined('looks'), defined('colors'), defined('values'), { label: 'Composite (your own block)', item: { kind: 'composite' } }] }

const OPERATORS: Record<string, string> = {
  composite: 'Math',
}

const OPERATOR_TABS: Tab[] = ['Logic', 'Math', 'Time'].map((title) => ({ title, sections: [{ title, items: TRANSFORMERS.items.filter((i) => (OPERATORS[i.item.kind] ?? blockDef(i.item.kind)?.tab) === title) }] }))

const HARDWARE: Category[] = [
  { title: 'Space', items: [defined('box')] },
  { title: 'DMX', items: [defined('artnet'), defined('dmxin')] },
  { title: 'Audio', items: [defined('cdj'), defined('audio')] },
  { title: 'Software', items: [defined('blt'), defined('audioslice')] },
]

const PIXELS: Category = { title: 'Pixels', items: [{ label: 'LED tubes', item: { kind: 'tubeset' } }, { label: 'Pixel controller (Art-Net)', item: { kind: 'board' } }] }

const SHOW: Tab[] = [
  { title: 'Scenes', sections: [{ title: 'Scenes', items: [{ label: 'Scene', item: { kind: 'scene' } }, { label: 'Scene select (buttons / index)', item: { kind: 'manual' } }] }] },
  ...OPERATOR_TABS,
]

const INPUTS: Category = { title: 'Inputs (from outside)', items: [
  { label: 'Signal (0–1: energy, fader, on/off)', item: { kind: 'input', type: 'signal' } },
  { label: 'Index (whole number: beat, song, step)', item: { kind: 'input', type: 'index' } },
  { label: 'Number (raw value: BPM, pitch)', item: { kind: 'input', type: 'number' } },
  { label: 'Colour (Red, Green, Blue)', item: { kind: 'input', type: 'color' } },
  { label: 'Multichannel (several signals on one wire)', item: { kind: 'input', type: 'multi' } },
] }

const COMPOSITE: Tab[] = [
  { title: 'Inputs', sections: [INPUTS] },
  { title: 'Outputs', sections: [{ title: 'Outputs (to outside)', items: [
    { label: 'Signal out', item: { kind: 'output', type: 'signal' } },
    { label: 'Index out', item: { kind: 'output', type: 'index' } },
    { label: 'Number out', item: { kind: 'output', type: 'number' } },
    { label: 'Colour out', item: { kind: 'output', type: 'color' } },
    { label: 'Multichannel out', item: { kind: 'output', type: 'multi' } },
  ] }] },
  ...OPERATOR_TABS,
]

const scene = (profiles: FixtureProfile[]): Tab[] => [
  { title: 'Inputs', sections: [{ title: 'Inputs (from the show)', items: [
    { label: 'Signal (0–1: energy, fader, on/off)', item: { kind: 'input', type: 'signal' } },
    { label: 'Index (whole number: beat, song, step)', item: { kind: 'input', type: 'index' } },
    { label: 'Audio (raw sound, for Level)', item: { kind: 'input', type: 'audio' } },
    { label: 'Number (raw value: BPM, pitch)', item: { kind: 'input', type: 'number' } },
    { label: 'Colour (Red, Green, Blue)', item: { kind: 'input', type: 'color' } },
    { label: 'Multichannel (several signals on one wire)', item: { kind: 'input', type: 'multi' } },
  ] }] },
  { title: 'Outputs', sections: [{ title: 'Outputs', items: [...profiles.flatMap((f) => [{ label: `${f.label} out`, item: { kind: 'light', profile: f.id } as PaletteItem }, { label: `${f.label} group out`, item: { kind: 'group', profile: f.id } as PaletteItem }]), { label: 'Pixel out (LED tubes)', item: { kind: 'strip' } }] }] },
  ...OPERATOR_TABS,
]

function Item({ item, label, onAdd }: { item: PaletteItem; label: string; onAdd: Props['onAdd'] }) {
  return (
    <div
      className={`palette-item ${item.kind}`}
      style={item.kind === 'input' && item.type ? { borderLeftColor: TYPE_COLORS[item.type] } : undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/lsgleam', JSON.stringify(item))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDoubleClick={() => onAdd(item)}
      title={`${kindInfo(item.kind)} · drag onto the canvas, or double-click`}
    >
      {label}
    </div>
  )
}

export function Palette({ onAdd, tab, composite, designs, profiles, onNewProfile }: Props) {
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const saved: Category = { title: 'Saved tube designs', items: designs.map((d) => ({ label: d.name, item: { kind: 'tubeset', design: d.id } })) }
  const fixtures: Category = { title: 'Fixtures', items: profiles.map((f) => ({ label: f.label, item: { kind: 'fixture', profile: f.id } })) }
  const layout: Tab[] = [{ title: 'Hardware', sections: HARDWARE }, { title: 'Pixels', sections: [PIXELS, ...(designs.length ? [saved] : [])] }, { title: 'Fixtures', sections: [fixtures] }]
  const editor = tab === LAYOUT ? 'layout' : tab === null ? 'show' : composite ? 'composite' : 'scene'
  const tabs = editor === 'layout' ? layout : editor === 'show' ? SHOW : editor === 'composite' ? COMPOSITE : scene(profiles)
  const current = tabs.find((t) => t.title === picked[editor]) ?? tabs[0]
  const q = query.trim().toLowerCase()
  const sections = q ? tabs.map((t) => ({ title: t.title, items: t.sections.flatMap((c) => c.items).filter((i) => i.label.toLowerCase().includes(q)) })).filter((c) => c.items.length) : current.sections
  const pick = (title: string) => {
    setPicked({ ...picked, [editor]: title })
    setQuery('')
  }
  return (
    <aside className="palette">
      <input className="palette-search" type="search" placeholder="Search blocks" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQuery('')} />
      <div className="palette-tabs">
        {tabs.map((t) => <button key={t.title} className={!q && t === current ? 'on' : undefined} onClick={() => pick(t.title)}>{t.title}</button>)}
      </div>
      {q && !sections.length && <p className="palette-empty">No blocks match</p>}
      {sections.map((c) => (
        <section key={c.title}>
          {(q || sections.length > 1) && <h3>{c.title}</h3>}
          {c.items.map((i) => <Item key={i.label} item={i.item} label={i.label} onAdd={onAdd} />)}
          {c === fixtures && <button className="palette-new" onClick={onNewProfile}>+ new fixture profile</button>}
        </section>
      ))}
    </aside>
  )
}
