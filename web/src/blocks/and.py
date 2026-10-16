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
