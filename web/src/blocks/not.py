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
