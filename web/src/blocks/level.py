def build_level(b, sources):
    c = new_block(b)
    merge = merge_into(c, inputs(c, sources)) or constant(c, 'silence', [('signal', 0)])
    rms = c.create(analyzeCHOP, 'rms')
    rms.par.function = 'rmspower'
    mono = c.create(mathCHOP, 'mono')
    mono.par.chanop = 'avg'
    smooth = c.create(lagCHOP, 'smooth')
    smooth.par.lag1 = b['attack']
    smooth.par.lag2 = b['release']
    gain = c.create(mathCHOP, 'gain')
    gain.par.gain = b['gain']
    clamp = c.create(limitCHOP, 'clamp')
    clamp.par.type = 'clamp'
    clamp.par.min = 0
    clamp.par.max = 1
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'level'
    chain(rms, mono, smooth, gain, clamp, name, c.create(outCHOP, 'out1'))
    merge.outputConnectors[0].connect(rms.inputConnectors[0])
