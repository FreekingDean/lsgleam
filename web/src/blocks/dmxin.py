def build_dmxin(b, sources, protocol, universe):
    c = new_block(b)
    dmx = c.create(dmxinCHOP, 'dmxin1')
    dmx.par.interface = protocol
    dmx.par.format = 'packetpersample'
    dmx.par.universe = universe or 0
    dmx.par.active = universe is not None
    data = c.create(deleteCHOP, 'data')
    data.par.delchannels = True
    data.par.select = 'bynum'
    data.par.selnumbers = '[1-512]'
    data.par.discard = 'nonscoped'
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = '*'
    names.par.renameto = 'ch[1-512]'
    faders = c.create(selectCHOP, 'faders')
    faders.par.channames = 'ch[1-%d]' % b['channels']
    norm = c.create(mathCHOP, 'norm')
    norm.par.fromrange2 = 255
    chain(dmx, data, names, faders, norm, c.create(outCHOP, 'out1'))
