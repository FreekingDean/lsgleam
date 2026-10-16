def build_timer(b, sources):
    c = new_block(b)
    by_port = ports(c, sources)
    timer = c.create(timerCHOP, 'timer')
    timer.par.length = max(b['seconds'], 0.1)
    timer.par.lengthunits = 'seconds'
    timer.par.cycle = b['end'] == 'loop'
    if 'run' in by_port:
        timer.par.play.expr = "op('%s')[0] > 0.5" % by_port['run'].name
    if 'reset' in by_port:
        by_port['reset'].outputConnectors[0].connect(timer.inputConnectors[1])
    timer.par.initialize.pulse()
    timer.par.start.pulse()
    fraction = select(c, 'fraction', timer, 'timer_fraction', 200, 0)
    progress = c.create(renameCHOP, 'progress')
    progress.par.renamefrom = '*'
    progress.par.renameto = 'progress'
    scale = c.create(mathCHOP, 'scale')
    scale.par.gain = b['countTo']
    value = c.create(renameCHOP, 'value')
    value.par.renamefrom = '*'
    value.par.renameto = 'value'
    quant = c.create(limitCHOP, 'quant')
    quant.par.quantvalue = 'floor'
    quant.par.vstep = 1
    count = c.create(renameCHOP, 'count')
    count.par.renamefrom = '*'
    count.par.renameto = 'count'
    for k, o in enumerate((progress, scale, value)):
        o.nodeX, o.nodeY = 400 + k * 200, 0
    quant.nodeX, quant.nodeY = 800, -150
    count.nodeX, count.nodeY = 1000, -150
    fraction.outputConnectors[0].connect(progress.inputConnectors[0])
    fraction.outputConnectors[0].connect(scale.inputConnectors[0])
    scale.outputConnectors[0].connect(value.inputConnectors[0])
    scale.outputConnectors[0].connect(quant.inputConnectors[0])
    quant.outputConnectors[0].connect(count.inputConnectors[0])
    merge = merge_into(c, [count, value, progress], 'merge', 0)
    merge.nodeX = 1200
    finish(c, merge, 1400)
