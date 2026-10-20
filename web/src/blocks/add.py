def build_add(b, sources, whole):
    c = new_block(b)
    by_port = ports(c, sources)
    src = by_port.get('in') or constant(c, 'noin', [('in', 0)])
    amount = by_port.get('amount') or constant(c, 'amount', [('amount', b['amount'])])
    total = c.create(mathCHOP, 'total')
    total.par.chopop = 'add'
    if whole:
        total.par.integer = 'round'
    total.nodeX = 200
    src.outputConnectors[0].connect(total.inputConnectors[0])
    amount.outputConnectors[0].connect(total.inputConnectors[1])
    finish(c, named(c, sources, total, 'out', 400), 600)
