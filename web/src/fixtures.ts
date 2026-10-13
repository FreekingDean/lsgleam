export type Channel = { name: string; label: string; default: number; options?: string[] }
export type Sim = { kind: 'par' } | { kind: 'head'; pan: number; tilt: number }
export type FixtureProfile = { id: string; label: string; channels: Channel[]; position?: string[]; sim: Sim }

function ch(name: string, def = 0, label = name, options?: string[]): Channel {
  return { name, label, default: def, ...(options ? { options } : {}) }
}

export const COLOR_WHEEL = ['White', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Magenta', 'Cyan']
const GOBOS = ['Open', 'Gobo 1', 'Gobo 2', 'Gobo 3', 'Gobo 4', 'Gobo 5', 'Gobo 6', 'Gobo 7']

export const FIXTURES: FixtureProfile[] = [
  {
    id: 'par7',
    label: 'PAR 7ch',
    sim: { kind: 'par' },
    channels: [ch('Dimmer', 1), ch('Red'), ch('Green'), ch('Blue'), ch('Strobe'), ch('Automode', 0, 'Auto mode'), ch('Speed', 0, 'Effect speed')],
  },
  {
    id: 'mh11',
    label: 'Moving head 11ch',
    sim: { kind: 'head', pan: 540, tilt: 270 },
    position: ['Pan', 'Tilt'],
    channels: [
      ch('Pan', 0.5), ch('Panfine', 0, 'Pan fine'), ch('Tilt', 0.5), ch('Tiltfine', 0, 'Tilt fine'),
      ch('Colorwheel', 0, 'Color wheel', COLOR_WHEEL), ch('Gobo', 0, 'Gobo', GOBOS), ch('Strobe'), ch('Dimmer', 1),
      ch('Ptspeed', 0, 'P/T speed'), ch('Automode', 0, 'Auto mode'), ch('Reset', 0, 'Reset / special'),
    ],
  },
]

let custom: FixtureProfile[] = []
export const setCustomProfiles = (profiles: FixtureProfile[]) => { custom = profiles }
export const allProfiles = () => [...FIXTURES, ...custom]
export const findProfile = (id: string) => allProfiles().find((f) => f.id === id) ?? FIXTURES[0]
