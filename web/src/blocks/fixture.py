def build_fixture(b, profile, sources):
    c = new_block(b)
    pairs = [(ch['name'], b['values'][i]) for i, ch in enumerate(profile['channels'])]
    home = constant(c, 'default_channels', pairs)
    home.nodeX, home.nodeY = -1400, 600
    blend = ports(c, sources, {'channels': home}).get('channels') or home
    scale = c.create(mathCHOP, 'scale')
    scale.par.torange2 = 255
    scale.par.integer = 'round'
    addr = c.create(renameCHOP, 'address')
    addr.par.renamefrom = ' '.join(n for n, v in pairs)
    addr.par.renameto = ' '.join('c%d' % (b['address'] + i) for i in range(len(pairs)))
    chain(scale, addr)
    blend.outputConnectors[0].connect(scale.inputConnectors[0])
    finish(c, addr, 600)
