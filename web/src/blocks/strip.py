SHAPE_SAMPLES = 4096
SHAPES = {'solid': (0, 1, False), 'band': (-1, 1, False), 'fill': (-2, 2, False), 'chase': (-0.5, 0.5, True), 'ramp': (0, 1, True)}

def set_strip(c, cfg):
    wired = [o.name[2:] for o in c.ops('p_*')]
    def num(port, v):
        return "op('p_%s')[0]" % port if port in wired else repr(v)
    dim = num('dimmer', cfg['dimmer'])
    def rgb(port, v):
        return ["op('p_%s')[%d] * %s" % (port, k, dim) if port in wired else '%r * %s' % (x, dim) for k, x in enumerate(v)]
    pos = num('position', cfg['position'])
    if c.op('phase'):
        c.op('speed').par.const0value.expr = num('speed', cfg['speed'])
        pos = "%s + op('phase')[0]" % pos
    chans = [('pos', pos), ('spread', num('spread', cfg['spread']))]
    if cfg['mode'] != 'ramp':
        chans = list(zip(('Red', 'Green', 'Blue'), rgb('color', cfg['rgb']))) + chans
    params = c.op('params')
    params.seq.const.numBlocks = len(chans)
    for i, (name, text) in enumerate(chans):
        params.par['const%dname' % i] = name
        params.par['const%dvalue' % i].expr = text
    if c.op('mask'):
        c.op('mask').par.gain.expr = '-1 / max(%s, 0.001)' % num('width', cfg['width'])
    if c.op('keys'):
        keys = c.op('keys')
        keys.clear()
        stops = [['float(%s)' % num('at%d' % k, at)] + rgb('stop%d' % k, color) for k, (at, color) in enumerate(cfg['stops'])] or [['0', '0', '0', '0']]
        both = '[%s]' % ', '.join('(%s)' % ', '.join(s) for s in stops)
        ends = [[str(x)] + ['%s(%s)[%d]' % (f, both, k) for k in (1, 2, 3)] for x, f in ((0, 'min'), (1, 'max'))]
        keys.appendRows([row + ['1'] for row in ends[:1] + stops + ends[1:]])

def ramp_shape(c):
    keys = c.create(tableDAT, 'keys')
    values = c.create(evaluateDAT, 'values')
    values.par.output = 'evaluate'
    order = c.create(sortDAT, 'sorted')
    order.par.sortmethod = 'colindex'
    order.par.index = 0
    order.par.order = 'nums'
    ramp = c.create(rampTOP, 'ramp')
    ramp.par.dat = order
    ramp.par.type = 'horizontal'
    ramp.par.extendleft = 'hold'
    ramp.par.extendright = 'hold'
    ramp.par.outputresolution = 'custom'
    ramp.par.resolutionw = SHAPE_SAMPLES
    ramp.par.resolutionh = 1
    ramp.par.format = 'rgba32float'
    shape = c.create(toptoCHOP, 'shape')
    shape.par.top = ramp
    shape.par.r, shape.par.g, shape.par.b, shape.par.a = 'Red', 'Green', 'Blue', ''
    shape.par.left = shape.par.right = 'cycle'
    chain(keys, values, order, y=-300)
    ramp.nodeX, ramp.nodeY = 600, -300
    shape.nodeX, shape.nodeY = 800, -300
    return shape

def mask_shape(c, params, mode):
    lo, hi, cyclic = SHAPES[mode]
    pattern = c.create(patternCHOP, 'pattern')
    pattern.par.wavetype = 'rampcyclic' if cyclic else 'ramp'
    pattern.par.length = SHAPE_SAMPLES
    pattern.par.torange1, pattern.par.torange2 = lo, hi
    pattern.par.channelname = 'Red Green Blue'
    pattern.par.left = pattern.par.right = 'cycle' if cyclic else 'hold'
    mask = c.create(mathCHOP, 'mask')
    mask.par.preop = 'off' if mode == 'fill' else 'pos'
    mask.par.postoff = 1
    clamp = c.create(limitCHOP, 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    shape = c.create(mathCHOP, 'shape')
    shape.par.chopop = 'mul'
    shape.par.match = 'name'
    chain(pattern, mask, clamp, shape, y=-300)
    params.outputConnectors[0].connect(shape.inputConnectors[1])
    return shape

def build_strip(b, sources, cfg):
    c = new_block(b)
    for k, (port, end) in enumerate(ports(c, sources).items()):
        n = c.create(nullCHOP, 'p_' + port)
        n.nodeX, n.nodeY = 0, -k * 100
        end.outputConnectors[0].connect(n.inputConnectors[0])
    mode = cfg['mode']
    if mode in ('chase', 'ramp'):
        phase = c.create(speedCHOP, 'phase')
        phase.par.limittype = 'loop'
        chain(constant(c, 'speed', [('phase', 0)]), phase, y=300)
    params = c.create(constantCHOP, 'params')
    params.nodeX = 200
    last = params
    if mode != 'solid':
        shape = ramp_shape(c) if mode == 'ramp' else mask_shape(c, params, mode)
        last = merge_into(c, [shape, params], 'shape_params', -150)
        last.par.duplicate = 'first'
        last.nodeX = 1000
    set_strip(c, cfg)
    finish(c, last, 1200)
