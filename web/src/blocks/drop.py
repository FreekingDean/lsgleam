def build_drop(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    src = by_port.get('signal') or constant(c, 'silence', [('signal', 0)])
    beat = by_port.get('beat') or constant(c, 'nobeat', [('beat', 0)])
    kick_in, kick = gate(c, 'kick', b['threshold'], 0, 0)
    src.outputConnectors[0].connect(kick_in.inputConnectors[0])
    quiet = c.create(countCHOP, 'quiet')
    quiet.par.threshold = False
    quiet.par.threshup = 0.1
    quiet.par.threshdown = 0.05
    quiet.par.offtoon = 'inc'
    quiet.par.output = 'off'
    quiet.par.resetcondition = 'on'
    quiet.nodeX, quiet.nodeY = 400, -150
    beat.outputConnectors[0].connect(quiet.inputConnectors[0])
    kick.outputConnectors[0].connect(quiet.inputConnectors[1])
    armed_in, armed = gate(c, 'armed', b['beats'] - 0.5, 600, -150)
    armed_out = c.create(renameCHOP, 'armed_name')
    armed_out.par.renamefrom = '*'
    armed_out.par.renameto = 'armed'
    armed_out.nodeX, armed_out.nodeY = 800, -300
    armed.outputConnectors[0].connect(armed_out.inputConnectors[0])
    quiet.outputConnectors[0].connect(armed_in.inputConnectors[0])
    hold = c.create(lagCHOP, 'hold')
    hold.par.lagunit = 'seconds'
    hold.par.lag1 = 0
    hold.par.lag2 = 0.25
    hold.nodeX, hold.nodeY = 1000, -150
    armed.outputConnectors[0].connect(hold.inputConnectors[0])
    hit = c.create(mathCHOP, 'hit')
    hit.par.chopop = 'mul'
    hit.nodeX, hit.nodeY = 1200, 0
    kick.outputConnectors[0].connect(hit.inputConnectors[0])
    hold.outputConnectors[0].connect(hit.inputConnectors[1])
    drop_in, drop_lim = gate(c, 'drop_lim', 0.3, 1400, 0)
    hit.outputConnectors[0].connect(drop_in.inputConnectors[0])
    drop = c.create(renameCHOP, 'drop')
    drop.par.renamefrom = '*'
    drop.par.renameto = 'drop'
    drop.nodeX = 1800
    drop_lim.outputConnectors[0].connect(drop.inputConnectors[0])
    count = c.create(countCHOP, 'count')
    count.par.threshold = False
    count.par.threshup = 0.5
    count.par.threshdown = 0.25
    count.par.offtoon = 'inc'
    count.par.output = 'off'
    count.par.retrigger = b['cooldown']
    count.par.retriggerunit = 'seconds'
    drops = c.create(renameCHOP, 'drops')
    drops.par.renamefrom = '*'
    drops.par.renameto = 'drops'
    chain(count, drops, y=-150)
    count.nodeX, drops.nodeX = 1800, 2000
    drop.outputConnectors[0].connect(count.inputConnectors[0])
    merge = merge_into(c, [drop, armed_out, drops], 'merge', 0)
    merge.nodeX = 2200
    out = c.create(outCHOP, 'out1')
    out.nodeX = 2400
    merge.outputConnectors[0].connect(out.inputConnectors[0])
