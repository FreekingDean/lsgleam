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
