import type { Bridge } from './bridge'
import type { PortValues } from '../editor/live'
import { INPUTS_ID, OUTPUTS_ID, SENDER_KINDS, membersOf, scenesOf, SELECTOR_ID, type AudioSliceBlock, type Block, type Show, type StripBlock } from '../model/show'
import { selectorSources, sourcesOf } from '../model/patch'
import { PORTS } from '../model/ports'
import { tubeGeometry } from '../model/geometry'
import { j, PRELUDE } from './prelude'
import VISUALISER from './visualiser.py?raw'
import { AUDIOSLICE_BEAT_STEMS, AUDIOSLICE_STEMS, AUDIOSLICE_STREAMS, audioSliceAlpha, audioSlicePath, defOf, hasDef, stripConfig } from '../blocks'
import { TINTS, showDir, inputsDir, outputsDir, spotOf, placed, railCode } from './tree'

export type DmxValues = Record<string, number[]>

export { colorTable, valueTable } from '../blocks'

export class Td {
  private bridge: Bridge

  constructor(bridge: Bridge) {
    this.bridge = bridge
  }

  private run<T>(code: string): Promise<T> {
    return this.bridge.eval<T>(`${PRELUDE}\n${code}`)
  }

  loadShow() {
    return this.run<Show | null>(`
d = ROOT.op(SHOW_DAT)
result = json.loads(d.text) if d and d.text.strip() else None
`)
  }

  saveShow(show: Show) {
    return this.run<null>(`
d = ROOT.op(SHOW_DAT) or ROOT.create(textDAT, SHOW_DAT)
d.nodeX, d.nodeY = -400, 0
d.text = ${JSON.stringify(JSON.stringify(show, null, 2))}
`)
  }

  existing() {
    return this.run<string[]>(`result = [c.name for c in LS.findChildren(tags=['lsgleam'])]`)
  }

  legacy() {
    return this.run<number>(`
old = [c for c in ROOT.children if 'lsgleam' in c.tags]
if LS.storage.get('tree') != 2:
    old += LS.children
    LS.store('tree', 2)
for c in old:
    c.destroy()
result = len(old)
`)
  }

  audioDevices() {
    return this.run<[string, string][]>(`
probe = ROOT.create(audiodeviceinCHOP, 'lsgleam_probe')
result = list(zip(probe.par.device.menuNames, probe.par.device.menuLabels))
probe.destroy()
`)
  }

  private buildCode(show: Show, block: Block): string | null {
    if (block.kind === 'scene' || block.kind === 'composite' || block.kind === 'cdj' || block.kind === 'box' || block.kind === 'tubeset') return null
    const sources = j(sourcesOf(show, block.id))
    const b = placed(show, block)
    const copy = show.visualiser && SENDER_KINDS.includes(block.kind) ? `\n${VISUALISER}\nvisualise(${JSON.stringify(block.id)}, ${JSON.stringify(show.visualiser)})` : ''
    if (hasDef(block)) return `${defOf(block).builder ?? `build_${block.kind}`}(${[j(b), ...(defOf(block).lead?.(block, show) ?? []).map(j), sources, ...(defOf(block).args?.(block, show, PORTS) ?? []).map(j)].join(', ')})${copy}`
    return `build_tube(${j(b)}, ${sources}, ${j(tubeGeometry(show, block))})`
  }

  private selectorCode(show: Show) {
    const scenes = scenesOf(show)
    return `build_selector(${j({ id: SELECTOR_ID, name: 'scene selector', x: -400, y: -300, w: 160, h: 130, _dirs: [showDir(show)], _tint: TINTS.logic })}, ${scenes.length}, ${j(scenes.map((s) => [s.fadeIn, s.fadeOut]))}, ${j(selectorSources(show).flat())})`
  }

  build(show: Show, block: Block) {
    return this.buildAll(show, [block.id])
  }

  buildSelector(show: Show) {
    return this.buildAll(show, [SELECTOR_ID])
  }

  async buildAll(show: Show, ids: string[]) {
    for (const id of new Set(ids.flatMap((id) => [id, ...membersOf(show, id).map((t) => t.id).filter((t) => !ids.includes(t))]))) {
      const block = show.blocks.find((b) => b.id === id)
      const code = id === SELECTOR_ID ? this.selectorCode(show) : block ? this.buildCode(show, block) : null
      if (code) await this.run<null>(`${railCode(show)}\n${code}`)
    }
    return this.place(show, [INPUTS_ID, OUTPUTS_ID])
  }

  place(show: Show, ids: string[]) {
    return this.run<null>(ids.map((id) => {
      if (id === INPUTS_ID) return `ensure(${j([showDir(show), inputsDir(show)])})`
      if (id === OUTPUTS_ID) return `ensure(${j([showDir(show), outputsDir(show)])})`
      const b = show.blocks.find((x) => x.id === id)
      return b ? `put(${JSON.stringify(id)}, ${j(spotOf(show, b))})` : ''
    }).join('\n'))
  }

  setColors(id: string, table: [string, number][][]) {
    return this.run<null>(`
c = find(${JSON.stringify(id)})
for k, pairs in enumerate(${j(table)}):
    o = c.op('step%d' % (k + 1))
    if o:
        for i, (name, v) in enumerate(pairs):
            o.par['const%dvalue' % i] = v
`)
  }

  setStrip(block: StripBlock) {
    return this.run<null>(`set_strip(find(${JSON.stringify(block.id)}), ${j(stripConfig(block))})`)
  }

