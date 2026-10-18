def build_group(b, pairs, pos, sources, masks, members):
    c = new_block(b)
    if not members:
        return
    names = [n for n, v in pairs]
    values = dict(pairs)
    defaults = light_defaults(c, pairs)
    defaults['step'] = constant(c, 'nostep', [('step', 0)])
    defaults['trigger'] = constant(c, 'notrigger', [('trigger', 0)])
    if 'intensity' in names:
        defaults['pattern'] = constant(c, 'dim_values', [('intensity', values['intensity'])])
        defaults['pattern'].nodeX, defaults['pattern'].nodeY = -600, 400
    by_port = ports(c, sources, defaults, {'intensity': 'pattern'})
    slots = None
    floor = floor_of(c, b, by_port)
    if 'color' in by_port:
        by_port['color'] = as_attrs(c, 'color', by_port['color'])
    look = by_port.pop('look', None)
    if look is not None:
        colors = c.create(selectCHOP, 'look_colors')
        colors.par.channames = 'Red Green Blue'
        look_dim = c.create(selectCHOP, 'look_dimmer')
        look_dim.par.channames = 'Dimmer'
        colors.nodeX, look_dim.nodeX = -900, -900
        colors.nodeY, look_dim.nodeY = 500, 400
        look.outputConnectors[0].connect(colors.inputConnectors[0])
        look.outputConnectors[0].connect(look_dim.inputConnectors[0])
        by_port['look'] = as_attrs(c, 'look', colors)
        by_port['pattern'] = look_dim
    if 'intensity' in names:
        dim = by_port.get('pattern') or defaults['pattern']
        slots = pattern_chain(c, by_port.get('step'), by_port.get('trigger'), masks, dim, 400, b['every'], floor)
    ends = []
    for i, m in enumerate(members):
        p = 'm%d_' % (i + 1)
        y = -i * 600
        feeds = [end for port, end in by_port.items() if port in names or port in ('look', 'color')]
        if slots is not None:
            sel = c.create(selectCHOP, p + 'slot')
            sel.par.channames = 'slot%d' % (i + 1)
            dim = c.create(renameCHOP, p + 'dimmer')
            dim.par.renamefrom = '*'
            dim.par.renameto = 'intensity'
            sel.nodeX, dim.nodeX = -600, -400
            sel.nodeY = dim.nodeY = y - 300
            slots.outputConnectors[0].connect(sel.inputConnectors[0])
            sel.outputConnectors[0].connect(dim.inputConnectors[0])
            feeds.append(dim)
        if 'position' in by_port:
            stored = [[(ch, q['members'].get(m['id'], {}).get(ch, 0)) for ch in pos] for q in b['positions']]
            aim = [(ch, m['aim'].get(ch, 0.5)) for ch in pos]
            feeds.append(position_switch(c, p + 'pos', by_port['position'], aim, stored, y - 400))
        member = [(n, m['aim'].get(n, v) if n in pos else v) for n, v in pairs]
        last = channel_chain(c, p, member, feeds, y, by_port.get('nudge'), pos[0] if pos else None)
        named = c.create(renameCHOP, p + 'named')
        named.par.renamefrom = '*'
        named.par.renameto = p + '*'
        named.nodeX, named.nodeY = 600, y
        last.outputConnectors[0].connect(named.inputConnectors[0])
        ends.append(named)
    merge = merge_into(c, ends, 'merge', 0)
    merge.nodeX = 800
    finish(c, merge, 1000)
