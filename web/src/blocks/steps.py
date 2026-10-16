def build_steps(b, sources):
    c = new_block(b)
    merge = merge_into(c, inputs(c, sources)) or constant(c, 'silence', [('signal', 0)])
    scale = c.create(mathCHOP, 'scale')
    scale.par.gain = b['steps']
    quant = c.create(limitCHOP, 'quant')
    quant.par.type = 'clamp'
    quant.par.min = 0
    quant.par.max = b['steps'] - 1
    quant.par.quantvalue = 'floor'
    quant.par.vstep = 1
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'index'
    chain(scale, quant, name, c.create(outCHOP, 'out1'))
    merge.outputConnectors[0].connect(scale.inputConnectors[0])
