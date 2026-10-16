def build_hold(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    trigger = by_port.get('trigger') or constant(c, 'notrigger', [('trigger', 0)])
    beat = by_port.get('beat') or constant(c, 'nobeat', [('beat', 0)])
    since = c.create(countCHOP, 'since')
    since.par.threshold = False
    since.par.threshup = 0.1
    since.par.threshdown = 0.05
    since.par.offtoon = 'inc'
    since.par.output = 'off'
    since.par.resetcondition = 'on'
    since.nodeX, since.nodeY = 0, 0
    beat.outputConnectors[0].connect(since.inputConnectors[0])
    trigger.outputConnectors[0].connect(since.inputConnectors[1])
    inv = c.create(mathCHOP, 'remaining')
    inv.par.gain = -1
    inv.par.postoff = b['beats']
    inv.nodeX = 200
    since.outputConnectors[0].connect(inv.inputConnectors[0])
    g, lim = gate(c, 'hold_lim', 0.5, 400, 0)
    inv.outputConnectors[0].connect(g.inputConnectors[0])
    fired = edge_counter(c, 'fired', trigger, None, 0, -150)
    fg, flim = gate(c, 'fired_once', 0.5, 200, -150)
    fired.outputConnectors[0].connect(fg.inputConnectors[0])
    both = c.create(mathCHOP, 'both')
    both.par.chopop = 'mul'
    both.nodeX = 700
    lim.outputConnectors[0].connect(both.inputConnectors[0])
    flim.outputConnectors[0].connect(both.inputConnectors[1])
    name = c.create(renameCHOP, 'hold')
    name.par.renamefrom = '*'
    name.par.renameto = 'hold'
    name.nodeX = 800
    both.outputConnectors[0].connect(name.inputConnectors[0])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 1000
    name.outputConnectors[0].connect(out.inputConnectors[0])
