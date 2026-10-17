def build_manual(b, scenes, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    index = by_port.get('index')
    out = c.create(outCHOP, 'out1')
    if index is None:
        const = constant(c, 'values', [('s_' + sid, 1 if k == b['active'] else 0) for k, sid in enumerate(scenes)])
        out.nodeX = 200
        const.outputConnectors[0].connect(out.inputConnectors[0])
        return
    hits = []
    for k, sid in enumerate(scenes):
        diff = c.create(mathCHOP, 'diff%d' % k)
        diff.par.preoff = -k
        sq = c.create(mathCHOP, 'square%d' % k)
        sq.par.postop = 'square'
        lim = c.create(limitCHOP, 'far%d' % k)
        lim.par.type = 'clamp'
        lim.par.min = 0
        lim.par.max = 1
        inv = c.create(mathCHOP, 'equal%d' % k)
        inv.par.gain = -1
        inv.par.postoff = 1
        name = c.create(renameCHOP, 'scene%d' % k)
        name.par.renamefrom = '*'
        name.par.renameto = 's_' + sid
        chain(diff, sq, lim, inv, name, y=-k * 150)
        index.outputConnectors[0].connect(diff.inputConnectors[0])
        hits.append(name)
    merge = merge_into(c, hits, 'merge', 0)
    merge.nodeX = 1000
    out.nodeX = 1200
    merge.outputConnectors[0].connect(out.inputConnectors[0])
