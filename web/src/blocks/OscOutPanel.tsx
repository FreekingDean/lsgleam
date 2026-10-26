import { Field, NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import type { OscOutBlock } from './oscout'

export function OscOutPanel({ block, onPatch }: Props & { block: OscOutBlock }) {
  return (
    <>
      <Field key={block.address} label="Address" value={block.address} onCommit={(address) => onPatch({ address: `/${address.trim().replace(/^\/+/, '')}` })} />
      <Field key={block.host} label="Host" value={block.host} onCommit={(host) => onPatch({ host: host.trim() || '127.0.0.1' })} />
      <NumField label="Port" value={block.port} onCommit={(port) => onPatch({ port: Math.round(port) })} step={1} />
      <NumField label="Scale" value={block.scale} onCommit={(scale) => onPatch({ scale })} />
      <NumField label="Glide (s)" value={block.glide ?? 0} onCommit={(glide) => onPatch({ glide: Math.max(0, glide) })} />
      <div className="help">Sends value × scale to host:port at the address whenever it changes. MadMapper listens on port 8010: use its OSC learn on the parameter, then send this address. Glide eases between values over about that many seconds, sending the fractions in between. For an index 0–3 turning a compass, scale 90 gives 0, 90, 180, 270 degrees.</div>
    </>
  )
}
