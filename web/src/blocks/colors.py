def build_colors(b, sources, table):
    c = new_block(b)
    by_port = ports(c, sources)
    sw, wrap, counter = indexed_switch(c, 'step', by_port.get('index'), None, len(table), 0)
    for k, pairs in enumerate(table):
        const = constant(c, 'step%d' % (k + 1), pairs)
        const.nodeX, const.nodeY = 0, 100 + k * 100
        const.outputConnectors[0].connect(sw)
    finish(c, sw, 400)
