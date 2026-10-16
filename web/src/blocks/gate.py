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
