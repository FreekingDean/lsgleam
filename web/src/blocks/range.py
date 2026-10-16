def build_range(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    signal = by_port.get('signal') or constant(c, 'nosignal', [('signal', 0)])
    def drive(par, port, v, fn='%s'):
        if port in by_port:
            par.expr = fn % ("op('%s')[0]" % by_port[port].name)
        else:
            par.val = v
    sides = []
    for k, side in enumerate(('tame', 'wild')):
        m = c.create(mathCHOP, side)
        m.nodeX, m.nodeY = 0, -k * 150
        drive(m.par.torange1, side + 'Min', b[side][0])
        drive(m.par.torange2, side + 'Max', b[side][1])
        signal.outputConnectors[0].connect(m.inputConnectors[0])
        sides.append(m)
    cross = c.create(crossCHOP, 'cross')
    cross.nodeX = 200
    drive(cross.par.cross, 'amount', 0, 'tdu.clamp(%s, 0, 1)')
    for m in sides:
        m.outputConnectors[0].connect(cross)
    finish(c, named(c, sources, cross, 'signal', 400), 600)
