def build_fade(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('signal') or constant(c, 'nosignal', [('signal', 0)])
    lag = c.create(lagCHOP, 'ramp')
    lag.par.lagunit = 'seconds'
    if b['curve'] == 'smooth':
        lag.par.lag1 = b['rise'] / 3.0
        lag.par.lag2 = b['fall'] / 3.0
    else:
        lag.par.lag1 = 0
        lag.par.lag2 = 0
        lag.par.clamp = True
        lag.par.slope1 = 1.0 / b['rise'] if b['rise'] > 0 else 1e6
        lag.par.slope2 = 1.0 / b['fall'] if b['fall'] > 0 else 1e6
    src.outputConnectors[0].connect(lag.inputConnectors[0])
    finish(c, named(c, sources, lag, 'out', 200), 400)
