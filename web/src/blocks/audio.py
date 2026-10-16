def build_audio(b, sources):
    c = new_block(b)
    audio = c.create(audiodeviceinCHOP, 'audio')
    if b['device']:
        audio.par.device = b['device']
    audio.par.active = True
    chain(audio, c.create(outCHOP, 'out1'))
