import { type Base, type ColorStop, type Port, type StripAlong, type StripMode, COLOR_PORT, typed } from '../model/show'
import { hexToRgb } from '../model/format'
import type { BlockDef } from './types'
import python from './strip.py?raw'
import params from './strip_params.py?raw'

export type StripBlock = Base & { kind: 'strip'; mode: StripMode; color: string; stops: ColorStop[]; spread: number; along: StripAlong; dimmer: number; position: number; width: number; speed: number }

const STRIP_USES: Record<StripMode, string[]> = { solid: ['color', 'dimmer'], band: ['color', 'dimmer', 'position', 'width', 'spread'], fill: ['color', 'dimmer', 'position', 'width', 'spread'], chase: ['color', 'dimmer', 'position', 'width', 'speed', 'spread'], ramp: ['dimmer', 'position', 'speed', 'spread', 'stop', 'at'] }
export const stripParams = (b: { stops: ColorStop[] }): Port[] => [{ id: COLOR_PORT, label: 'color', type: 'color' }, typed('dimmer', 'signal'), typed('position', 'signal'), typed('width', 'signal'), typed('speed', 'signal', 'speed (laps/s)'), typed('spread', 'signal', 'spread across tubes'), ...b.stops.flatMap((_, k) => [typed(`stop${k}`, 'color', `stop ${k + 1} colour`), typed(`at${k}`, 'signal', `stop ${k + 1} spot`)])]
export const stripConfig = (b: StripBlock) => ({ mode: b.mode, rgb: hexToRgb(b.color), dimmer: b.dimmer, position: b.position, width: b.width, speed: b.speed, spread: b.spread, stops: b.mode === 'ramp' ? b.stops.map((s) => [s.at, hexToRgb(s.color)]) : [] })

export const strip: BlockDef<StripBlock> = {
  kind: 'strip',
  label: 'Pixel out (LED tubes)',
  info: 'Pixel output: an effect (solid, band, fill, chase, ramp) for every LED tube wired to it on the show tab',
  tab: 'Pixels',
  python: python.replace('STRIP_CODE', JSON.stringify(params)),
  create: (base, n) => ({ ...base, id: `px${n}`, name: `Pixels ${n}`, kind: 'strip', mode: 'band', color: '#ffffff', stops: [{ at: 0, color: '#ff2060' }, { at: 1, color: '#2060ff' }], spread: 0, along: 'tube', dimmer: 1, position: 0.5, width: 0.2, speed: 0.5 }),
  inputs: (b) => stripParams(b).filter((p) => STRIP_USES[b.mode].some((u) => p.id.match(new RegExp(`^${u}\\d*$`)))),
  outputs: () => [],
  subtitle: (b, _outputs, targets) => `${b.mode} → ${targets.join(', ') || 'nothing yet'}`,
  args: (b) => [stripConfig(b)],
}
