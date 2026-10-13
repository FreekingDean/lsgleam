import { FIXTURES } from './fixtures'
import { KIND_INFO, LAYOUT, TYPE_COLORS, type PaletteItem, type TubeDesign } from './show'

type Props = { onAdd: (item: PaletteItem) => void; tab: string | null; composite: boolean; designs: TubeDesign[] }

type Category = { title: string; items: { label: string; item: PaletteItem }[] }

const TRANSFORMERS: Category = { title: 'Transformers', items: [{ label: 'Constant (test value / pulse)', item: { kind: 'constant' } }, { label: 'Level (RMS)', item: { kind: 'level' } }, { label: 'Gate (zero below X%)', item: { kind: 'gate' } }, { label: 'Steps (signal → index)', item: { kind: 'steps' } }, { label: 'Equals (index == N)', item: { kind: 'equals' } }, { label: 'Latch (set / reset)', item: { kind: 'latch' } }, { label: 'And (both signals)', item: { kind: 'and' } }, { label: 'Not (1 − signal)', item: { kind: 'not' } }, { label: 'Mix (crossfade a → b)', item: { kind: 'mix' } }, { label: 'Fade (rise / fall time)', item: { kind: 'fade' } }, { label: 'Counter (triggers → index)', item: { kind: 'counter' } }, { label: 'Pattern (fan-out)', item: { kind: 'pattern' } }, { label: 'Drop (kick + beat → drop)', item: { kind: 'drop' } }, { label: 'Hold (trigger → N beats)', item: { kind: 'hold' } }, { label: 'Range (signal × amount → window)', item: { kind: 'range' } }, { label: 'Sequence (trigger → values)', item: { kind: 'sequence' } }, { label: 'Looks (colour + window)', item: { kind: 'looks' } }, { label: 'Colours (index → named colours)', item: { kind: 'colors' } }, { label: 'Values (index → named numbers)', item: { kind: 'values' } }, { label: 'Composite (your own block)', item: { kind: 'composite' } }] }

const LAYOUT_PALETTE: Category[] = [
  { title: 'Space', items: [{ label: 'Box (room, stage, bar)', item: { kind: 'box' } }] },
  { title: 'DMX', items: [{ label: 'Art-Net / sACN node', item: { kind: 'artnet' } }, { label: 'DMX controller (faders in)', item: { kind: 'dmxin' } }] },
  { title: 'Audio', items: [{ label: 'Audio source (CDJ)', item: { kind: 'cdj' } }, { label: 'Audio input (interface)', item: { kind: 'audio' } }] },
  { title: 'Software', items: [{ label: 'Beat Link Trigger (OSC)', item: { kind: 'blt' } }, { label: 'AudioSlice (OSC)', item: { kind: 'audioslice' } }] },
  { title: 'Pixels', items: [{ label: 'LED tubes', item: { kind: 'tubeset' } }, { label: 'Pixel controller (Art-Net)', item: { kind: 'board' } }] },
  { title: 'Fixtures', items: FIXTURES.map((f) => ({ label: f.label, item: { kind: 'fixture', profile: f.id } })) },
]

const SHOW: Category[] = [
  { title: 'Scenes', items: [{ label: 'Scene', item: { kind: 'scene' } }, { label: 'Scene select (buttons / index)', item: { kind: 'manual' } }] },
  TRANSFORMERS,
]

const INPUTS: Category = { title: 'Inputs (from outside)', items: [
  { label: 'Signal (0–1: energy, fader, on/off)', item: { kind: 'input', type: 'signal' } },
  { label: 'Index (whole number: beat, song, step)', item: { kind: 'input', type: 'index' } },
  { label: 'Number (raw value: BPM, pitch)', item: { kind: 'input', type: 'number' } },
  { label: 'Colour (Red, Green, Blue)', item: { kind: 'input', type: 'color' } },
] }

const COMPOSITE: Category[] = [
  INPUTS,
  { title: 'Outputs (to outside)', items: [
    { label: 'Signal out', item: { kind: 'output', type: 'signal' } },
    { label: 'Index out', item: { kind: 'output', type: 'index' } },
    { label: 'Number out', item: { kind: 'output', type: 'number' } },
    { label: 'Colour out', item: { kind: 'output', type: 'color' } },
  ] },
  TRANSFORMERS,
]

const SCENE: Category[] = [
  { title: 'Inputs (from the show)', items: [
    { label: 'Signal (0–1: energy, fader, on/off)', item: { kind: 'input', type: 'signal' } },
    { label: 'Index (whole number: beat, song, step)', item: { kind: 'input', type: 'index' } },
    { label: 'Audio (raw sound, for Level)', item: { kind: 'input', type: 'audio' } },
    { label: 'Number (raw value: BPM, pitch)', item: { kind: 'input', type: 'number' } },
    { label: 'Colour (Red, Green, Blue)', item: { kind: 'input', type: 'color' } },
  ] },
  { title: 'Outputs', items: [...FIXTURES.flatMap((f) => [{ label: `${f.label} out`, item: { kind: 'light', profile: f.id } as PaletteItem }, { label: `${f.label} group out`, item: { kind: 'group', profile: f.id } as PaletteItem }]), { label: 'Pixel out (LED tubes)', item: { kind: 'strip' } }] },
  TRANSFORMERS,
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
      title={`${KIND_INFO[item.kind]} · drag onto the canvas, or double-click`}
    >
      {label}
    </div>
  )
}

export function Palette({ onAdd, tab, composite, designs }: Props) {
  const saved: Category = { title: 'Saved tube designs', items: designs.map((d) => ({ label: d.name, item: { kind: 'tubeset', design: d.id } })) }
  const categories = tab === LAYOUT ? [...LAYOUT_PALETTE, ...(designs.length ? [saved] : [])] : tab === null ? SHOW : composite ? COMPOSITE : SCENE
  return (
    <aside className="palette">
      {categories.map((c) => (
        <section key={c.title}>
          <h3>{c.title}</h3>
          {c.items.map((i) => <Item key={i.label} item={i.item} label={i.label} onAdd={onAdd} />)}
        </section>
      ))}
    </aside>
  )
}
