def build_light(b, pairs, pos, wheel, sources):
    c = new_block(b)
    values = dict(pairs)
    feeds = []
    for port, end in ports(c, sources).items():
        if port == 'position':
            aim = [(ch, values[ch]) for ch in pos]
            end = position_switch(c, 'pos', end, aim, [[(ch, p['values'].get(ch, 0)) for ch in pos] for p in b['positions']], -400)
        if port in ('look', 'color'):
            end = as_attrs(c, port, end)
            if wheel:
                feeds.append(wheel_pick(c, port, end, wheel))
        feeds.append(end)
    finish(c, channel_chain(c, '', pairs, feeds, 0))
