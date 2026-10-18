def build_board(b, sources, slots):
    c = new_block(b)
    ends = inputs(c, sources)
    if ends:
        join = c.create(joinCHOP, 'chain')
        for e in ends:
            e.outputConnectors[0].connect(join)
        pixels = c.create(shuffleCHOP, 'pixels')
        pixels.par.method = 'swap'
        stream = c.create(shuffleCHOP, 'stream')
        stream.par.method = 'seqall'
        chain(join, pixels, stream, y=200)
    else:
        stream = constant(c, 'stream', [('dark', 0)])
    pad = c.create(extendCHOP, 'pad')
    pad.par.left = 'default'
    pad.nodeX, pad.nodeY = 600, 200
    stream.outputConnectors[0].connect(pad.inputConnectors[0])
    table = c.create(tableDAT, 'slots')
    table.clear()
    table.appendRows([[s] for s in slots])
    index = c.create(dattoCHOP, 'slot_index')
    index.par.dat = table
    index.par.output = 'chanpercol'
    index.par.firstrow = 'values'
    index.par.firstcolumn = 'values'
    gather = c.create(lookupCHOP, 'gather')
    gather.par.index1 = 0
    gather.par.index2.expr = "max(op('stream').numSamples - 1, 1)"
    gather.par.cyclic = 'no'
    gather.par.left = 'default'
    gather.par.right = 'hold'
    universes = c.create(shuffleCHOP, 'universes')
    universes.par.method = 'splitn'
    universes.par.nval = 512
    clamp = c.create(limitCHOP, 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    byte = c.create(mathCHOP, 'bytes')
    byte.par.gain = 255
    byte.par.integer = 'round'
    dmx = c.create(dmxoutCHOP, 'dmxout')
    dmx.par.interface = 'artnet'
    dmx.par.format = 'packetperchan'
    dmx.par.universe = b['startUniverse']
    dmx.par.netaddress = b['ip']
    dmx.par.active = b['active']
    dmx.par.rate = 40
    table.nodeX, table.nodeY = 0, -200
    chain(index, gather, universes, clamp, byte, dmx)
    pad.outputConnectors[0].connect(gather.inputConnectors[1])
