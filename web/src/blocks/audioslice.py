def build_audioslice(b, sources):
    c = new_block(b)
    osc = osc_in(c, b['port'])
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = ' '.join('*' + s.replace('/', '?') for s in b['signals'])
    names.par.renameto = ' '.join(s.replace('/', '_') for s in b['signals'])
    sel = c.create(selectCHOP, 'signals')
    sel.par.channames = names.par.renameto
    chain(osc, names, sel, c.create(outCHOP, 'out1'))
