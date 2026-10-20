def visualise(name, ip):
    c = find(name)
    for d in [o for o in matching(c, 'dmxout*') if o.isCHOP]:
        v = c.copy(d, name='visualiser_' + d.name, includeDocked=False)
        v.par.interface = 'artnet'
        v.par.netaddress = ip
        v.par.active = True
        v.nodeX, v.nodeY = d.nodeX, d.nodeY - 120
        if d.inputs:
            d.inputs[0].outputConnectors[0].connect(v.inputConnectors[0])
