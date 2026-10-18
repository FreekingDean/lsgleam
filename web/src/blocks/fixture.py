def encoded(ch):
    e = ch['encoding']
    t = e['type']
    a = lambda k: "op('attrs')['%s']" % k
    if t == 'fixed':
        return repr(e['dmx'] / 255)
    if t == 'wheel':
        return '%r[int(round(%s * %d))] / 255' % ([s['from'] for s in e['slots']], a(ch['key']), len(e['slots']) - 1)
    if t == 'strobe':
        return '(%d + %s * %d) / 255 if %s > 0 else %r' % (e['from'], a(ch['key']), e['to'] - e['from'], a(ch['key']), e['off'] / 255)
    rgb = ', '.join(a(k) for k in ('red', 'green', 'blue'))
    f = {
        'plain': a(ch['key']),
        'dimmed': '%s * %s' % (a(ch['key']), a('intensity')),
        'hue': 'mod.colorsys.rgb_to_hsv(%s)[0]' % rgb,
        'saturation': 'mod.colorsys.rgb_to_hsv(%s)[1]' % rgb,
        'brightness': '%s * max(%s)' % (a('intensity'), rgb),
    }[t]
    if e.get('part') == 'coarse':
        return 'int(round((%s) * 65535)) // 256 / 255' % f
    if e.get('part') == 'fine':
        return 'int(round((%s) * 65535)) %% 256 / 255' % f
    return '(%d + (%s) * %d) / 255' % (e['from'], f, e['to'] - e['from'])

def build_fixture(b, pairs, channels, sources):
    c = new_block(b)
    home = constant(c, 'default_channels', pairs)
    home.nodeX, home.nodeY = -1400, 600
    blend = ports(c, sources, {'channels': home}).get('channels') or home
    attrs = c.create(nullCHOP, 'attrs')
    attrs.nodeX = -100
    blend.outputConnectors[0].connect(attrs.inputConnectors[0])
    direct, rest = [], []
    for i, ch in enumerate(channels):
        e = ch['encoding']
        plain = e['type'] == 'plain' and not e.get('part') and e['from'] == 0 and e['to'] == 255
        (direct if plain and ch['key'] not in [d[0] for d in direct] else rest).append((ch['key'], 'c%d' % (b['address'] + i), ch))
    parts = []
    if direct:
        sel = select(c, 'direct', attrs, ' '.join(k for k, n, ch in direct), 100, 0)
        addr = c.create(renameCHOP, 'address')
        addr.par.renamefrom = ' '.join(k for k, n, ch in direct)
        addr.par.renameto = ' '.join(n for k, n, ch in direct)
        addr.nodeX = 300
        sel.outputConnectors[0].connect(addr.inputConnectors[0])
        parts.append(addr)
    if rest:
        enc = constant(c, 'encoded', [(n, 0) for k, n, ch in rest])
        enc.nodeX, enc.nodeY = 300, -150
        for i, (k, n, ch) in enumerate(rest):
            enc.par['const%dvalue' % i].expr = encoded(ch)
        parts.append(enc)
    merge = merge_into(c, parts, 'dmx', 0)
    merge.nodeX = 500
    scale = c.create(mathCHOP, 'scale')
    scale.par.torange2 = 255
    scale.par.integer = 'round'
    scale.nodeX = 700
    merge.outputConnectors[0].connect(scale.inputConnectors[0])
    finish(c, scale, 900)
