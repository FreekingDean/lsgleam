def build_split(b, sources):
    c = new_block(b)
    src = ports(c, sources).get('in') or constant(c, 'nothing', [('none', 0)])
    finish(c, src, 200)
