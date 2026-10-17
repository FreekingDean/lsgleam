def build_strip(b, sources, cfg):
    c = new_block(b)
    ends = []
    for k, (port, end) in enumerate(ports(c, sources).items()):
        n = c.create(nullCHOP, 'p_' + port)
        n.nodeX, n.nodeY = 0, -k * 100
        end.outputConnectors[0].connect(n.inputConnectors[0])
        ends.append(n)
    finish(c, script(c, 'params', code(c, 'params_code', STRIP_CODE), ends, cfg, 200), 400)
