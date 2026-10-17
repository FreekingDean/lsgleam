
def onCook(scriptOp):
    cfg = scriptOp.fetch('cfg')
    wired = {i.name[2:]: i for i in scriptOp.inputs}
    def num(name, default):
        p = wired.get(name)
        return p[0][0] if p is not None and p.numChans else default
    def rgb(name, default):
        p = wired.get(name)
        return [p[k][0] for k in range(3)] if p is not None and p.numChans >= 3 else default
    dim = num('dimmer', cfg['dimmer'])
    color = [v * dim for v in rgb('color', cfg['rgb'])]
    phase = scriptOp.fetch('phase', 0.0)
    if cfg['mode'] in ('chase', 'ramp'):
        phase = (phase + absTime.stepSeconds * num('speed', cfg['speed'])) % 1.0
        scriptOp.store('phase', phase)
    pos = (num('position', cfg['position']) + phase) % 1.0 if cfg['mode'] in ('chase', 'ramp') else num('position', cfg['position'])
    scriptOp.clear()
    for n, v in (('Red', color[0]), ('Green', color[1]), ('Blue', color[2]), ('pos', pos), ('width', num('width', cfg['width'])), ('spread', num('spread', cfg['spread']))):
        scriptOp.appendChan(n)[0] = v
    stops = sorted((num('at%d' % k, at), rgb('stop%d' % k, c)) for k, (at, c) in enumerate(cfg['stops']))
    for k, (at, c) in enumerate(stops):
        scriptOp.appendChan('s%d' % k)[0] = at
        for n, v in zip(('r', 'g', 'b'), c):
            scriptOp.appendChan('%s%d' % (n, k))[0] = v * dim
    return
