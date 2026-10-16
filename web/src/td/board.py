
import numpy as np

def onCook(scriptOp):
    out = np.zeros((512, 1), dtype=np.float32)
    for i, start, count, ch in scriptOp.fetch('cfg')['parts']:
        if i >= len(scriptOp.inputs):
            continue
        rgb = scriptOp.inputs[i].numpyArray()[:3, start:start + count]
        flat = np.round(np.clip(rgb.T.reshape(-1), 0, 1) * 255)[:512 - ch]
        out[ch:ch + flat.size, 0] = flat
    scriptOp.copyNumpyArray(out, baseName='c')
    return
