def build_counter(b, sources, cycle=None):
    c = new_block(b)
    by_port = ports(c, sources)
    t = by_port.get('trigger') or constant(c, 'notrigger', [('trigger', 0)])
    cnt = edge_counter(c, 'count', t, by_port.get('reset'), 0, 0)
    end = b.get('end', 'clamp')
    every = max(int(b.get('every', 1)), 1)
    period = {'wrap': b['max'] + 1, 'bounce': max(2 * b['max'], 1), 'steps': len(cycle or [0])}.get(end)
    last = cnt
    if period:
        cnt.par.output = 'loop'
        cnt.par.limitmin = 0
        cnt.par.limitmax = period * every - 1
    if every > 1:
        div = c.create(mathCHOP, 'every')
        div.par.gain = 1.0 / every
        div.par.integer = 'floor'
        chain(cnt, div, y=-100)
        last = div
    if end == 'bounce':
        shift = c.create(mathCHOP, 'shift')
        shift.par.preoff = -b['max']
        fold = c.create(mathCHOP, 'fold')
        fold.par.preop = 'pos'
        fold.par.gain = -1
        fold.par.postoff = b['max']
        chain(last, shift, fold, y=-150)
        last = fold
    if end == 'steps':
        table = c.create(tableDAT, 'cycle')
        table.clear()
        table.appendRows([[v] for v in cycle])
        table.nodeX, table.nodeY = 0, -300
        values = c.create(dattoCHOP, 'cycle_values')
        values.par.dat = table
        values.par.output = 'chanpercol'
        values.par.firstrow = 'values'
        values.par.firstcolumn = 'values'
        values.nodeX, values.nodeY = 0, -450
        look = c.create(lookupCHOP, 'steps')
        look.par.index1 = 0
        look.par.index2 = max(len(cycle) - 1, 1)
        look.par.interp = False
        look.par.cyclic = 'no'
        look.nodeX, look.nodeY = 100, -150
        last.outputConnectors[0].connect(look.inputConnectors[0])
        values.outputConnectors[0].connect(look.inputConnectors[1])
        last = look
    lim = c.create(limitCHOP, 'clamp')
    lim.par.type = 'clamp'
    lim.par.min = 0
    lim.par.max = b['max']
    lim.nodeX = 200
    last.outputConnectors[0].connect(lim.inputConnectors[0])
    name = c.create(renameCHOP, 'name')
    name.par.renamefrom = '*'
    name.par.renameto = 'count'
    name.nodeX = 400
    lim.outputConnectors[0].connect(name.inputConnectors[0])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 600
    name.outputConnectors[0].connect(out.inputConnectors[0])
