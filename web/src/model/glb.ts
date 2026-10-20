import type * as THREE from 'three'

const pad4 = (n: number) => (n + 3) & ~3

export function glbOf(geometry: THREE.BufferGeometry, color: [number, number, number, number], image?: Uint8Array): Uint8Array {
  const position = geometry.getAttribute('position').array as Float32Array
  const normal = geometry.getAttribute('normal')?.array as Float32Array | undefined
  const uv = image ? (geometry.getAttribute('uv').array as Float32Array) : undefined
  const index = Uint32Array.from(geometry.getIndex()?.array ?? Array.from({ length: position.length / 3 }, (_, i) => i))
  const parts: Uint8Array[] = [position, normal, uv, index, image].flatMap((p) => (p ? [new Uint8Array(p.buffer, p.byteOffset, p.byteLength)] : []))
  const views: { buffer: 0; byteOffset: number; byteLength: number }[] = []
  let offset = 0
  for (const p of parts) {
    views.push({ buffer: 0, byteOffset: offset, byteLength: p.byteLength })
    offset = pad4(offset + p.byteLength)
  }
  const count = position.length / 3
  const axis = (k: number) => Array.from({ length: count }, (_, i) => position[i * 3 + k])
  const min = [0, 1, 2].map((k) => axis(k).reduce((a, b) => Math.min(a, b)))
  const max = [0, 1, 2].map((k) => axis(k).reduce((a, b) => Math.max(a, b)))
  const accessors: object[] = [{ bufferView: 0, componentType: 5126, count, type: 'VEC3', min, max }]
  const attributes: Record<string, number> = { POSITION: 0 }
  let view = 1
  if (normal) attributes.NORMAL = accessors.push({ bufferView: view++, componentType: 5126, count, type: 'VEC3' }) - 1
  if (uv) attributes.TEXCOORD_0 = accessors.push({ bufferView: view++, componentType: 5126, count, type: 'VEC2' }) - 1
  const indices = accessors.push({ bufferView: view++, componentType: 5125, count: index.length, type: 'SCALAR' }) - 1
  const json = {
    asset: { version: '2.0', generator: 'lsgleam' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes, indices, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0, roughnessFactor: 0.9, ...(image ? { baseColorTexture: { index: 0 } } : {}) }, doubleSided: true, ...(color[3] < 1 ? { alphaMode: 'BLEND' } : {}) }],
    ...(image ? { textures: [{ source: 0, sampler: 0 }], samplers: [{ magFilter: 9729, minFilter: 9987 }], images: [{ bufferView: view, mimeType: 'image/jpeg' }] } : {}),
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: offset }],
  }
  const text = new TextEncoder().encode(JSON.stringify(json))
  const jsonLength = pad4(text.length)
  const out = new Uint8Array(12 + 8 + jsonLength + 8 + offset)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, out.length, true)
  dv.setUint32(12, jsonLength, true)
  dv.setUint32(16, 0x4e4f534a, true)
  out.fill(0x20, 20, 20 + jsonLength)
  out.set(text, 20)
  const bin = 20 + jsonLength
  dv.setUint32(bin, offset, true)
  dv.setUint32(bin + 4, 0x004e4942, true)
  parts.forEach((p, i) => out.set(p, bin + 8 + views[i].byteOffset))
  return out
}
