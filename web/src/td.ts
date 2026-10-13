import type { Bridge } from './bridge'
import type { PortValues } from './live'
import { railSpot, unitSpot, type Spot } from './spots'
import { INPUTS_ID, NODE_H, NODE_W, OUTPUTS_ID, RAIL_SEP, SOURCE_KINDS, type Kind, inputPorts, inputRail, outputPorts, outputRail, unitsOf, AUDIOSLICE_BEAT_STEMS, AUDIOSLICE_STEMS, AUDIOSLICE_STREAMS, BLT_SIGNALS, audioSliceAlpha, combineSlots, WIDE_TYPES, audioSlicePath, boardPlan, controllerPatch, hexToRgb, membersOf, ownersOf, tubeGeometry, patternMasks, profileOf, scenesOf, selectorSources, sequenceValues, sourcesOf, SELECTOR_ID, type ArtnetBlock, type AudioSliceBlock, type Block, type ColorsBlock, type Show, type StripBlock, type TubeBlock, type ValuesBlock } from './show'

export type DmxValues = Record<string, number[]>

const j = (v: unknown) => `json.loads(${JSON.stringify(JSON.stringify(v))})`

const BLT_INDEXED = BLT_SIGNALS.filter((s) => s.type === 'index').map((s) => s.id)

const STRIP_CODE = `
def onCook(scriptOp):
    cfg = scriptOp.fetch('cfg')
    wired = {i.name[2:]: i for i in scriptOp.inputs}
    def num(name, default):
        p = wired.get(name)
        return p[0][0] if p is not None and p.numChans else default
    def rgb(name, default):
        p = wired.get(name)
        return [p[k][0] for k in range(3)] if p is not None and p.numChans >= 3 else default
    dim = num('dimmer', cfg['dimmer'])
    color = [v * dim for v in rgb('color', cfg['rgb'])]
    phase = scriptOp.fetch('phase', 0.0)
    if cfg['mode'] in ('chase', 'ramp'):
        phase = (phase + absTime.stepSeconds * num('speed', cfg['speed'])) % 1.0
        scriptOp.store('phase', phase)
    pos = (num('position', cfg['position']) + phase) % 1.0 if cfg['mode'] in ('chase', 'ramp') else num('position', cfg['position'])
    scriptOp.clear()
    for n, v in (('Red', color[0]), ('Green', color[1]), ('Blue', color[2]), ('pos', pos), ('width', num('width', cfg['width'])), ('spread', num('spread', cfg['spread']))):
        scriptOp.appendChan(n)[0] = v
    stops = sorted((num('at%d' % k, at), rgb('stop%d' % k, c)) for k, (at, c) in enumerate(cfg['stops']))
    for k, (at, c) in enumerate(stops):
        scriptOp.appendChan('s%d' % k)[0] = at
        for n, v in zip(('r', 'g', 'b'), c):
            scriptOp.appendChan('%s%d' % (n, k))[0] = v * dim
    return
`

const TUBE_CODE = `
import numpy as np

def onCook(scriptOp):
    cfg = scriptOp.fetch('cfg')
    n = cfg['n']
    coords = {'tube': (np.arange(n) + 0.5) / n, 'height': np.array(cfg['height']), 'distance': np.array(cfg['distance'])}
    share = cfg['index'] / max(cfg['count'], 1)
    weights = None
    for i, src in enumerate(cfg['sources']):
        if src['mode'] is None and i < len(scriptOp.inputs):
            weights = scriptOp.inputs[i]
    total = np.zeros((3, n))
    wsum = 0.0
    for i, src in enumerate(cfg['sources']):
        mode = src['mode']
        if mode is None or i >= len(scriptOp.inputs):
            continue
        p = scriptOp.inputs[i]
        val = lambda k, d: p[k][0] if p[k] is not None else d
        u = coords.get(src.get('along') or 'tube', coords['tube'])
        pos = val('pos', 0.5) + val('spread', 0) * share
        if mode != 'fill':
            pos = pos % 1.0
        width = max(val('width', 0.2), 0.001)
        w = 1.0
        if weights is not None and weights['w%d' % src['scene']] is not None:
            w = weights['w%d' % src['scene']][0]
        if mode == 'ramp':
            k = 0
            while p['s%d' % k] is not None:
                k += 1
            at = np.array([p['s%d' % i][0] for i in range(k)])
            x = (u - pos) % 1.0
            total += w * np.stack([np.interp(x, at, [p['%s%d' % (ch, i)][0] for i in range(k)]) for ch in 'rgb']) if k else 0
            wsum += w
            continue
        if mode == 'solid':
            mask = np.ones(n)
        elif mode == 'fill':
            mask = np.clip(1 - (u - pos) / width, 0, 1)
        else:
            d = np.abs(u - pos)
            if mode == 'chase':
                d = np.minimum(d, 1 - d)
            mask = np.clip(1 - d / width, 0, 1)
        total += w * np.array([val('Red', 0), val('Green', 0), val('Blue', 0)])[:, None] * mask
        wsum += w
    rest = max(0.0, 1.0 - wsum)
    scriptOp.copyNumpyArray((total / max(wsum + rest, 0.001)).astype(np.float32), baseName='c')
    return
`

const BOARD_CODE = `
import numpy as np

def onCook(scriptOp):
    out = np.zeros((512, 1), dtype=np.float32)
    for i, start, count, ch in scriptOp.fetch('cfg')['parts']:
        if i >= len(scriptOp.inputs):
            continue
        rgb = scriptOp.inputs[i].numpyArray()[:3, start:start + count]
        flat = np.round(np.clip(rgb.T.reshape(-1), 0, 1) * 255)[:512 - ch]
        out[ch:ch + flat.size, 0] = flat
    scriptOp.copyNumpyArray(out, baseName='c')
    return
`

type Dir = { name: string; label: string; tint: number[]; order: string[]; rail?: [string, string, string | null][] } & Spot
const TINTS = { dir: [0.3, 0.3, 0.34], hardware: [0.36, 0.56, 0.84], source: [0.88, 0.42, 0.42], fixture: [0.31, 0.7, 0.75], scene: [0.69, 0.49, 0.86], composite: [0.45, 0.62, 0.55], output: [0.95, 0.71, 0.27], input: [0.42, 0.72, 0.42], logic: [0.55, 0.55, 0.6] }
const HARDWARE: Kind[] = ['artnet', 'dmxin', 'board']
const ROW = 200

function tintOf(b: Block) {
  if (HARDWARE.includes(b.kind)) return TINTS.hardware
  if (SOURCE_KINDS.includes(b.kind)) return TINTS.source
  if (b.kind === 'fixture' || b.kind === 'tube') return TINTS.fixture
  if (b.kind === 'light' || b.kind === 'group' || b.kind === 'strip') return TINTS.output
  if (b.kind === 'input') return TINTS.input
  return TINTS.logic
}

const sources = (show: Show) => show.blocks.filter((b) => SOURCE_KINDS.includes(b.kind))
const inLayout = (b: Block) => HARDWARE.includes(b.kind) || SOURCE_KINDS.includes(b.kind)
const isOutput = (b: Block) => b.kind === 'fixture' || b.kind === 'tube'

function outputOrder(show: Show) {
  const seen = new Set<string>()
  return outputRail(show).flatMap((r) => r.ports.map((p) => p.id)).flatMap((id) => {
    const set = show.blocks.find((b): b is TubeBlock => b.id === id && b.kind === 'tube')?.set
    if (!set || seen.has(set)) return [id]
    seen.add(set)
    return [set, id]
  })
}

function railPorts(show: Show): [string, string, string | null][] {
  return inputRail(show).flatMap((r) => r.ports.map((p): [string, string, string | null] => {
    const [id, port] = p.id.split(RAIL_SEP)
    const outs = outputPorts(show.blocks.find((b) => b.id === id)!, show)
    return [id, port, p.chans ?? (outs.length > 1 ? port : null)]
  }))
}

const showDir = (show: Show): Dir => ({ name: 'show', x: 300, y: 0, w: NODE_W, h: NODE_H, label: 'Show: the show tab', tint: TINTS.dir, order: sources(show).map((b) => b.id) })
const layoutDir = (show: Show): Dir => ({ name: 'layout', x: -300, y: 0, w: NODE_W, h: NODE_H, label: 'Layout: Art-Net nodes, pixel boards and sources', tint: TINTS.dir, order: sources(show).map((b) => b.id) })
const inputsDir = (show: Show): Dir => ({ name: 'inputs', ...railSpot(show, INPUTS_ID), label: 'Inputs: layout sources used on the show tab', tint: TINTS.source, order: [...sources(show).map((b) => b.id), ...railPorts(show).map(([id, port]) => `${id}_${port}`)], rail: railPorts(show) })
const outputsDir = (show: Show): Dir => ({ name: 'outputs', ...railSpot(show, OUTPUTS_ID), label: 'Outputs: fixtures and LED tubes', tint: TINTS.fixture, order: outputOrder(show) })

function spotOf(show: Show, b: Block): Spot {
  const size = { w: b.w, h: b.h }
  if (inLayout(b)) {
    const u = unitsOf(show).find((u) => u.key === b.id)
    return u ? unitSpot(u) : { x: b.x, y: b.y, ...size }
  }
  if (b.kind === 'tube' && b.set) return { x: 0, y: -membersOf(show, b.set).findIndex((t) => t.id === b.id) * ROW, ...size }
  if (isOutput(b) || b.kind === 'tubeset') return { x: 0, y: -outputOrder(show).filter((id) => show.blocks.find((x) => x.id === id && !(x.kind === 'tube' && x.set))).indexOf(b.id) * ROW, ...size }
  return { x: b.x, y: b.y, ...size }
}

