import type { FixtureProfile } from './fixtures'
import { TINTS } from './ofl'
import { type Color, type Show, type ColorResponse, NO_RESPONSE } from './show'

const FOOT = 0.3048
export function parseLength(text: string) {
  const m = text.trim().toLowerCase().match(/^(-?[\d.]+)\s*(ft|feet|foot|'|m)?$/)
  if (!m || Number.isNaN(Number(m[1]))) return null
  return m[2] && m[2] !== 'm' ? Number(m[1]) * FOOT : Number(m[1])
}
export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Number((seconds % 60).toFixed(2))
  return [h && `${h}h`, m && `${m}m`, (s || !(h || m)) && `${s}s`].filter(Boolean).join(' ')
}
export const formatLength = (m: number) => `${Number(m.toFixed(2))} m (${Number((m / FOOT).toFixed(1))} ft)`

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]
}
export const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`
export const colorOf = (hex: string): Color => ({ hex, white: 0, amber: 0, uv: 0 })
export const toColor = (c: Color | string) => (typeof c === 'string' ? colorOf(c) : c)
export const colorValues = (c: Color) => [...hexToRgb(c.hex), c.white, c.amber, c.uv]
export const EXTRAS = [['white', 'W', 'White'], ['amber', 'A', 'Amber'], ['uv', 'UV', 'UV']] as const
export const BLACK = colorOf('#000000')
export const isRgb = (p: FixtureProfile) => p.color
export const responseOf = (show: Show, profile: string) => show.responses?.[profile] ?? NO_RESPONSE
export const toSrgb = (l: number) => (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055)
export const EMITTERS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], TINTS.white, TINTS.amber, TINTS.uv]
const mixOf = (values: number[]) => [0, 1, 2].map((i) => values.reduce((sum, v, c) => sum + v * EMITTERS[c][i], 0))
export const litHex = (c: Color) => rgbToHex(mixOf(colorValues(c)))
export const previewLight = (values: number[], r: ColorResponse, shown: number[]) => {
  const light = values.map((v, c) => (shown.includes(c) ? v ** r.gamma * r.multiplier[c] : 0))
  const level = Math.max(...mixOf(light))
  const scale = Math.max(1, level)
  return { light: light.map((l) => l / scale), mix: mixOf(light).map((m) => m / scale), level }
}
