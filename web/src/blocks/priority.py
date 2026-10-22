def build_priority(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    ups = []
    for k in range(len(b['names'])):
        src = by_port.get('in%d' % (k + 1))
        if src is None:
            continue
        g, lim = gate(c, 'up%d' % (k + 1), 0.5, 0, -k * 150)
        src.outputConnectors[0].connect(g.inputConnectors[0])
        w = c.create(mathCHOP, 'rank%d' % (k + 1))
        w.par.gain = k + 1
        w.nodeX, w.nodeY = 400, -k * 150
        lim.outputConnectors[0].connect(w.inputConnectors[0])
        ups.append(w)
    top = combine(c, 'top', 'max', ups or [constant(c, 'none', [('index', 0)])], 600, 0)
    top.par.match = 'index'
    index = c.create(mathCHOP, 'index')
    index.par.postoff = -1
    clamp = c.create(limitCHOP, 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = max(len(b['names']) - 1, 0)
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'index'
    chain(index, clamp, name, c.create(outCHOP, 'out1'), y=-300)
    top.outputConnectors[0].connect(index.inputConnectors[0])