function ownerDir(show: Show, o: Block): Dir {
  const tint = o.kind === 'scene' ? TINTS.scene : o.kind === 'composite' ? TINTS.composite : TINTS.fixture
  const order = o.kind === 'tubeset' ? membersOf(show, o.id).map((t) => t.id) : [...inputPorts(o, show).map((p) => p.id), ...outputPorts(o, show).map((p) => p.id.split(':')[0])]
  return { name: o.id, ...spotOf(show, o), label: o.name, tint, order: [...new Set(order)] }
}

function dirsOf(show: Show, b: Block): Dir[] {
  if (inLayout(b)) return [layoutDir(show)]
  return [showDir(show), ...(isOutput(b) ? [outputsDir(show)] : []), ...ownersOf(show, b).map((o) => ownerDir(show, o))]
}

function placed(show: Show, b: Block) {
  return { ...b, ...spotOf(show, b), _dirs: dirsOf(show, b), _tint: tintOf(b) }
}

const railCode = (show: Show) => `RAIL = ${j([showDir(show), inputsDir(show)])}`

const PRELUDE = `
import json
import td

ROOT = op('/project1')
SHOW_DAT = 'lsgleam_show'

def home():
    ls = ROOT.op('lsgleam')
    if ls is None:
        ls = ROOT.create(baseCOMP, 'lsgleam')
        ls.nodeX, ls.nodeY = 0, -400
        ls.tags.add('lsgleam_root')
        ls.comment = 'lsgleam: generated from the web UI, do not edit by hand'
    return ls

LS = home()

RAIL = None

def find(name):
    found = LS.findChildren(name=name, tags=['lsgleam'])
    return found[0] if found else None

def find_dir(name):
    found = LS.findChildren(name=name, tags=['lsgleam_dir'])
    return found[0] if found else None

def tidy(p):
    order = p.storage.get('order', [])
    nodes = [o for o in p.children if 'lsgleam' in o.tags or 'lsgleam_dir' in o.tags]
    left = min([o.nodeX for o in nodes], default=0) - 400
    right = max([o.nodeX + o.nodeWidth for o in nodes], default=0) + 250
    top = max([o.nodeY + o.nodeHeight for o in nodes], default=0)
    wires = [o for o in p.children if o.storage.get('wire')]
    rank = lambda o: order.index(o.storage['rank']) if o.storage['rank'] in order else len(order)
    names = []
    for side, x in (('in', left), ('sel', (left + right) // 2), ('out', right)):
        mine = sorted((o for o in wires if o.storage['wire'][0] == side), key=lambda o: (rank(o), o.storage['wire'][1]))
        for i, o in enumerate(mine):
            o.nodeX, o.nodeY = x, top - (i + 1) * 120
            names.append((o, '%s%d_%s' % (side, rank(o), o.storage['wire'][1])))
    renamed = [(o, name) for o, name in names if o.name != name]
    for k, (o, name) in enumerate(renamed):
        o.name = 'renaming%d' % k
    for o, name in renamed:
        o.name = name

def ensure(dirs):
    p = LS
    for d in dirs:
        c = p.op(d['name'])
        if c is None:
            c = p.create(baseCOMP, d['name'])
            c.tags.add('lsgleam_dir')
        c.nodeX, c.nodeY = d['x'], d['y']
        c.nodeWidth, c.nodeHeight = d['w'], d['h']
        c.comment = d['label']
        c.color = tuple(d['tint'])
        c.store('order', d['order'])
        if 'rail' in d:
            c.store('rail', d['rail'])
        tidy(c)
        p = c
    return p

def port_op(p, kind, side, label, rank, ids):
    for o in p.children:
        if o.storage.get('wire') == [side, label]:
            return o
    o = p.create(kind)
    o.store('wire', [side, label])
    o.store('rank', rank)
    o.store('ids', ids)
    o.tags.add('lsgleam_wire')
    tidy(p)
    return o

def outlet(p, x):
    return next(k for k in p.outputConnectors if k.outOP is not None and k.outOP.path == x.path)

def inlet(p, x):
    return next(k for k in p.inputConnectors if k.inOP is not None and k.inOP.path == x.path)

def lift(src, above):
    o, out = src, src.outputConnectors[0]
    while o.parent().path not in above:
        p = o.parent()
        x = port_op(p, outCHOP, 'out', src.name, src.name, [src.name])
        x.inputConnectors[0].connect(out)
        out = outlet(p, x)
        o = p
    return o, out

def tap(src, chan):
    box = ensure(RAIL)
    port = next((p for s, p, c in box.storage.get('rail', []) if s == src.name and c == chan), chan or 'out')
    label = src.name + '_' + port
    sel = port_op(box, selectCHOP if chan else nullCHOP, 'sel', label, label, [src.name])
    if chan:
        sel.par.channames = chan
    wire(src, sel, sel.inputConnectors[0])
    x = port_op(box, outCHOP, 'out', label, label, [src.name])
    sel.outputConnectors[0].connect(x.inputConnectors[0])
    return box, outlet(box, x)

def wire(src, dst, conn, chan=None):
    above = set()
    a = dst.parent()
    while a is not None and a.path != LS.parent().path:
        above.add(a.path)
        a = a.parent()
    show = LS.path + '/show/'
    if RAIL and src.parent().path == LS.path + '/layout' and dst.path.startswith(show) and not dst.path.startswith(show + 'inputs/'):
        o, out = tap(src, chan)
    else:
        o, out = lift(src, above)
    level = o.parent().path
    d, target = dst, conn
    while d.parent().path != level:
        p = d.parent()
        if d.name in p.storage.get('order', []):
            x = port_op(p, inCHOP, 'in', src.name + '_' + d.name, d.name, [src.name, d.name])
        else:
            x = port_op(p, inCHOP, 'in', src.name, src.name, [src.name])
        x.outputConnectors[0].connect(target)
        target = inlet(p, x)
        d = p
    out.connect(target)

def put(name, spot):
    o = find(name) or find_dir(name)
    if o:
        o.nodeX, o.nodeY = spot['x'], spot['y']
        o.nodeWidth, o.nodeHeight = spot['w'], spot['h']
        tidy(o.parent())

def chain(*ops, y=0):
    for i, o in enumerate(ops):
        o.nodeX, o.nodeY = i * 200, y
        if i:
            ops[i - 1].outputConnectors[0].connect(o.inputConnectors[0])

def new_block(b):
    old = find(b['id'])
    if old:
        old.destroy()
    p = ensure(b['_dirs'])
    for o in p.children:
        if o.storage.get('ids', [])[1:] == [b['id']]:
            o.destroy()
    c = p.create(baseCOMP, b['id'])
    c.nodeX, c.nodeY = b['x'], b['y']
    c.nodeWidth, c.nodeHeight = b['w'], b['h']
    c.tags.add('lsgleam')
    c.comment = b.get('name', '')
    c.color = tuple(b['_tint'])
    tidy(p)
    return c

def inputs(c, sources, rename=False):
    ends = []
    for i, src in enumerate(sources):
        n = i + 1
        inp = c.create(inCHOP, 'in%d' % n)
        inp.nodeX, inp.nodeY = -800, -i * 150
        last = inp
        if src.get('chan'):
            sel = c.create(selectCHOP, 'sel%d' % n)
            sel.par.channames = src['chan']
            sel.nodeX, sel.nodeY = -600, -i * 150
            last.outputConnectors[0].connect(sel.inputConnectors[0])
            last = sel
        if src.get('strip'):
            strip = c.create(renameCHOP, 'strip%d' % n)
            strip.par.renamefrom = src['strip'] + '*'
            strip.par.renameto = '*'
            strip.nodeX, strip.nodeY = -500, -i * 150
            last.outputConnectors[0].connect(strip.inputConnectors[0])
            last = strip
        if rename and src['port'] not in ('look', 'color', '__scene', 'channels') and not src.get('keep'):
            ren = c.create(renameCHOP, 'port%d' % n)
            ren.par.renamefrom = '*'
            ren.par.renameto = src['port']
            ren.nodeX, ren.nodeY = -400, -i * 150
            last.outputConnectors[0].connect(ren.inputConnectors[0])
            last = ren
        ends.append(last)
    by_name = {}
    for conn in c.inputConnectors:
        o = conn.inOP
        if o:
            by_name[o.name] = conn
    for i, src in enumerate(sources):
        conn = by_name.get('in%d' % (i + 1), c.inputConnectors[i])
        wire(find(src['from']), c, conn, src.get('chan'))
    return ends

def mix(c, name, ends, x, y):
    if len(ends) == 1:
        return ends[0]
    add = c.create(mathCHOP, 'sum_' + name)
    add.par.chopop = 'add'
    for e in ends:
        e.outputConnectors[0].connect(add)
    clamp = c.create(limitCHOP, 'mix_' + name)
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    add.nodeX, clamp.nodeX = x, x + 50
    add.nodeY = clamp.nodeY = y
    add.outputConnectors[0].connect(clamp.inputConnectors[0])
    return clamp

def empty(c):
    e = c.op('empty')
    if e is None:
        src = constant(c, 'empty_src', [('none', 0)])
        e = c.create(selectCHOP, 'empty')
        e.par.channames = 'nothing'
        src.nodeX, e.nodeX = -1200, -1100
        src.nodeY = e.nodeY = 300
        src.outputConnectors[0].connect(e.inputConnectors[0])
    return e

def select(c, name, src, pattern, x, y):
    sel = c.create(selectCHOP, name)
    sel.par.channames = pattern
    sel.nodeX, sel.nodeY = x, y
    src.outputConnectors[0].connect(sel.inputConnectors[0])
    return sel

def ports(c, sources, defaults=None, alias=None):
    defaults = defaults or {}
    alias = alias or {}
    ends = inputs(c, sources, rename=True)
    weights = None
    count = 0
    by_port = {}
    for src, end in zip(sources, ends):
        if src['port'] == '__scene':
            weights = end
            count = src['scene']
            continue
        port = alias.get(src['port'], src['port'])
        by_port.setdefault(port, {}).setdefault(src.get('scene'), []).append(end)
    out = {}
    for k, (port, scenes) in enumerate(by_port.items()):
        y = -k * 200 - 50
        if None in scenes:
            out[port] = mix(c, port, scenes[None], -300, y)
            continue
        driving = sorted(scenes)
        parts = []
        for n in driving:
            feed = mix(c, '%s_s%d' % (port, n), scenes[n], -450, y - n * 40)
            w = select(c, '%s_w%d' % (port, n), weights, 'w%d' % n, -400, y - n * 40 - 20)
            m = c.create(mathCHOP, '%s_x%d' % (port, n))
            m.par.chopop = 'mul'
            m.nodeX, m.nodeY = -350, y - n * 40
            feed.outputConnectors[0].connect(m.inputConnectors[0])
            w.outputConnectors[0].connect(m.inputConnectors[1])
            parts.append(m)
        wsel = select(c, port + '_weights', weights, ' '.join('w%d' % n for n in driving), -450, y - 150)
        wsum = c.create(mathCHOP, port + '_wsum')
        wsum.par.chanop = 'add'
        wsum.nodeX, wsum.nodeY = -400, y - 150
        wsel.outputConnectors[0].connect(wsum.inputConnectors[0])
        rest = c.create(mathCHOP, port + '_rest')
        rest.par.gain = -1
        rest.par.postoff = 1
        restc = c.create(limitCHOP, port + '_rest_clamp')
        restc.par.type = 'clamp'
        restc.par.min = 0
        restc.par.max = 1
        rest.nodeX, restc.nodeX = -350, -300
        rest.nodeY = restc.nodeY = y - 150
        wsum.outputConnectors[0].connect(rest.inputConnectors[0])
        rest.outputConnectors[0].connect(restc.inputConnectors[0])
        default = defaults.get(port)
        if default is not None:
            dm = c.create(mathCHOP, port + '_default')
            dm.par.chopop = 'mul'
            dm.nodeX, dm.nodeY = -300, y - 100
            default.outputConnectors[0].connect(dm.inputConnectors[0])
            restc.outputConnectors[0].connect(dm.inputConnectors[1])
            parts.append(dm)
        total = c.create(mathCHOP, port + '_total')
        total.par.chopop = 'add'
        total.nodeX, total.nodeY = -250, y
        for p in parts:
            p.outputConnectors[0].connect(total)
        denom = c.create(mathCHOP, port + '_denom')
        denom.par.chopop = 'add'
        denom.nodeX, denom.nodeY = -250, y - 150
        wsum.outputConnectors[0].connect(denom.inputConnectors[0])
        restc.outputConnectors[0].connect(denom.inputConnectors[1])
        safe = c.create(limitCHOP, port + '_denom_floor')
        safe.par.type = 'clamp'
        safe.par.min = 0.001
        safe.par.max = 1000
        safe.nodeX, safe.nodeY = -200, y - 150
        denom.outputConnectors[0].connect(safe.inputConnectors[0])
        blend = c.create(mathCHOP, 'scene_' + port)
        blend.par.chopop = 'div'
        blend.nodeX, blend.nodeY = -150, y
        total.outputConnectors[0].connect(blend.inputConnectors[0])
        safe.outputConnectors[0].connect(blend.inputConnectors[1])
        out[port] = blend
    return out

def merge_into(c, ops, name='merge', y=-150):
    if not ops:
        return None
    merge = c.create(mergeCHOP, name)
    merge.par.duplicate = 'last'
    merge.nodeX, merge.nodeY = -200, y
    for o in ops:
        o.outputConnectors[0].connect(merge)
    return merge

def constant(c, name, pairs):
    const = c.create(constantCHOP, name)
    const.seq.const.numBlocks = len(pairs)
    for i, (k, v) in enumerate(pairs):
        const.par['const%dname' % i] = k
        const.par['const%dvalue' % i] = v
    return const

def build_audio(b, sources):
    c = new_block(b)
    audio = c.create(audiodeviceinCHOP, 'audio')
    if b['device']:
        audio.par.device = b['device']
    audio.par.active = True
    chain(audio, c.create(outCHOP, 'out1'))

def build_dmxin(b, sources, protocol, universe):
    c = new_block(b)
    dmx = c.create(dmxinCHOP, 'dmxin1')
    dmx.par.interface = protocol
    dmx.par.format = 'packetpersample'
    dmx.par.universe = universe or 0
    dmx.par.active = universe is not None
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = '*'
    names.par.renameto = 'ch[1-512]'
    faders = c.create(selectCHOP, 'faders')
    faders.par.channames = 'ch[1-%d]' % b['channels']
    norm = c.create(mathCHOP, 'norm')
    norm.par.fromrange2 = 255
    chain(dmx, names, faders, norm, c.create(outCHOP, 'out1'))

def osc_in(c, port):
    osc = c.create(oscinCHOP, 'osc1')
    osc.par.port = port
    osc.par.active = True
    return osc

def build_blt(b, sources):
    c = new_block(b)
    osc = osc_in(c, b['port'])
    decks = (['master'] if b['master'] else []) + ['%d' % d for d in range(1, b['decks'] + 1)]
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = ' '.join('*?%s?%s' % (d, s) for d in decks for s in b['signals'])
    names.par.renameto = ' '.join('%s_%s' % (d if d == 'master' else 'd' + d, s) for d in decks for s in b['signals'])
    chain(osc, names)
    branches = []
    for k, sig in enumerate(${j(BLT_INDEXED)}):
        sel = c.create(selectCHOP, sig)
        sel.par.channames = '*_%s' % sig
        math = c.create(mathCHOP, sig + '_zero')
        math.par.preoff = -1
        sel.nodeX, math.nodeX = 400, 600
        sel.nodeY = math.nodeY = -k * 150
        names.outputConnectors[0].connect(sel.inputConnectors[0])
        sel.outputConnectors[0].connect(math.inputConnectors[0])
        branches.append(math)
    rest = c.create(selectCHOP, 'rest')
    rest.par.channames = ' '.join('*_%s' % s for s in b['signals'] if s not in ${j(BLT_INDEXED)})
    rest.nodeX, rest.nodeY = 400, -len(branches) * 150
    names.outputConnectors[0].connect(rest.inputConnectors[0])
    merge = merge_into(c, branches + [rest])
    merge.nodeX, merge.nodeY = 800, 0
    out = c.create(outCHOP, 'out1')
    out.nodeX = 1000
    merge.outputConnectors[0].connect(out.inputConnectors[0])

def build_audioslice(b, sources):
    c = new_block(b)
    osc = osc_in(c, b['port'])
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = ' '.join('*' + s.replace('/', '?') for s in b['signals'])
    names.par.renameto = ' '.join(s.replace('/', '_') for s in b['signals'])
    sel = c.create(selectCHOP, 'signals')
    sel.par.channames = names.par.renameto
    chain(osc, names, sel, c.create(outCHOP, 'out1'))

def build_level(b, sources):
    c = new_block(b)
    merge = merge_into(c, inputs(c, sources)) or constant(c, 'silence', [('signal', 0)])
    rms = c.create(analyzeCHOP, 'rms')
    rms.par.function = 'rmspower'
    mono = c.create(mathCHOP, 'mono')
    mono.par.chanop = 'avg'
    smooth = c.create(lagCHOP, 'smooth')
    smooth.par.lag1 = b['attack']
    smooth.par.lag2 = b['release']
    gain = c.create(mathCHOP, 'gain')
    gain.par.gain = b['gain']
    clamp = c.create(limitCHOP, 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'level'
    chain(rms, mono, smooth, gain, clamp, name, c.create(outCHOP, 'out1'))
    merge.outputConnectors[0].connect(rms.inputConnectors[0])

def build_gate(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('signal') or constant(c, 'silence', [('signal', 0)])
    t = min(max(b['threshold'], 0), 0.99)
    if b['rescale']:
        lift = c.create(mathCHOP, 'rescale')
        lift.par.preoff = -t
        lift.par.gain = 1.0 / (1 - t)
        clamp = c.create(limitCHOP, 'clamp')
        clamp.par.type = 'clamp'
        clamp.par.min = 0
        clamp.par.max = 1
        chain(lift, clamp)
        src.outputConnectors[0].connect(lift.inputConnectors[0])
        last = clamp
    else:
        g, lim = gate(c, 'open', t, 0, -150)
        src.outputConnectors[0].connect(g.inputConnectors[0])
        last = c.create(mathCHOP, 'gated')
        last.par.chopop = 'mul'
        last.nodeX = 400
        src.outputConnectors[0].connect(last.inputConnectors[0])
        lim.outputConnectors[0].connect(last.inputConnectors[1])
    finish(c, named(c, sources, last, 'gated', 600), 800)

def build_steps(b, sources):
    c = new_block(b)
    merge = merge_into(c, inputs(c, sources)) or constant(c, 'silence', [('signal', 0)])
    scale = c.create(mathCHOP, 'scale')
    scale.par.gain = b['steps']
    quant = c.create(limitCHOP, 'quant')
    quant.par.type = 'clamp'
    quant.par.min = 0
    quant.par.max = b['steps'] - 1
    quant.par.quantvalue = 'floor'
    quant.par.vstep = 1
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'index'
    chain(scale, quant, name, c.create(outCHOP, 'out1'))
    merge.outputConnectors[0].connect(scale.inputConnectors[0])

def indexed_switch(c, name, step, trigger, count, y, every=1):
    index = step
    counter = None
    if trigger is not None:
        counter = c.create(countCHOP, name + '_count')
        counter.par.threshold = False
        counter.par.threshup = 0.1
        counter.par.threshdown = 0.05
        counter.par.offtoon = 'inc'
        counter.par.output = 'off'
        counter.nodeX, counter.nodeY = -200, y - 150
        trigger.outputConnectors[0].connect(counter.inputConnectors[0])
        index = counter
        if every > 1:
            div = c.create(mathCHOP, name + '_every')
            div.par.gain = 1.0 / every
            div.par.integer = 'floor'
            div.nodeX, div.nodeY = -100, y - 150
            counter.outputConnectors[0].connect(div.inputConnectors[0])
            index = div
    if index is None:
        index = constant(c, name + '_index', [('index', 0)])
        index.nodeX, index.nodeY = -200, y - 150
    wrap = c.create(limitCHOP, name + '_wrap')
    wrap.par.type = 'loop'
    wrap.par.min = 0
    wrap.par.max = count
    wrap.nodeX, wrap.nodeY = 0, y - 150
    index.outputConnectors[0].connect(wrap.inputConnectors[0])
    sw = c.create(switchCHOP, name)
    sw.par.indexfirst = True
    sw.nodeX, sw.nodeY = 200, y
    wrap.outputConnectors[0].connect(sw)
    return sw, wrap, counter

def pattern_chain(c, step, trigger, masks, signal, y, every=1, floor=None):
    sw, wrap, counter = indexed_switch(c, 'mask', step, trigger, len(masks), y, every)
    for k, m in enumerate(masks):
        step_const = constant(c, 'step%d' % (k + 1), [('slot%d' % (i + 1), v) for i, v in enumerate(m)])
        step_const.nodeX, step_const.nodeY = 0, y + 100 + k * 100
        step_const.outputConnectors[0].connect(sw)
    last = sw
    if signal is not None:
        last = c.create(mathCHOP, 'mul')
        last.par.chopop = 'mul'
        last.nodeX, last.nodeY = 400, y
        sw.outputConnectors[0].connect(last.inputConnectors[0])
        signal.outputConnectors[0].connect(last.inputConnectors[1])
    if floor is None:
        return last
    floored = c.create(mathCHOP, 'floored')
    floored.par.chopop = 'max'
    floored.nodeX, floored.nodeY = 600, y
    last.outputConnectors[0].connect(floored.inputConnectors[0])
    floor.outputConnectors[0].connect(floored.inputConnectors[1])
    return floored

def floor_of(c, b, by_port):
    if 'floor' in by_port:
        return by_port.pop('floor')
    return constant(c, 'set_floor', [('floor', b['floor'])]) if b['floor'] > 0 else None

def build_scenes(b, sources, looks):
    c = new_block(b)
    by_port = ports(c, sources)
    index = by_port.get('scene')
    if 'offset' in by_port:
        base = index or constant(c, 'noindex', [('index', 0)])
        shifted = c.create(mathCHOP, 'shifted')
        shifted.par.chopop = 'add'
        shifted.nodeX, shifted.nodeY = -200, -250
        base.outputConnectors[0].connect(shifted.inputConnectors[0])
        by_port['offset'].outputConnectors[0].connect(shifted.inputConnectors[1])
        index = shifted
    sw, wrap, counter = indexed_switch(c, 'scene', index, by_port.get('next'), len(looks), 0, b['every'])
    for k, (r, g, bl, lo, hi) in enumerate(looks):
        const = constant(c, 'scene%d' % (k + 1), [('Red', r), ('Green', g), ('Blue', bl), ('lo', lo), ('hi', hi)])
        const.nodeX, const.nodeY = 0, 100 + k * 100
        const.outputConnectors[0].connect(sw)
    wild = by_port.get('wild') or constant(c, 'nowild', [('wild', 0)])
    calm = c.create(mathCHOP, 'calm')
    calm.par.gain = -1
    calm.par.postoff = 1
    calm.nodeX, calm.nodeY = 200, -300
    wild.outputConnectors[0].connect(calm.inputConnectors[0])
    colors = by_port.get('color') or c.create(selectCHOP, 'colors')
    if 'color' not in by_port:
        colors.par.channames = 'Red Green Blue'
    lo = c.create(selectCHOP, 'lo')
    lo.par.channames = 'lo'
    hi = c.create(selectCHOP, 'hi')
    hi.par.channames = 'hi'
    for k, o in enumerate((colors, lo, hi)):
        if o is by_port.get('color'):
            continue
        o.nodeX, o.nodeY = 400, -k * 100
        sw.outputConnectors[0].connect(o.inputConnectors[0])
    lo_out = c.create(mathCHOP, 'lo_wild')
    lo_out.par.chopop = 'mul'
    lo_out.nodeX, lo_out.nodeY = 600, -100
    lo.outputConnectors[0].connect(lo_out.inputConnectors[0])
    calm.outputConnectors[0].connect(lo_out.inputConnectors[1])
    room = c.create(mathCHOP, 'room')
    room.par.gain = -1
    room.par.postoff = 1
    room.nodeX, room.nodeY = 600, -200
    hi.outputConnectors[0].connect(room.inputConnectors[0])
    gain = c.create(mathCHOP, 'gain')
    gain.par.chopop = 'mul'
    gain.nodeX, gain.nodeY = 800, -200
    room.outputConnectors[0].connect(gain.inputConnectors[0])
    wild.outputConnectors[0].connect(gain.inputConnectors[1])
    hi_out = c.create(mathCHOP, 'hi_wild')
    hi_out.par.chopop = 'add'
    hi_out.nodeX, hi_out.nodeY = 1000, -200
    hi.outputConnectors[0].connect(hi_out.inputConnectors[0])
    gain.outputConnectors[0].connect(hi_out.inputConnectors[1])
    span = c.create(mathCHOP, 'span')
    span.par.chopop = 'sub'
    span.nodeX, span.nodeY = 1200, -200
    hi_out.outputConnectors[0].connect(span.inputConnectors[0])
    lo_out.outputConnectors[0].connect(span.inputConnectors[1])
    dim = by_port.get('dimmer') or constant(c, 'nodimmer', [('dimmer', 1)])
    scaled = c.create(mathCHOP, 'scaled')
    scaled.par.chopop = 'mul'
    scaled.nodeX, scaled.nodeY = 1400, -200
    dim.outputConnectors[0].connect(scaled.inputConnectors[0])
    span.outputConnectors[0].connect(scaled.inputConnectors[1])
    lifted = c.create(mathCHOP, 'lifted')
    lifted.par.chopop = 'add'
    lifted.nodeX, lifted.nodeY = 1600, -200
    scaled.outputConnectors[0].connect(lifted.inputConnectors[0])
    lo_out.outputConnectors[0].connect(lifted.inputConnectors[1])
    dimmer = c.create(renameCHOP, 'dimmer')
    dimmer.par.renamefrom = '*'
    dimmer.par.renameto = 'Dimmer'
    dimmer.nodeX, dimmer.nodeY = 1800, -200
    lifted.outputConnectors[0].connect(dimmer.inputConnectors[0])
    idx = c.create(renameCHOP, 'index')
    idx.par.renamefrom = '*'
    idx.par.renameto = 'scene'
    idx.nodeX, idx.nodeY = 400, -400
    wrap.outputConnectors[0].connect(idx.inputConnectors[0])
    merge = merge_into(c, [colors, dimmer, idx], 'merge', 0)
    merge.nodeX = 2000
    out = c.create(outCHOP, 'out1')
    out.nodeX = 2200
    merge.outputConnectors[0].connect(out.inputConnectors[0])

def build_colors(b, sources, table):
    c = new_block(b)
    by_port = ports(c, sources)
    sw, wrap, counter = indexed_switch(c, 'step', by_port.get('index'), None, len(table), 0)
    for k, pairs in enumerate(table):
        const = constant(c, 'step%d' % (k + 1), pairs)
        const.nodeX, const.nodeY = 0, 100 + k * 100
        const.outputConnectors[0].connect(sw)
    finish(c, sw, 400)

def build_sequence(b, sources, values):
    c = new_block(b)
    by_port = ports(c, sources)
    sw, wrap, counter = indexed_switch(c, 'value', None, by_port.get('trigger'), len(values), 0, b['every'])
    if counter is not None and 'reset' in by_port:
        counter.par.resetcondition = 'offtoon'
        by_port['reset'].outputConnectors[0].connect(counter.inputConnectors[1])
    for k, v in enumerate(values):
        const = constant(c, 'v%d' % (k + 1), [('value', v)])
        const.nodeX, const.nodeY = 0, 100 + k * 100
        const.outputConnectors[0].connect(sw)
    out = c.create(outCHOP, 'out1')
    out.nodeX = 400
    sw.outputConnectors[0].connect(out.inputConnectors[0])

def gate(c, name, threshold, x, y):
    g = c.create(mathCHOP, name + '_gate')
    g.par.preoff = -threshold
    g.par.gain = 1000
    lim = c.create(limitCHOP, name)
    lim.par.type = 'clamp'
    lim.par.min = 0
    lim.par.max = 1
    g.nodeX, lim.nodeX = x, x + 200
    g.nodeY = lim.nodeY = y
    g.outputConnectors[0].connect(lim.inputConnectors[0])
    return g, lim

def build_drop(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    src = by_port.get('signal') or constant(c, 'silence', [('signal', 0)])
    beat = by_port.get('beat') or constant(c, 'nobeat', [('beat', 0)])
    kick_in, kick = gate(c, 'kick', b['threshold'], 0, 0)
    src.outputConnectors[0].connect(kick_in.inputConnectors[0])
    quiet = c.create(countCHOP, 'quiet')
    quiet.par.threshold = False
    quiet.par.threshup = 0.1
    quiet.par.threshdown = 0.05
    quiet.par.offtoon = 'inc'
    quiet.par.output = 'off'
    quiet.par.resetcondition = 'on'
    quiet.nodeX, quiet.nodeY = 400, -150
    beat.outputConnectors[0].connect(quiet.inputConnectors[0])
    kick.outputConnectors[0].connect(quiet.inputConnectors[1])
    armed_in, armed = gate(c, 'armed', b['beats'] - 0.5, 600, -150)
    armed_out = c.create(renameCHOP, 'armed_name')
    armed_out.par.renamefrom = '*'
    armed_out.par.renameto = 'armed'
    armed_out.nodeX, armed_out.nodeY = 800, -300
    armed.outputConnectors[0].connect(armed_out.inputConnectors[0])
    quiet.outputConnectors[0].connect(armed_in.inputConnectors[0])
    hold = c.create(lagCHOP, 'hold')
    hold.par.lagunit = 'seconds'
    hold.par.lag1 = 0
    hold.par.lag2 = 0.25
    hold.nodeX, hold.nodeY = 1000, -150
    armed.outputConnectors[0].connect(hold.inputConnectors[0])
    hit = c.create(mathCHOP, 'hit')
    hit.par.chopop = 'mul'
    hit.nodeX, hit.nodeY = 1200, 0
    kick.outputConnectors[0].connect(hit.inputConnectors[0])
    hold.outputConnectors[0].connect(hit.inputConnectors[1])
    drop_in, drop_lim = gate(c, 'drop_lim', 0.3, 1400, 0)
    hit.outputConnectors[0].connect(drop_in.inputConnectors[0])
    drop = c.create(renameCHOP, 'drop')
    drop.par.renamefrom = '*'
    drop.par.renameto = 'drop'
    drop.nodeX = 1800
    drop_lim.outputConnectors[0].connect(drop.inputConnectors[0])
    count = c.create(countCHOP, 'count')
    count.par.threshold = False
    count.par.threshup = 0.5
    count.par.threshdown = 0.25
    count.par.offtoon = 'inc'
    count.par.output = 'off'
    count.par.retrigger = b['cooldown']
    count.par.retriggerunit = 'seconds'
    drops = c.create(renameCHOP, 'drops')
    drops.par.renamefrom = '*'
    drops.par.renameto = 'drops'
    chain(count, drops, y=-150)
    count.nodeX, drops.nodeX = 1800, 2000
    drop.outputConnectors[0].connect(count.inputConnectors[0])
    merge = merge_into(c, [drop, armed_out, drops], 'merge', 0)
    merge.nodeX = 2200
    out = c.create(outCHOP, 'out1')
    out.nodeX = 2400
    merge.outputConnectors[0].connect(out.inputConnectors[0])

def build_hold(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    trigger = by_port.get('trigger') or constant(c, 'notrigger', [('trigger', 0)])
    beat = by_port.get('beat') or constant(c, 'nobeat', [('beat', 0)])
    since = c.create(countCHOP, 'since')
    since.par.threshold = False
    since.par.threshup = 0.1
    since.par.threshdown = 0.05
    since.par.offtoon = 'inc'
    since.par.output = 'off'
    since.par.resetcondition = 'on'
    since.nodeX, since.nodeY = 0, 0
    beat.outputConnectors[0].connect(since.inputConnectors[0])
    trigger.outputConnectors[0].connect(since.inputConnectors[1])
    inv = c.create(mathCHOP, 'remaining')
    inv.par.gain = -1
    inv.par.postoff = b['beats']
    inv.nodeX = 200
    since.outputConnectors[0].connect(inv.inputConnectors[0])
    g, lim = gate(c, 'hold_lim', 0.5, 400, 0)
    inv.outputConnectors[0].connect(g.inputConnectors[0])
    fired = edge_counter(c, 'fired', trigger, None, 0, -150)
    fg, flim = gate(c, 'fired_once', 0.5, 200, -150)
    fired.outputConnectors[0].connect(fg.inputConnectors[0])
    both = c.create(mathCHOP, 'both')
    both.par.chopop = 'mul'
    both.nodeX = 700
    lim.outputConnectors[0].connect(both.inputConnectors[0])
    flim.outputConnectors[0].connect(both.inputConnectors[1])
    name = c.create(renameCHOP, 'hold')
    name.par.renamefrom = '*'
    name.par.renameto = 'hold'
    name.nodeX = 800
    both.outputConnectors[0].connect(name.inputConnectors[0])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 1000
    name.outputConnectors[0].connect(out.inputConnectors[0])

def lerp(c, name, x, y, a, nx):
    inv = c.create(mathCHOP, name + '_inv')
    inv.par.gain = -1
    inv.par.postoff = 1
    a.outputConnectors[0].connect(inv.inputConnectors[0])
    px = c.create(mathCHOP, name + '_x')
    px.par.chopop = 'mul'
    x.outputConnectors[0].connect(px.inputConnectors[0])
    inv.outputConnectors[0].connect(px.inputConnectors[1])
    py = c.create(mathCHOP, name + '_y')
    py.par.chopop = 'mul'
    y.outputConnectors[0].connect(py.inputConnectors[0])
    a.outputConnectors[0].connect(py.inputConnectors[1])
    out = c.create(mathCHOP, name)
    out.par.chopop = 'add'
    px.outputConnectors[0].connect(out.inputConnectors[0])
    py.outputConnectors[0].connect(out.inputConnectors[1])
    for k, o in enumerate((inv, px, py, out)):
        o.nodeX, o.nodeY = nx + k * 150, -150 if name == 'lo' else -300
    return out

def build_range(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    signal = by_port.get('signal') or constant(c, 'nosignal', [('signal', 0)])
    amount = by_port.get('amount') or constant(c, 'noamount', [('amount', 0)])
    amt = c.create(limitCHOP, 'amount_clamp')
    amt.par.type = 'clamp'
    amt.par.min = 0
    amt.par.max = 1
    amt.nodeX, amt.nodeY = 0, -450
    amount.outputConnectors[0].connect(amt.inputConnectors[0])
    edge = lambda port, v: by_port.get(port) or constant(c, 'set_' + port, [(port, v)])
    lo = lerp(c, 'lo', edge('tameMin', b['tame'][0]), edge('wildMin', b['wild'][0]), amt, 200)
    hi = lerp(c, 'hi', edge('tameMax', b['tame'][1]), edge('wildMax', b['wild'][1]), amt, 200)
    span = c.create(mathCHOP, 'span')
    span.par.chopop = 'sub'
    span.nodeX, span.nodeY = 900, -300
    hi.outputConnectors[0].connect(span.inputConnectors[0])
    lo.outputConnectors[0].connect(span.inputConnectors[1])
    scaled = c.create(mathCHOP, 'scaled')
    scaled.par.chopop = 'mul'
    scaled.nodeX, scaled.nodeY = 1100, 0
    signal.outputConnectors[0].connect(scaled.inputConnectors[0])
    span.outputConnectors[0].connect(scaled.inputConnectors[1])
    lifted = c.create(mathCHOP, 'lifted')
    lifted.par.chopop = 'add'
    lifted.nodeX = 1300
    scaled.outputConnectors[0].connect(lifted.inputConnectors[0])
    lo.outputConnectors[0].connect(lifted.inputConnectors[1])
    finish(c, named(c, sources, lifted, 'signal', 1500), 1700)

def build_values(b, sources, table):
    c = new_block(b)
    by_port = ports(c, sources)
    sw, wrap, counter = indexed_switch(c, 'step', by_port.get('index'), None, len(table), 0)
    for k, pairs in enumerate(table):
        const = constant(c, 'step%d' % (k + 1), pairs)
        const.nodeX, const.nodeY = 0, 100 + k * 100
        const.outputConnectors[0].connect(sw)
    finish(c, sw, 400)

def build_pattern(b, sources, masks):
    c = new_block(b)
    by_port = ports(c, sources)
    last = pattern_chain(c, by_port.get('step'), by_port.get('trigger'), masks, by_port.get('signal'), 0, b['every'], floor_of(c, b, by_port))
    out = c.create(outCHOP, 'out1')
    out.nodeX = 600
    last.outputConnectors[0].connect(out.inputConnectors[0])

def position_switch(c, name, index, aim, positions, y):
    sw = c.create(switchCHOP, name)
    sw.par.indexfirst = True
    sw.nodeX, sw.nodeY = -200, y
    plus = c.create(mathCHOP, name + '_plus')
    plus.par.preoff = 1
    plus.nodeX, plus.nodeY = -400, y + 100
    index.outputConnectors[0].connect(plus.inputConnectors[0])
    plus.outputConnectors[0].connect(sw)
    home = constant(c, name + '_aim', aim)
    home.nodeX, home.nodeY = -400, y
    home.outputConnectors[0].connect(sw)
    for k, pairs in enumerate(positions):
        const = constant(c, '%s%d' % (name, k + 1), pairs)
        const.nodeX, const.nodeY = -400, y - (k + 1) * 100
        const.outputConnectors[0].connect(sw)
    return sw

def channel_affine(c, prefix, names, channel, mul, add, y):
    ones = constant(c, prefix + 'ones', [(n, 1) for n in names])
    zeros = constant(c, prefix + 'zeros', [(n, 0) for n in names])
    ones.nodeX, zeros.nodeX = -800, -800
    ones.nodeY, zeros.nodeY = y - 300, y - 400
    ops = []
    for k, (table, src, op_name, chopop) in enumerate(((ones, mul, 'mul', 'mul'), (zeros, add, 'add', 'add'))):
        if src is None:
            continue
        ren = c.create(renameCHOP, '%s%s_%s_name' % (prefix, channel, op_name))
        ren.par.renamefrom = '*'
        ren.par.renameto = channel
        rep = c.create(replaceCHOP, '%s%s_%s_table' % (prefix, channel, op_name))
        math = c.create(mathCHOP, '%s%s_%s' % (prefix, channel, op_name))
        math.par.chopop = chopop
        math.par.match = 'name'
        ren.nodeX, rep.nodeX = -600, -400
        ren.nodeY = rep.nodeY = y - 300 - k * 100
        src.outputConnectors[0].connect(ren.inputConnectors[0])
        table.outputConnectors[0].connect(rep.inputConnectors[0])
        ren.outputConnectors[0].connect(rep.inputConnectors[1])
        ops.append((math, rep))
    return ops

def channel_chain(c, prefix, pairs, feeds, y, nudge=None, nudge_channel=None):
    names = [n for n, v in pairs]
    ops = [constant(c, prefix + 'values', pairs)]
    merge = merge_into(c, feeds, prefix + 'merge', y - 150)
    if merge:
        patch = c.create(replaceCHOP, prefix + 'patch')
        merge.outputConnectors[0].connect(patch.inputConnectors[1])
        ops.append(patch)
    sides = []
    if nudge is not None:
        center = c.create(mathCHOP, prefix + 'nudge_center')
        center.par.preoff = -0.5
        center.nodeX, center.nodeY = -1000, y - 300
        nudge.outputConnectors[0].connect(center.inputConnectors[0])
        sides += channel_affine(c, prefix + 'nudge_', names, nudge_channel, None, center, y)
    ops += [math for math, rep in sides]
    clamp = c.create(limitCHOP, prefix + 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    ops.append(clamp)
    chain(*ops, y=y)
    for math, rep in sides:
        rep.outputConnectors[0].connect(math.inputConnectors[1])
    return clamp

def light_defaults(c, channels, values, prefix=''):
    defaults = {'nudge': constant(c, prefix + 'nonudge', [('nudge', 0.5)]), 'position': constant(c, prefix + 'noposition', [('position', -1)])}
    for i, ch in enumerate(channels):
        defaults[ch['name']] = constant(c, prefix + 'default_' + ch['name'], [(ch['name'], values[i])])
    defaults['look'] = constant(c, prefix + 'default_look', [(ch['name'], values[i]) for i, ch in enumerate(channels) if ch['name'] in ('Red', 'Green', 'Blue', 'Dimmer')])
    for k, d in enumerate(defaults.values()):
        d.nodeX, d.nodeY = -1400, 600 - k * 60
    return defaults

def finish(c, last, x=800):
    out = c.create(outCHOP, 'out1')
    out.nodeX = x
    last.outputConnectors[0].connect(out.inputConnectors[0])

def kept(sources):
    return [s['port'] for s in sources if s.get('keep')]

def named(c, sources, last, name, x):
    if kept(sources):
        return last
    ren = c.create(renameCHOP, 'name')
    ren.par.renamefrom = '*'
    ren.par.renameto = name
    ren.nodeX = x
    last.outputConnectors[0].connect(ren.inputConnectors[0])
    return ren

def build_fixture(b, profile, sources):
    c = new_block(b)
    pairs = [(ch['name'], b['values'][i]) for i, ch in enumerate(profile['channels'])]
    home = constant(c, 'default_channels', pairs)
    home.nodeX, home.nodeY = -1400, 600
    blend = ports(c, sources, {'channels': home}).get('channels') or home
    scale = c.create(mathCHOP, 'scale')
    scale.par.torange2 = 255
    scale.par.integer = 'round'
    addr = c.create(renameCHOP, 'address')
    addr.par.renamefrom = ' '.join(n for n, v in pairs)
    addr.par.renameto = ' '.join('c%d' % (b['address'] + i) for i in range(len(pairs)))
    chain(scale, addr)
    blend.outputConnectors[0].connect(scale.inputConnectors[0])
    finish(c, addr, 600)

def build_light(b, profile, sources):
    c = new_block(b)
    channels = profile['channels']
    names = [ch['name'] for ch in channels]
    pos = profile.get('position') or []
    feeds = []
    for port, end in ports(c, sources).items():
        if port == 'position':
            aim = [(ch, b['values'][names.index(ch)]) for ch in pos]
            end = position_switch(c, 'pos', end, aim, [[(ch, p['values'].get(ch, 0)) for ch in pos] for p in b['positions']], -400)
        feeds.append(end)
    finish(c, channel_chain(c, '', list(zip(names, b['values'])), feeds, 0))

def build_group(b, profile, sources, masks, members):
    c = new_block(b)
    if not members:
        return
    channels = profile['channels']
    names = [ch['name'] for ch in channels]
    pos = profile.get('position') or []
    defaults = light_defaults(c, channels, b['values'])
    defaults['step'] = constant(c, 'nostep', [('step', 0)])
    defaults['trigger'] = constant(c, 'notrigger', [('trigger', 0)])
    if 'Dimmer' in names:
        defaults['pattern'] = constant(c, 'dim_values', [('Dimmer', b['values'][names.index('Dimmer')])])
        defaults['pattern'].nodeX, defaults['pattern'].nodeY = -600, 400
    by_port = ports(c, sources, defaults, {'Dimmer': 'pattern'})
    slots = None
    floor = floor_of(c, b, by_port)
    look = by_port.pop('look', None)
    if look is not None:
        colors = c.create(selectCHOP, 'look_colors')
        colors.par.channames = 'Red Green Blue'
        look_dim = c.create(selectCHOP, 'look_dimmer')
        look_dim.par.channames = 'Dimmer'
        colors.nodeX, look_dim.nodeX = -900, -900
        colors.nodeY, look_dim.nodeY = 500, 400
        look.outputConnectors[0].connect(colors.inputConnectors[0])
        look.outputConnectors[0].connect(look_dim.inputConnectors[0])
        by_port['look'] = colors
        by_port['pattern'] = look_dim
    if 'Dimmer' in names:
        dim = by_port.get('pattern') or defaults['pattern']
        slots = pattern_chain(c, by_port.get('step'), by_port.get('trigger'), masks, dim, 400, b['every'], floor)
    ends = []
    for i, m in enumerate(members):
        p = 'm%d_' % (i + 1)
        y = -i * 600
        feeds = [end for port, end in by_port.items() if port in names or port in ('look', 'color')]
        if slots is not None:
            sel = c.create(selectCHOP, p + 'slot')
            sel.par.channames = 'slot%d' % (i + 1)
            dim = c.create(renameCHOP, p + 'dimmer')
            dim.par.renamefrom = '*'
            dim.par.renameto = 'Dimmer'
            sel.nodeX, dim.nodeX = -600, -400
            sel.nodeY = dim.nodeY = y - 300
            slots.outputConnectors[0].connect(sel.inputConnectors[0])
            sel.outputConnectors[0].connect(dim.inputConnectors[0])
            feeds.append(dim)
        if 'position' in by_port:
            stored = [[(ch, q['members'].get(m['id'], {}).get(ch, 0)) for ch in pos] for q in b['positions']]
            aim = [(ch, m['aim'].get(ch, 0.5)) for ch in pos]
            feeds.append(position_switch(c, p + 'pos', by_port['position'], aim, stored, y - 400))
        pairs = [(ch['name'], m['aim'].get(ch['name'], b['values'][k]) if ch['name'] in pos else b['values'][k]) for k, ch in enumerate(channels)]
        last = channel_chain(c, p, pairs, feeds, y, by_port.get('nudge'), pos[0] if pos else None)
        named = c.create(renameCHOP, p + 'named')
        named.par.renamefrom = '*'
        named.par.renameto = p + '*'
        named.nodeX, named.nodeY = 600, y
        last.outputConnectors[0].connect(named.inputConnectors[0])
        ends.append(named)
    merge = merge_into(c, ends, 'merge', 0)
    merge.nodeX = 800
    finish(c, merge, 1000)

def build_selector(b, count, fades, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    wired = {}
    for k in range(count):
        on = by_port.get('on%d' % k)
        if on is None:
            continue
        lim = c.create(limitCHOP, 'on%d_clamp' % k)
        lim.par.type = 'clamp'
        lim.par.min = 0
        lim.par.max = 1
        lim.nodeX, lim.nodeY = 200, -k * 150
        on.outputConnectors[0].connect(lim.inputConnectors[0])
        lag = c.create(lagCHOP, 'fade%d' % k)
        lag.par.lagunit = 'seconds'
        lag.par.lag1 = 0
        lag.par.lag2 = 0
        lag.par.clamp = True
        lag.par.slope1 = 1.0 / fades[k][0] if fades[k][0] > 0 else 1e6
        lag.par.slope2 = 1.0 / fades[k][1] if fades[k][1] > 0 else 1e6
        lag.nodeX, lag.nodeY = 500, -k * 150
        lim.outputConnectors[0].connect(lag.inputConnectors[0])
        wired[k] = lag
    rest = None
    if wired:
        wmerge = merge_into(c, list(wired.values()), 'wired', 200)
        wmerge.nodeX = 700
        wsum = c.create(mathCHOP, 'wired_sum')
        wsum.par.chanop = 'add'
        wsum.nodeX, wsum.nodeY = 900, 200
        wmerge.outputConnectors[0].connect(wsum.inputConnectors[0])
        inv = c.create(mathCHOP, 'leftover')
        inv.par.gain = -1
        inv.par.postoff = 1
        rest = c.create(limitCHOP, 'leftover_clamp')
        rest.par.type = 'clamp'
        rest.par.min = 0
        rest.par.max = 1
        inv.nodeX, rest.nodeX = 1100, 1300
        inv.nodeY = rest.nodeY = 200
        wsum.outputConnectors[0].connect(inv.inputConnectors[0])
        inv.outputConnectors[0].connect(rest.inputConnectors[0])
    ws = []
    for k in range(count):
        src = wired.get(k) or rest or constant(c, 'always%d' % k, [('on', 1)])
        w = c.create(renameCHOP, 'w%d' % k)
        w.par.renamefrom = '*'
        w.par.renameto = 'w%d' % k
        w.nodeX, w.nodeY = 1500, -k * 150
        src.outputConnectors[0].connect(w.inputConnectors[0])
        ws.append(w)
    allw = merge_into(c, ws, 'weights', 0) if ws else constant(c, 'w0', [('w0', 1)])
    allw.nodeX = 1700
    top = c.create(mathCHOP, 'top')
    top.par.chanop = 'max'
    top.nodeX, top.nodeY = 1900, -300
    allw.outputConnectors[0].connect(top.inputConnectors[0])
    ranks = []
    for k, w in enumerate(ws):
        diff = c.create(mathCHOP, 'near%d' % k)
        diff.par.chopop = 'sub'
        diff.nodeX, diff.nodeY = 2100, -k * 150
        w.outputConnectors[0].connect(diff.inputConnectors[0])
        top.outputConnectors[0].connect(diff.inputConnectors[1])
        g, lim = gate(c, 'is_top%d' % k, -0.001, 2300, -k * 150)
        diff.outputConnectors[0].connect(g.inputConnectors[0])
        rank = c.create(mathCHOP, 'rank%d' % k)
        rank.par.gain = k
        rank.nodeX, rank.nodeY = 2700, -k * 150
        lim.outputConnectors[0].connect(rank.inputConnectors[0])
        ranks.append(rank)
    rmerge = merge_into(c, ranks, 'ranks', -300) if ranks else constant(c, 'rank0', [('scene', 0)])
    rmerge.nodeX = 2900
    best = c.create(mathCHOP, 'best')
    best.par.chanop = 'max'
    best.nodeX, best.nodeY = 3100, -300
    rmerge.outputConnectors[0].connect(best.inputConnectors[0])
    name = c.create(renameCHOP, 'scene')
    name.par.renamefrom = '*'
    name.par.renameto = 'scene'
    name.nodeX, name.nodeY = 3300, -300
    best.outputConnectors[0].connect(name.inputConnectors[0])
    outm = merge_into(c, [allw, name], 'out_merge', 0)
    outm.nodeX = 3500
    out = c.create(outCHOP, 'out1')
    out.nodeX = 3700
    outm.outputConnectors[0].connect(out.inputConnectors[0])

def build_input(b, sources):
    c = new_block(b)
    ends = inputs(c, sources)
    last = mix(c, 'in', ends, -300, 0) if b['type'] == 'signal' and len(ends) > 1 else merge_into(c, ends, 'merge', 0)
    if last is None:
        last = constant(c, 'nothing', [('out', 0)])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 200
    last.outputConnectors[0].connect(out.inputConnectors[0])

build_output = build_input

def build_manual(b, scenes, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    index = by_port.get('index')
    out = c.create(outCHOP, 'out1')
    if index is None:
        const = constant(c, 'values', [('s_' + sid, 1 if k == b['active'] else 0) for k, sid in enumerate(scenes)])
        out.nodeX = 200
        const.outputConnectors[0].connect(out.inputConnectors[0])
        return
    hits = []
    for k, sid in enumerate(scenes):
        diff = c.create(mathCHOP, 'diff%d' % k)
        diff.par.preoff = -k
        sq = c.create(mathCHOP, 'square%d' % k)
        sq.par.postop = 'square'
        lim = c.create(limitCHOP, 'far%d' % k)
        lim.par.type = 'clamp'
        lim.par.min = 0
        lim.par.max = 1
        inv = c.create(mathCHOP, 'equal%d' % k)
        inv.par.gain = -1
        inv.par.postoff = 1
        name = c.create(renameCHOP, 'scene%d' % k)
        name.par.renamefrom = '*'
        name.par.renameto = 's_' + sid
        chain(diff, sq, lim, inv, name, y=-k * 150)
        index.outputConnectors[0].connect(diff.inputConnectors[0])
        hits.append(name)
    merge = merge_into(c, hits, 'merge', 0)
    merge.nodeX = 1000
    out.nodeX = 1200
    merge.outputConnectors[0].connect(out.inputConnectors[0])

def build_constant(b, sources):
    c = new_block(b)
    out = c.create(outCHOP, 'out1')
    out.nodeX = 400
    if b['pulse'] > 0:
        lfo = c.create(lfoCHOP, 'lfo')
        lfo.par.wavetype = 'square'
        lfo.par.frequency = b['pulse']
        lfo.par.amp = b['value'] / 2.0
        lfo.par.offset = b['value'] / 2.0
        name = c.create(renameCHOP, 'name')
        name.par.renamefrom = '*'
        name.par.renameto = 'out'
        chain(lfo, name, out)
        return
    const = constant(c, 'values', [('out', b['value'])])
    const.outputConnectors[0].connect(out.inputConnectors[0])

def edge_counter(c, name, trigger, reset, x, y):
    cnt = c.create(countCHOP, name)
    cnt.par.threshold = False
    cnt.par.threshup = 0.5
    cnt.par.threshdown = 0.25
    cnt.par.offtoon = 'inc'
    cnt.par.output = 'off'
    cnt.nodeX, cnt.nodeY = x, y
    trigger.outputConnectors[0].connect(cnt.inputConnectors[0])
    if reset is not None:
        cnt.par.resetcondition = 'on'
        reset.outputConnectors[0].connect(cnt.inputConnectors[1])
    return cnt

def build_latch(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    s = by_port.get('set') or constant(c, 'noset', [('set', 0)])
    r = by_port.get('reset')
    cnt = edge_counter(c, 'count', s, r, 0, 0)
    g, lim = gate(c, 'latched', 0.5, 200, 0)
    cnt.outputConnectors[0].connect(g.inputConnectors[0])
    hold = c.create(lagCHOP, 'hold')
    hold.par.lagunit = 'seconds'
    hold.par.lag1 = 0
    hold.par.lag2 = 0.25
    hold.nodeX = 600
    lim.outputConnectors[0].connect(hold.inputConnectors[0])
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'out'
    name.nodeX = 800
    hold.outputConnectors[0].connect(name.inputConnectors[0])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 1000
    name.outputConnectors[0].connect(out.inputConnectors[0])

def build_and(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    a = by_port.get('a') or constant(c, 'noa', [('a', 0)])
    bb = by_port.get('b') or constant(c, 'nob', [('b', 0)])
    if kept(sources) == ['b']:
        a, bb = bb, a
    mul = c.create(mathCHOP, 'both')
    mul.par.chopop = 'mul'
    mul.nodeX = 0
    a.outputConnectors[0].connect(mul.inputConnectors[0])
    bb.outputConnectors[0].connect(mul.inputConnectors[1])
    finish(c, named(c, sources, mul, 'out', 200), 400)

def build_fade(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('signal') or constant(c, 'nosignal', [('signal', 0)])
    lag = c.create(lagCHOP, 'ramp')
    lag.par.lagunit = 'seconds'
    if b['curve'] == 'smooth':
        lag.par.lag1 = b['rise'] / 3.0
        lag.par.lag2 = b['fall'] / 3.0
    else:
        lag.par.lag1 = 0
        lag.par.lag2 = 0
        lag.par.clamp = True
        lag.par.slope1 = 1.0 / b['rise'] if b['rise'] > 0 else 1e6
        lag.par.slope2 = 1.0 / b['fall'] if b['fall'] > 0 else 1e6
    src.outputConnectors[0].connect(lag.inputConnectors[0])
    finish(c, named(c, sources, lag, 'out', 200), 400)

def build_mix(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    blank = [('Red', 0), ('Green', 0), ('Blue', 0)] if b['type'] == 'color' else [('out', 0)]
    a = by_port.get('a') or constant(c, 'noa', blank)
    z = by_port.get('b') or constant(c, 'nob', blank)
    m = by_port.get('mix') or constant(c, 'nomix', [('mix', 0)])
    inv = c.create(mathCHOP, 'inverse')
    inv.par.gain = -1
    inv.par.postoff = 1
    m.outputConnectors[0].connect(inv.inputConnectors[0])
    pa = c.create(mathCHOP, 'a_part')
    pa.par.chopop = 'mul'
    a.outputConnectors[0].connect(pa.inputConnectors[0])
    inv.outputConnectors[0].connect(pa.inputConnectors[1])
    pb = c.create(mathCHOP, 'b_part')
    pb.par.chopop = 'mul'
    z.outputConnectors[0].connect(pb.inputConnectors[0])
    m.outputConnectors[0].connect(pb.inputConnectors[1])
    total = c.create(mathCHOP, 'total')
    total.par.chopop = 'add'
    first, second = (pb, pa) if kept(sources) == ['b'] else (pa, pb)
    first.outputConnectors[0].connect(total.inputConnectors[0])
    second.outputConnectors[0].connect(total.inputConnectors[1])
    for k, o in enumerate((inv, pa, pb, total)):
        o.nodeX, o.nodeY = k * 200, -100
    finish(c, total if b['type'] == 'color' else named(c, sources, total, 'out', 800), 1000)

def build_not(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('signal') or constant(c, 'nosignal', [('signal', 0)])
    inv = c.create(mathCHOP, 'invert')
    inv.par.gain = -1
    inv.par.postoff = 1
    clamp = c.create(limitCHOP, 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    chain(inv, clamp)
    src.outputConnectors[0].connect(inv.inputConnectors[0])
    finish(c, named(c, sources, clamp, 'out', 400), 600)

def build_combine(b, sources, wide):
    c = new_block(b)
    feeds = []
    for k, (port, feed) in enumerate(sorted(ports(c, sources).items(), key=lambda kv: int(kv[0][1:]))):
        ren = c.create(renameCHOP, 'slot_' + port)
        ren.par.renamefrom = '*'
        ren.par.renameto = port + '_*' if wide else port
        ren.nodeX, ren.nodeY = -100, -k * 100
        feed.outputConnectors[0].connect(ren.inputConnectors[0])
        feeds.append(ren)
    finish(c, merge_into(c, feeds, 'merge', 0) or constant(c, 'nothing', [('none', 0)]), 200)

def build_split(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('in') or constant(c, 'nothing', [('none', 0)])
    finish(c, src, 200)

def build_counter(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    t = by_port.get('trigger') or constant(c, 'notrigger', [('trigger', 0)])
    cnt = edge_counter(c, 'count', t, by_port.get('reset'), 0, 0)
    lim = c.create(limitCHOP, 'clamp')
    lim.par.type = 'clamp'
    lim.par.min = 0
    lim.par.max = b['max']
    lim.nodeX = 200
    cnt.outputConnectors[0].connect(lim.inputConnectors[0])
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'count'
    name.nodeX = 400
    lim.outputConnectors[0].connect(name.inputConnectors[0])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 600
    name.outputConnectors[0].connect(out.inputConnectors[0])

def build_equals(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    index = by_port.get('index') or constant(c, 'noindex', [('index', -1)])
    diff = c.create(mathCHOP, 'diff')
    diff.par.preoff = -b['value']
    sq = c.create(mathCHOP, 'square')
    sq.par.postop = 'square'
    lim = c.create(limitCHOP, 'far')
    lim.par.type = 'clamp'
    lim.par.min = 0
    lim.par.max = 1
    inv = c.create(mathCHOP, 'equal')
    inv.par.gain = -1
    inv.par.postoff = 1
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'equal'
    chain(diff, sq, lim, inv, name, c.create(outCHOP, 'out1'))
    index.outputConnectors[0].connect(diff.inputConnectors[0])

def code(c, name, text):
    d = c.create(textDAT, name)
    d.text = text
    d.nodeX, d.nodeY = -800, 400
    return d

def script(c, name, callbacks, ends, cfg, x=0, y=0):
    s = c.create(scriptCHOP, name)
    s.par.callbacks = callbacks
    s.nodeX, s.nodeY = x, y
    for e in ends:
        e.outputConnectors[0].connect(s)
    s.store('cfg', cfg)
    return s

def build_strip(b, sources, cfg):
    c = new_block(b)
    ends = []
    for k, (port, end) in enumerate(ports(c, sources).items()):
        n = c.create(nullCHOP, 'p_' + port)
        n.nodeX, n.nodeY = 0, -k * 100
        end.outputConnectors[0].connect(n.inputConnectors[0])
        ends.append(n)
    finish(c, script(c, 'params', code(c, 'params_code', ${JSON.stringify(STRIP_CODE)}), ends, cfg, 200), 400)

def build_tube(b, sources, geo):
    c = new_block(b)
    ends = inputs(c, sources)
    cfg = dict(geo, n=b['leds'], sources=[{'mode': src.get('mode'), 'along': src.get('along'), 'scene': src['scene']} for src in sources])
    finish(c, script(c, 'pixels', code(c, 'pixels_code', ${JSON.stringify(TUBE_CODE)}), ends, cfg, 200), 400)

def build_board(b, sources, plan):
    c = new_block(b)
    ends = inputs(c, sources)
    callbacks = code(c, 'patch_code', ${JSON.stringify(BOARD_CODE)})
    for k, (u, parts) in enumerate(plan):
        patch = script(c, 'patch_u%d' % u, callbacks, ends, {'parts': parts}, 0, -k * 200)
        dmx = c.create(dmxoutCHOP, 'dmxout_u%d' % u)
        dmx.par.interface = 'artnet'
        dmx.par.format = 'packetpersample'
        dmx.par.universe = u
        dmx.par.netaddress = b['ip']
        dmx.par.active = b['active']
        dmx.par.rate = 40
        dmx.nodeX, dmx.nodeY = 200, -k * 200
        patch.outputConnectors[0].connect(dmx.inputConnectors[0])

def build_artnet(b, sources):
    c = new_block(b)
    ends = inputs(c, sources)
    by_universe = {}
    for src, end in zip(sources, ends):
        by_universe.setdefault(src['port'], []).append(end)
    for k, u in enumerate(b['universes']):
        y = -k * 300
        base = c.create(constantCHOP, 'base_u%d' % u)
        base.par.const0name = 'c[1-512]'
        base.par.const0value = 0
        patch = c.create(replaceCHOP, 'patch_u%d' % u)
        dmx = c.create(dmxoutCHOP, 'dmxout_u%d' % u)
        dmx.par.interface = b['protocol']
        dmx.par.format = 'packetpersample'
        dmx.par.universe = u
        dmx.par.netaddress = b['ip']
        dmx.par.active = b['active']
        dmx.par.rate = 40
        chain(base, patch, dmx, y=y)
        merge = merge_into(c, by_universe.get('u%d' % u, []), 'merge_u%d' % u, y - 150)
        if merge:
            merge.outputConnectors[0].connect(patch.inputConnectors[1])
`


