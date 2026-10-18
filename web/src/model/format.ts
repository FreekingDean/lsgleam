import type { FixtureProfile } from './fixtures'
import { type Show, type ColorResponse, NO_RESPONSE } from './show'

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
export const isRgb = (p: FixtureProfile) => p.color
export const responseOf = (show: Show, profile: string) => show.responses?.[profile] ?? NO_RESPONSE
export const toSrgb = (l: number) => (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055)
export const previewLight = (rgb: number[], r: ColorResponse) => {
  const light = rgb.map((v, c) => v ** r.gamma * r.multiplier[c])
  const level = Math.max(...light)
  return { light: light.map((l) => l / Math.max(1, level)), level }
}
