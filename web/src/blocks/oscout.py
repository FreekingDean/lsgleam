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
    src.outputConnectors[0].connect(scale.inputConnectors[0])
