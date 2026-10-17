def build_light(b, profile, sources):
    c = new_block(b)
    channels = profile['channels']
    names = [ch['name'] for ch in channels]
    pos = profile.get('position') or []
    feeds = []
    for port, end in ports(c, sources).items():
        if port == 'position':
            aim = [(ch, b['values'][names.index(ch)]) for ch in pos]
            end = position_switch(c, 'pos', end, aim, [[(ch, p['values'].get(ch, 0)) for ch in pos] for p in b['positions']], -400)
        feeds.append(end)
    finish(c, channel_chain(c, '', list(zip(names, b['values'])), feeds, 0))
