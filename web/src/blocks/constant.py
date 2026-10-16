def build_constant(b, sources):
    c = new_block(b)
    out = c.create(outCHOP, 'out1')
    out.nodeX = 400
    if b['pulse'] > 0:
        lfo = c.create(lfoCHOP, 'lfo')
        lfo.par.wavetype = 'square'
        lfo.par.frequency = b['pulse']
        lfo.par.amp = b['value'] / 2.0
        lfo.par.offset = b['value'] / 2.0
        name = c.create(renameCHOP, 'name')
        name.par.renamefrom = '*'
        name.par.renameto = 'out'
        chain(lfo, name, out)
        return
    const = constant(c, 'values', [('out', b['value'])])
    const.outputConnectors[0].connect(out.inputConnectors[0])
