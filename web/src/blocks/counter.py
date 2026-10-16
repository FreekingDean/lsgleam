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