export const colorTable = (b: ColorsBlock): [string, number][][] => Array.from({ length: b.steps }, (_, k) => b.rows.flatMap((r, i) => hexToRgb(r.colors[k] ?? '#000000').map((v, ch): [string, number] => [`c${i}_${['Red', 'Green', 'Blue'][ch]}`, v])))
export const valueTable = (b: ValuesBlock): [string, number][][] => Array.from({ length: b.steps }, (_, k) => b.rows.map((r, i): [string, number] => [`v${i}`, r.values[k] ?? 0]))
const stripConfig = (b: StripBlock) => ({ mode: b.mode, rgb: hexToRgb(b.color), dimmer: b.dimmer, position: b.position, width: b.width, speed: b.speed, spread: b.spread, stops: b.mode === 'ramp' ? b.stops.map((s) => [s.at, hexToRgb(s.color)]) : [] })

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
    if (block.kind === 'board') return (`build_board(${j(b)}, ${sources}, ${j(boardPlan(show, block).plan)})`)
    if (block.kind === 'tube') return (`build_tube(${j(b)}, ${sources}, ${j(tubeGeometry(show, block))})`)
    if (block.kind === 'strip') return (`build_strip(${j(b)}, ${sources}, ${j(stripConfig(block))})`)
    if (block.kind === 'fixture') return (`build_fixture(${j(b)}, ${j(profileOf(block))}, ${sources})`)
    if (block.kind === 'light') return (`build_light(${j(b)}, ${j(profileOf(block))}, ${sources})`)
    if (block.kind === 'dmxin') {
      const patch = controllerPatch(show, block.id)
      const node = show.blocks.find((b): b is ArtnetBlock => b.kind === 'artnet' && b.id === patch?.node)
      return (`build_dmxin(${j(b)}, ${sources}, ${j(node?.protocol ?? 'artnet')}, ${j(node ? patch!.universe : null)})`)
    }
    if (block.kind === 'manual') return (`build_manual(${j(b)}, ${j(scenesOf(show).map((s) => s.id))}, ${sources})`)
    if (block.kind === 'pattern') return (`build_pattern(${j(b)}, ${sources}, ${j(patternMasks(block.mode, block.slots))})`)
    if (block.kind === 'looks') return (`build_scenes(${j(b)}, ${sources}, ${j(block.scenes.map((s) => [...hexToRgb(s.color), ...s.window]))})`)
    if (block.kind === 'colors') {
      const table = colorTable(block)
      return (`build_colors(${j(b)}, ${sources}, ${j(table)})`)
    }
    if (block.kind === 'combine') return (`build_combine(${j(b)}, ${sources}, ${j(WIDE_TYPES.includes(combineSlots(show, block)[0]?.type ?? ''))})`)
    if (block.kind === 'values') return (`build_values(${j(b)}, ${sources}, ${j(valueTable(block))})`)
    if (block.kind === 'sequence') return (`build_sequence(${j(b)}, ${sources}, ${j(sequenceValues(block))})`)
    if (block.kind === 'group') {
      const members = Array.from({ length: block.size }, (_, i) => ({ id: String(i), aim: block.aims[i] ?? {} }))
      return (`build_group(${j(b)}, ${j(profileOf(block))}, ${sources}, ${j(patternMasks(block.mode, members.length))}, ${j(members)})`)
    }
    return (`build_${block.kind}(${j(b)}, ${sources})`)
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
    return this.run<null>(`find(${JSON.stringify(block.id)}).op('params').store('cfg', ${j(stripConfig(block))})`)
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
