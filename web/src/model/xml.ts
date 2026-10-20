export type Node = { tag: string; attrs?: Record<string, string | number | undefined>; children?: (Node | string)[] }

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const el = (tag: string, attrs: Node['attrs'] = {}, children: (Node | string)[] = []): Node => ({ tag, attrs, children })

function render(n: Node | string, pad: string): string {
  if (typeof n === 'string') return escape(n)
  const attrs = Object.entries(n.attrs ?? {}).flatMap(([k, v]) => (v === undefined ? [] : [` ${k}="${escape(String(v))}"`])).join('')
  const kids = n.children ?? []
  if (!kids.length) return `${pad}<${n.tag}${attrs}/>`
  if (kids.every((k) => typeof k === 'string')) return `${pad}<${n.tag}${attrs}>${kids.map((k) => render(k, '')).join('')}</${n.tag}>`
  return `${pad}<${n.tag}${attrs}>\n${kids.map((k) => render(k, `${pad}  `)).join('\n')}\n${pad}</${n.tag}>`
}

export const xml = (root: Node) => `<?xml version="1.0" encoding="UTF-8"?>\n${render(root, '')}\n`

export const gdtfName = (s: string) => s.replace(/[^A-Za-z0-9 #%()*+\-/:;<=>@_`"',]/g, '_') || '_'

export function uuidOf(text: string) {
  const primes = [597399067, 2869860233, 951274213, 2716044179]
  const h = [1779033703, 3144134277, 1013904242, 2773480762]
  for (const c of text) for (let i = 0; i < 4; i++) h[i] = h[(i + 1) % 4] ^ Math.imul(h[i] ^ c.charCodeAt(0), primes[i])
  for (let i = 0; i < 4; i++) h[i] = Math.imul(h[(i + 2) % 4] ^ (h[i] >>> 17), primes[i])
  const hex = h.map((x, i) => ((x ^ h[(i + 1) % 4]) >>> 0).toString(16).padStart(8, '0')).join('')
  const variant = ((Number.parseInt(hex[16], 16) & 3) | 8).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`.toUpperCase()
}

export const fixed = (v: number) => (Math.abs(v) < 5e-7 ? 0 : v).toFixed(6)
