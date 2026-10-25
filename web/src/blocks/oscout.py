def build_oscout(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('in') or constant(c, 'novalue', [('value', 0)])
    scale = c.create(mathCHOP, 'scale')
    scale.par.gain = b['scale']
    name = c.create(renameCHOP, 'address')
    name.par.renamefrom = '*'
    name.par.renameto = b['address'].lstrip('/') or 'value'
    osc = c.create(oscoutCHOP, 'oscout1')
    osc.par.netaddress = b['host']
    osc.par.port = b['port']
    osc.par.numericformat = 'float'
    chain(scale, name, osc)
    if b.get('glide'):
        glide = c.create(lagCHOP, 'glide')
        glide.par.lagunit = 'seconds'
        glide.par.lag1 = b['glide'] / 3.0
        glide.par.lag2 = b['glide'] / 3.0
        glide.nodeY = 150
        src.outputConnectors[0].connect(glide.inputConnectors[0])
        src = glide
    src.outputConnectors[0].connect(scale.inputConnectors[0])
