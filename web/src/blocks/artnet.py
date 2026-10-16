def build_artnet(b, sources):
    c = new_block(b)
    ends = inputs(c, sources)
    by_universe = {}
    for src, end in zip(sources, ends):
        by_universe.setdefault(src['port'], []).append(end)
    for k, u in enumerate(b['universes']):
        y = -k * 300
        base = c.create(constantCHOP, 'base_u%d' % u)
        base.par.const0name = 'c[1-512]'
        base.par.const0value = 0
        patch = c.create(replaceCHOP, 'patch_u%d' % u)
        dmx = c.create(dmxoutCHOP, 'dmxout_u%d' % u)
        dmx.par.interface = b['protocol']
        dmx.par.format = 'packetpersample'
        dmx.par.universe = u
        dmx.par.netaddress = b['ip']
        dmx.par.active = b['active']
        dmx.par.rate = 40
        chain(base, patch, dmx, y=y)
        merge = merge_into(c, by_universe.get('u%d' % u, []), 'merge_u%d' % u, y - 150)
        if merge:
            merge.outputConnectors[0].connect(patch.inputConnectors[1])
