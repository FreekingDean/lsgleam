import type { DesignTube, Point } from './show'

export type ShapeKind = 'tree' | 'burst' | 'fan'
export const SHAPES: Record<ShapeKind, string> = { tree: 'Tree (trunk up, branches out)', burst: 'Burst (straight out in every direction)', fan: 'Fan (half circle, upright)' }

const r = (v: number) => Math.round(v * 1000) / 1000
const at = (dir: Point, k: number, from: Point = [0, 0, 0]): Point => [r(from[0] + dir[0] * k), r(from[1] + dir[1] * k), r(from[2] + dir[2] * k)]

function paths(kind: ShapeKind, n: number, length: number): Point[][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    if (kind === 'tree') {
      const trunk: Point = [0, length * 0.35, 0]
      return [[0, 0, 0], trunk, at([Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8], length * 0.65, trunk)]
    }
    if (kind === 'fan') {
      const t = Math.PI * (n === 1 ? 0.5 : 0.1 + (0.8 * i) / (n - 1))
      return [[0, 0, 0], at([Math.cos(t), Math.sin(t), 0], length)]
    }
    const y = n === 1 ? 1 : 1 - (i / (n - 1)) * 0.9
    const ring = Math.sqrt(1 - y * y)
    const g = i * Math.PI * (3 - Math.sqrt(5))
    return [[0, 0, 0], at([Math.cos(g) * ring, y, Math.sin(g) * ring], length)]
  })
}

export const makeShape = (kind: ShapeKind, n: number, leds: number, length: number, protocol: string): DesignTube[] =>
  paths(kind, n, length).map((path, i) => ({ id: `t${i + 1}`, name: `Tube ${i + 1}`, leds, length, protocol, path }))
