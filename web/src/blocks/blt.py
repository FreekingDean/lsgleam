def build_blt(b, sources):
    c = new_block(b)
    osc = osc_in(c, b['port'])
    decks = (['master'] if b['master'] else []) + ['%d' % d for d in range(1, b['decks'] + 1)]
    names = c.create(renameCHOP, 'names')
    names.par.renamefrom = ' '.join('*?%s?%s' % (d, s) for d in decks for s in b['signals'])
    names.par.renameto = ' '.join('%s_%s' % (d if d == 'master' else 'd' + d, s) for d in decks for s in b['signals'])
    chain(osc, names)
    branches = []
    for k, sig in enumerate(BLT_INDEXED):
        sel = c.create(selectCHOP, sig)
        sel.par.channames = '*_%s' % sig
        math = c.create(mathCHOP, sig + '_zero')
        math.par.preoff = -1
        sel.nodeX, math.nodeX = 400, 600
        sel.nodeY = math.nodeY = -k * 150
        names.outputConnectors[0].connect(sel.inputConnectors[0])
        sel.outputConnectors[0].connect(math.inputConnectors[0])
        branches.append(math)
    rest = c.create(selectCHOP, 'rest')
    rest.par.channames = ' '.join('*_%s' % s for s in b['signals'] if s not in BLT_INDEXED)
    rest.nodeX, rest.nodeY = 400, -len(branches) * 150
    names.outputConnectors[0].connect(rest.inputConnectors[0])
    merge = merge_into(c, branches + [rest])
    merge.nodeX, merge.nodeY = 800, 0
    out = c.create(outCHOP, 'out1')
    out.nodeX = 1000
    merge.outputConnectors[0].connect(out.inputConnectors[0])
