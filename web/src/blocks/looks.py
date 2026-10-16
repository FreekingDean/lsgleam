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
