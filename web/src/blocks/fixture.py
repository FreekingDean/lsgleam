def pick(c, name, src, chans, names, x, y):
    sel = select(c, name, src, ' '.join(chans), x, y)
    sel.par.renamefrom = ' '.join(chans)
    sel.par.renameto = ' '.join(names)
    return sel

def scaled(c, name, src, gain, x, y, offset=0, integer='off'):
    m = combine(c, name, 'off', [src], x, y, gain)
    m.par.postoff = offset
    m.par.integer = integer
    return m

def looped(c, name, src, top, x, y):
    lim = c.create(limitCHOP, name)
    lim.par.type = 'loop'
    lim.par.min = 0
    lim.par.max = top
    lim.nodeX, lim.nodeY = x, y
    src.outputConnectors[0].connect(lim.inputConnectors[0])
    return lim

def hsv_of(c, attrs):
    x, y = -100, -400
    rgb = select(c, 'hsv_rgb', attrs, 'red green blue', x, y)
    gbr = select(c, 'hsv_gbr', attrs, 'green blue red', x, y - 100)
    brg = select(c, 'hsv_brg', attrs, 'blue red green', x, y - 200)
    top, low = c.create(mathCHOP, 'hsv_max'), c.create(mathCHOP, 'hsv_min')
    top.par.chanop, low.par.chanop = 'max', 'min'
    top.nodeX = low.nodeX = x + 150
    top.nodeY, low.nodeY = y + 100, y + 200
    rgb.outputConnectors[0].connect(top.inputConnectors[0])
    rgb.outputConnectors[0].connect(low.inputConnectors[0])
    delta = combine(c, 'hsv_delta', 'sub', [top, low], x + 300, y + 200)
    below = combine(c, 'hsv_below', 'sub', [rgb, top], x + 300, y, -1)
    peak = c.create(logicCHOP, 'hsv_peak')
    peak.par.convert = 'pos'
    peak.par.preop = 'invert'
    peak.nodeX, peak.nodeY = x + 450, y
    below.outputConnectors[0].connect(peak.inputConnectors[0])
    sectors = constant(c, 'hsv_sectors', [('red', 0), ('green', 2), ('blue', 4)])
    sectors.nodeX, sectors.nodeY = x + 300, y - 300
    offset = combine(c, 'hsv_offset', 'mul', [sectors, delta], x + 450, y - 300)
    num = combine(c, 'hsv_num', 'add', [combine(c, 'hsv_diff', 'sub', [gbr, brg], x + 150, y - 150), offset], x + 600, y - 150)
    wrap = looped(c, 'hsv_wrap', combine(c, 'hsv_sector', 'div', [num, delta], x + 750, y - 150), 6, x + 900, y - 150)
    picked = combine(c, 'hsv_picked', 'mul', [peak, wrap], x + 1050, y)
    total, count = c.create(mathCHOP, 'hsv_total'), c.create(mathCHOP, 'hsv_count')
    total.par.chanop = count.par.chanop = 'add'
    total.nodeX = count.nodeX = x + 1200
    total.nodeY, count.nodeY = y, y + 100
    picked.outputConnectors[0].connect(total.inputConnectors[0])
    peak.outputConnectors[0].connect(count.inputConnectors[0])
    level = select(c, 'hsv_level', attrs, 'intensity', x + 300, y + 300)
    return {
        'hue': combine(c, 'hsv_hue', 'div', [total, count], x + 1350, y, 1 / 6),
        'saturation': combine(c, 'hsv_sat', 'div', [delta, top], x + 450, y + 200),
        'brightness': combine(c, 'hsv_bright', 'mul', [top, level], x + 450, y + 300),
    }

def unique(pairs):
    chunks = []
    for k, n in pairs:
        free = [ch for ch in chunks if k not in dict(ch)]
        if free:
            free[0].append((k, n))
        else:
            chunks.append([(k, n)])
    return chunks

def values_of(c, attrs, chans, hsv, tag, y):
    by_type = {}
    for k, n, ch in chans:
        by_type.setdefault(ch['encoding']['type'], []).append((k, n))
    parts = []
    for t, pairs in by_type.items():
        for i, chunk in enumerate(unique(pairs)):
            keys, names = [k for k, n in chunk], [n for k, n in chunk]
            name = '%s_%s%d' % (t, tag, i)
            if t == 'plain':
                parts.append(pick(c, name, attrs, keys, names, 100, y))
            elif t == 'dimmed':
                parts.append(combine(c, name, 'mul', [pick(c, name + '_color', attrs, keys, names, 100, y), select(c, name + '_level', attrs, 'intensity', 100, y - 100)], 250, y))
            else:
                parts.append(pick(c, name, hsv[t], ['*'], names, 250, y))
            y -= 200
    return merge_into(c, parts, 'values_' + tag, y) if len(parts) > 1 else parts[0]

