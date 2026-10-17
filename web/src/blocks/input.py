def build_input(b, sources):
    c = new_block(b)
    ends = inputs(c, sources)
    last = mix(c, 'in', ends, -300, 0) if b['type'] == 'signal' and len(ends) > 1 else merge_into(c, ends, 'merge', 0)
    if last is None:
        last = constant(c, 'nothing', [('out', 0)])
    out = c.create(outCHOP, 'out1')
    out.nodeX = 200
    last.outputConnectors[0].connect(out.inputConnectors[0])

build_output = build_input
