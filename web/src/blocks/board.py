def build_board(b, sources, plan):
    c = new_block(b)
    ends = inputs(c, sources)
    callbacks = code(c, 'patch_code', BOARD_CODE)
    for k, (u, parts) in enumerate(plan):
        patch = script(c, 'patch_u%d' % u, callbacks, ends, {'parts': parts}, 0, -k * 200)
        dmx = c.create(dmxoutCHOP, 'dmxout_u%d' % u)
        dmx.par.interface = 'artnet'
        dmx.par.format = 'packetpersample'
        dmx.par.universe = u
        dmx.par.netaddress = b['ip']
        dmx.par.active = b['active']
        dmx.par.rate = 40
        dmx.nodeX, dmx.nodeY = 200, -k * 200
        patch.outputConnectors[0].connect(dmx.inputConnectors[0])