def wheel_out(c, attrs, key, name, slots, y):
    table = c.create(tableDAT, name + '_slots')
    table.clear()
    table.appendRows([[name]] + [[s['from'] / 255] for s in slots])
    table.nodeX, table.nodeY = 100, y - 100
    steps = c.create(dattoCHOP, name + '_table')
    steps.par.dat = table
    steps.par.output = 'chanpercol'
    steps.par.firstrow = 'names'
    steps.par.firstcolumn = 'values'
    steps.nodeX, steps.nodeY = 250, y - 100
    look = c.create(lookupCHOP, name + '_wheel')
    look.par.index1 = 0
    look.par.index2 = 1
    look.par.interp = False
    look.nodeX, look.nodeY = 400, y
    select(c, name + '_index', attrs, key, 250, y).outputConnectors[0].connect(look.inputConnectors[0])
    steps.outputConnectors[0].connect(look.inputConnectors[1])
    return look

def strobe_out(c, attrs, key, name, e, y):
    v = pick(c, name + '_strobe', attrs, [key], [name], 100, y)
    on = c.create(logicCHOP, name + '_on')
    on.par.convert = 'pos'
    on.nodeX, on.nodeY = 250, y - 100
    v.outputConnectors[0].connect(on.inputConnectors[0])
    ramp = scaled(c, name + '_ramp', v, (e['to'] - e['from']) / 255, 250, y)
    lit = scaled(c, name + '_lit', on, (e['from'] - e['off']) / 255, 400, y - 100, e['off'] / 255)
    return combine(c, name + '_out', 'add', [ramp, lit], 550, y)

def encoders(c, attrs, rest):
    hsv = hsv_of(c, attrs) if any(ch['encoding']['type'] in ('hue', 'saturation', 'brightness') for k, n, ch in rest) else None
    groups = {}
    for k, n, ch in rest:
        e = ch['encoding']
        post = e['type'] if e['type'] in ('fixed', 'wheel', 'strobe') else e.get('part') or (e['from'], e['to'])
        groups.setdefault(post, []).append((k, n, ch))
    parts = []
    y = -300
    for post, chans in groups.items():
        if post == 'fixed':
            parts.append(constant(c, 'fixed', [(n, ch['encoding']['dmx'] / 255) for k, n, ch in chans]))
            parts[-1].nodeX, parts[-1].nodeY = 300, y
        elif post == 'wheel':
            parts += [wheel_out(c, attrs, k, n, ch['encoding']['slots'], y - i * 200) for i, (k, n, ch) in enumerate(chans)]
        elif post == 'strobe':
            parts += [strobe_out(c, attrs, k, n, ch['encoding'], y - i * 200) for i, (k, n, ch) in enumerate(chans)]
        elif post in ('coarse', 'fine'):
            wide = scaled(c, post + '_steps', values_of(c, attrs, chans, hsv, post, y), 65535, 400, y, 0, 'round')
            byte = looped(c, 'fine_byte', wide, 256, 550, y) if post == 'fine' else scaled(c, 'coarse_byte', wide, 1 / 256, 550, y, 0, 'floor')
            parts.append(scaled(c, post, byte, 1 / 255, 700, y))
        else:
            lo, hi = post
            f = values_of(c, attrs, chans, hsv, '%d_%d' % post, y)
            parts.append(f if (lo, hi) == (0, 255) else scaled(c, 'range_%d_%d' % post, f, (hi - lo) / 255, 400, y, lo / 255))
        y -= 200 * len(chans) + 200
    return parts

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
        parts += encoders(c, attrs, rest)
    merge = merge_into(c, parts, 'dmx', 0)
    merge.nodeX = 500
    scale = c.create(mathCHOP, 'scale')
    scale.par.torange2 = 255
    scale.par.integer = 'round'
    scale.nodeX = 700
    merge.outputConnectors[0].connect(scale.inputConnectors[0])
    finish(c, scale, 900)
