def build_audioslice(b, sources):
    c = new_block(b)
    osc = osc_in(c, b['port'])
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = ' '.join('*' + s.replace('/', '?') for s in b['signals'])
    names.par.renameto = ' '.join(s.replace('/', '_') for s in b['signals'])
    chain(osc, names)
    silent = constant(c, 'silent', [(s.replace('/', '_'), 0) for s in b['signals']])
    silent.nodeX, silent.nodeY = 200, -150
    live = merge_into(c, [silent, names], 'live', 0)
    live.nodeX = 400
    sel = c.create(selectCHOP, 'signals')
    sel.par.channames = names.par.renameto
    live.outputConnectors[0].connect(sel.inputConnectors[0])
    finish(c, sel, 800)
    sel.nodeX = 600
