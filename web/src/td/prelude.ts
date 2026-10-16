import STRIP_CODE from './strip.py?raw'
import TUBE_CODE from './tube.py?raw'
import BOARD_CODE from './board.py?raw'
import { BLT_SIGNALS } from '../model/catalog'
import { BLOCKS } from '../blocks'

export const j = (v: unknown) => `json.loads(${JSON.stringify(JSON.stringify(v))})`

const BLT_INDEXED = BLT_SIGNALS.filter((s) => s.type === 'index').map((s) => s.id)

export const PRELUDE = `
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

${BLOCKS.level.python}
${BLOCKS.gate.python}
${BLOCKS.steps.python}
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

${BLOCKS.drop.python}
${BLOCKS.hold.python}
${BLOCKS.range.python}
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

${BLOCKS.constant.python}
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

${BLOCKS.latch.python}
${BLOCKS.and.python}
${BLOCKS.fade.python}
${BLOCKS.mix.python}
${BLOCKS.not.python}
${BLOCKS.combine.python}
def build_split(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('in') or constant(c, 'nothing', [('none', 0)])
    finish(c, src, 200)

${BLOCKS.counter.python}
${BLOCKS.timer.python}
${BLOCKS.equals.python}
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
