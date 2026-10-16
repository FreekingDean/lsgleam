
import numpy as np

def onCook(scriptOp):
    cfg = scriptOp.fetch('cfg')
    n = cfg['n']
    coords = {'tube': (np.arange(n) + 0.5) / n, 'height': np.array(cfg['height']), 'distance': np.array(cfg['distance'])}
    share = cfg['index'] / max(cfg['count'], 1)
    weights = None
    for i, src in enumerate(cfg['sources']):
        if src['mode'] is None and i < len(scriptOp.inputs):
            weights = scriptOp.inputs[i]
    total = np.zeros((3, n))
    wsum = 0.0
    for i, src in enumerate(cfg['sources']):
        mode = src['mode']
        if mode is None or i >= len(scriptOp.inputs):
            continue
        p = scriptOp.inputs[i]
        val = lambda k, d: p[k][0] if p[k] is not None else d
        u = coords.get(src.get('along') or 'tube', coords['tube'])
        pos = val('pos', 0.5) + val('spread', 0) * share
        if mode != 'fill':
            pos = pos % 1.0
        width = max(val('width', 0.2), 0.001)
        w = 1.0
        if weights is not None and weights['w%d' % src['scene']] is not None:
            w = weights['w%d' % src['scene']][0]
        if mode == 'ramp':
            k = 0
            while p['s%d' % k] is not None:
                k += 1
            at = np.array([p['s%d' % i][0] for i in range(k)])
            x = (u - pos) % 1.0
            total += w * np.stack([np.interp(x, at, [p['%s%d' % (ch, i)][0] for i in range(k)]) for ch in 'rgb']) if k else 0
            wsum += w
            continue
        if mode == 'solid':
            mask = np.ones(n)
        elif mode == 'fill':
            mask = np.clip(1 - (u - pos) / width, 0, 1)
        else:
            d = np.abs(u - pos)
            if mode == 'chase':
                d = np.minimum(d, 1 - d)
            mask = np.clip(1 - d / width, 0, 1)
        total += w * np.array([val('Red', 0), val('Green', 0), val('Blue', 0)])[:, None] * mask
        wsum += w
    rest = max(0.0, 1.0 - wsum)
    scriptOp.copyNumpyArray((total / max(wsum + rest, 0.001)).astype(np.float32), baseName='c')
    return
