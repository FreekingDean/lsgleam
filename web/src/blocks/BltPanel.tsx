import { NumField } from '../panels/fields'
import { bltConfig, bltExpressions, download } from '../td/blt'
import { type Props, SignalPicker } from '../panels/shared'
import { BLT_SIGNALS, type BltBlock } from './blt'

export function BltPanel({ block, onPatch }: Props & { block: BltBlock }) {
  return (
    <>
      <NumField label="OSC port" value={block.port} onCommit={(v) => onPatch({ port: Math.round(v) })} step={1} />
      <NumField label="Decks" value={block.decks} onCommit={(v) => onPatch({ decks: Math.max(1, Math.min(4, Math.round(v))) })} step={1} />
      <div className="par">
        <label>Master</label>
        <input type="checkbox" checked={block.master} onChange={(e) => onPatch({ master: e.target.checked })} />
      </div>
      <SignalPicker groups={[{ title: 'signals per deck', ids: BLT_SIGNALS.map((s) => s.id) }]} selected={block.signals} onChange={(signals) => onPatch({ signals })} />
      <div className="par">
        <label>Songs</label>
        <textarea rows={4} placeholder="one title per line" defaultValue={block.songs.join('\n')} onBlur={(e) => onPatch({ songs: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
      </div>
      <div className="par">
        <label />
        <button onClick={() => download(`lsgleam-${block.id}.blt`, bltConfig(block))}>download BLT config</button>
      </div>
      <div className="help">
        Load that file in Beat Link Trigger (Triggers window → File → Load), or start it with <code>-c lsgleam-{block.id}.blt</code>. It holds one Custom trigger per deck (and one watching the Master Player, sending /blt/master/…) plus the OSC client setup. Re-download after changing the port, decks or songs. To do it by hand instead, the expressions are:
        <pre>{Object.entries(bltExpressions(block)).map(([k, v]) => `${k}:\n${v}`).join('\n\n')}</pre>
      </div>
    </>
  )
}