  resetPattern(id: string) {
    return this.run<null>(`
o = find(${JSON.stringify(id)}).op('mask_count')
if o:
    o.par.resetpulse.pulse()
`)
  }

  setConstant(id: string, value: number) {
    return this.run<null>(`find(${JSON.stringify(id)}).op('values').par.const0value = ${value}`)
  }

  setManual(id: string, active: number, count: number) {
    return this.run<null>(`
for k in range(${count}):
    find(${JSON.stringify(id)}).op('values').par['const%dvalue' % k] = 1 if k == ${active} else 0
`)
  }

  destroy(ids: string[]) {
    return this.run<null>(`
gone = set(${j(ids)})
for o in LS.findChildren(tags=['lsgleam']) + LS.findChildren(tags=['lsgleam_dir']) + LS.findChildren(tags=['lsgleam_wire']):
    if o.valid and (o.name in gone and 'lsgleam_wire' not in o.tags or gone & set(o.storage.get('ids', []))):
        o.destroy()
`)
  }

  move(id: string, x: number, y: number) {
    return this.run<null>(`
o = find(${JSON.stringify(id)}) or find_dir(${JSON.stringify(id)})
if o:
    o.nodeX, o.nodeY = ${x}, ${y}
    tidy(o.parent())
`)
  }

  setValue(id: string, index: number, value: number, prefixes: string[], channel: string) {
    return this.run<null>(`
root = find(${JSON.stringify(id)})
for p in ${j(prefixes)}:
    o = root.op(p + 'values')
    if o:
        o.par['const${index}value'] = ${value}
for o in root.ops('default_*', 'dim_values'):
    for i in range(o.seq.const.numBlocks):
        if o.par['const%dname' % i].eval() == ${JSON.stringify(channel)}:
            o.par['const%dvalue' % i] = ${value}
`)
  }

  configureAudioSlice(b: AudioSliceBlock) {
    const mods = b.signals.map((sig) => {
      const [stem, stream] = sig.split('/')
      const hit = stream === 'onset' || AUDIOSLICE_BEAT_STEMS.includes(stem)
      const envelope = hit ? { envEnable: true, useTempo: true, envAttackNoteDuration: 0, envSustainNoteDuration: 0, envReleaseNoteDuration: stream === 'onset' ? 4 : 6, envRetrigger: true, switchMode: false, outputType: 0 } : {}
      return { path: audioSlicePath(sig), sourceIndex: AUDIOSLICE_STEMS.indexOf(stem), stemMode: AUDIOSLICE_STREAMS[stream], enabled: true, name: sig, alpha: audioSliceAlpha(b.smoothing), ...envelope }
    })
    return this.run<string>(`
import time
import urllib.request

BASE = 'http://127.0.0.1:%d/api/v1' % ${b.apiPort}
TOKEN = ${JSON.stringify(b.token)}

def api(method, path, body=None):
    headers = {'content-type': 'application/json'}
    if TOKEN:
        headers['authorization'] = 'Bearer ' + TOKEN
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, method=method, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=5) as r:
        text = r.read().decode()
    time.sleep(0.12 if method != 'GET' else 0)
    return json.loads(text) if text else {}

name = 'lsgleam ' + ${JSON.stringify(b.id)}
outputs = api('GET', '/outputs')
outputs = outputs.get('outputs', outputs) if isinstance(outputs, dict) else outputs
for o in (outputs.values() if isinstance(outputs, dict) else outputs):
    if o.get('name') == name:
        api('DELETE', '/outputs/%s' % o['id'])
group = api('POST', '/outputs', {'protocol': 0, 'name': name, 'ipAddress': '127.0.0.1', 'port': ${b.port}, 'sendInterval': 11})
for m in ${j(mods)}:
    api('POST', '/outputs/%s/modulators' % group['id'], m)
result = 'AudioSlice output "%s" -> 127.0.0.1:%d with %d modulators' % (name, ${b.port}, ${mods.length})
`)
  }

  private read<T>(code: string): Promise<T> {
    return this.bridge.eval<T>(`LS = op('/project1/lsgleam')\n${code}`)
  }

  readDmx() {
    return this.read<DmxValues>(`
result = {}
for c in (LS.op('layout').children if LS and LS.op('layout') else []):
    for p in c.ops('patch_u*'):
        if not p.isCHOP:
            continue
        result[c.name + ':' + p.name[7:]] = p.numpyArray()[:, 0].round().astype(int).tolist() if p.numChans else []
    d = c.op('dmxout')
    if d:
        for i, row in enumerate(d.numpyArray().round().astype(int).tolist()):
            result['%s:%d' % (c.name, d.par.universe.eval() + i)] = row
`)
  }

  readPorts(ids: string[]) {
    return this.read<PortValues>(`
result = {}
found = {c.name: c for c in LS.findChildren(tags=['lsgleam'])} if LS else {}
for name in ${JSON.stringify(ids)}:
    c = found.get(name)
    if c is None:
        continue
    try:
        o = c.op('out1')
        if o:
            result[c.name] = {ch.name: ch.eval() for ch in o.chans()}
    except Exception:
        pass
`)
  }

  readValues(id: string, names: string[], prefix: string) {
    return this.run<Record<string, number>>(`
live = find(${JSON.stringify(id)}).op('out1')
result = {n: live[${JSON.stringify(prefix)} + n].eval() for n in ${j(names)}}
`)
  }
}
