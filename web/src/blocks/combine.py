def build_combine(b, sources, wide):
    c = new_block(b)
    feeds = []
    for k, (port, feed) in enumerate(sorted(ports(c, sources).items(), key=lambda kv: int(kv[0][1:]))):
        ren = c.create(renameCHOP, 'slot_' + port)
        ren.par.renamefrom = '*'
        ren.par.renameto = port + '_*' if wide else port
        ren.nodeX, ren.nodeY = -100, -k * 100
        feed.outputConnectors[0].connect(ren.inputConnectors[0])
        feeds.append(ren)
    finish(c, merge_into(c, feeds, 'merge', 0) or constant(c, 'nothing', [('none', 0)]), 200)
