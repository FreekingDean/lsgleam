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
