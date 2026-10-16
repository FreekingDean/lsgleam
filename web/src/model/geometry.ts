import { type Point, type TubeBlock, type Show, membersOf } from './show'

export const pathLength = (path: Point[]) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]), 0)

export function fitPath(path: Point[], length: number, keep = -1): Point[] {
  const segs = path.slice(1).map((p, i): Point => [p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]])
  const len = (v: Point) => Math.hypot(...v)
  const fixed = keep > 0 ? len(segs[keep - 1]) : 0
  const rest = segs.reduce((sum, v, i) => sum + (i === keep - 1 ? 0 : len(v)), 0) || 1
  const k = Math.max(0, length - fixed) / rest
  const out: Point[] = [path[0]]
  segs.forEach((v, i) => {
    const f = i === keep - 1 ? 1 : k
    const at = out[i]
    out.push([at[0] + v[0] * f, at[1] + v[1] * f, at[2] + v[2] * f].map((x) => Math.round(x * 1000) / 1000) as Point)
  })
  return out
}

export function ledPoints(path: Point[], leds: number): Point[] {
  const total = pathLength(path)
  return Array.from({ length: leds }, (_, i) => {
    let left = total * (leds === 1 ? 0.5 : (i + 0.5) / leds)
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1]
      const b = path[k]
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      if (left <= seg || k === path.length - 1) {
        const f = seg ? Math.min(1, left / seg) : 0
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
      }
      left -= seg
    }
    return path[0]
  })
}

export function tubeGeometry(show: Show, t: TubeBlock) {
  const members = t.set ? membersOf(show, t.set) : [t]
  const points = members.flatMap((m) => m.path)
  const lo = Math.min(...points.map((p) => p[1]))
  const hi = Math.max(...points.map((p) => p[1]))
  const far = Math.max(...points.map((p) => Math.hypot(...p)))
  const leds = ledPoints(t.path, t.leds)
  const r = (v: number) => Math.round(v * 1000) / 1000
  return { index: Math.max(0, members.findIndex((m) => m.id === t.id)), count: members.length, height: leds.map((p) => r((p[1] - lo) / (hi - lo || 1))), distance: leds.map((p) => r(Math.hypot(...p) / (far || 1))) }
}
