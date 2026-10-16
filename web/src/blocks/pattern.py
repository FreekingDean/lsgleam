def build_pattern(b, sources, masks):
    c = new_block(b)
    by_port = ports(c, sources)
    last = pattern_chain(c, by_port.get('step'), by_port.get('trigger'), masks, by_port.get('signal'), 0, b['every'], floor_of(c, b, by_port))
    out = c.create(outCHOP, 'out1')
    out.nodeX = 600
    last.outputConnectors[0].connect(out.inputConnectors[0])
