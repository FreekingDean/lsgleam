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
      <div className="help">Sends value × scale to host:port at the address whenever it changes. MadMapper listens on port 8010: use its OSC learn on the parameter, then send this address. For a season index 0–3 turning a compass, scale 0.25 gives 0, 0.25, 0.5, 0.75 of a turn.</div>
    </>
  )
}
