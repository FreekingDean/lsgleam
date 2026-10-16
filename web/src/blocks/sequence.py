def build_sequence(b, sources, values):
    c = new_block(b)
    by_port = ports(c, sources)
    sw, wrap, counter = indexed_switch(c, 'value', None, by_port.get('trigger'), len(values), 0, b['every'])
    if counter is not None and 'reset' in by_port:
        counter.par.resetcondition = 'offtoon'
        by_port['reset'].outputConnectors[0].connect(counter.inputConnectors[1])
    for k, v in enumerate(values):
        const = constant(c, 'v%d' % (k + 1), [('value', v)])
        const.nodeX, const.nodeY = 0, 100 + k * 100
        const.outputConnectors[0].connect(sw)
    out = c.create(outCHOP, 'out1')
    out.nodeX = 400
    sw.outputConnectors[0].connect(out.inputConnectors[0])
