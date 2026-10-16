import { NumField } from '../panels/fields'
import type { Props } from '../panels/shared'
import { controllerPatch, type DmxInBlock } from './dmxin'

export function DmxInPanel({ show, block, onPatch }: Props & { block: DmxInBlock }) {
  const patch = controllerPatch(show, block.id)
  const node = show.blocks.find((b) => b.id === patch?.node)
  return (
    <>
      <NumField label="Faders" value={block.channels} onCommit={(v) => onPatch({ channels: Math.max(1, Math.min(512, Math.round(v))) })} step={1} />
      <div className="help">{patch ? `Listening on ${node?.name ?? patch.node} U${patch.universe}.` : 'Not cabled.'} Cable its DMX out into an Art-Net node's input universe on the layout tab. Its faders (channels 1…N) appear on the show tab's Inputs node, ready to override scene select, drop mode and the like.</div>
    </>
  )
}

