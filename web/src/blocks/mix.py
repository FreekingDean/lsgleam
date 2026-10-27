def build_mix(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    blank = [(n, 0) for n in COLOR_CHANS] if b['type'] == 'color' else [('out', 0)]
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
