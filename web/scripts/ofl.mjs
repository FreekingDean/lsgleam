import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const COMMIT = '82fa2646d57a38c09649f3f918aa16babcd01aa5'
const URL = `https://codeload.github.com/OpenLightingProject/open-fixture-library/tar.gz/${COMMIT}`
const OUT = join(import.meta.dirname, '..', 'public', 'ofl')

const work = mkdtempSync(join(tmpdir(), 'ofl-'))
const tarball = join(work, 'ofl.tar.gz')
const response = await fetch(URL)
if (!response.ok) throw new Error(`${URL}: ${response.status}`)
writeFileSync(tarball, Buffer.from(await response.arrayBuffer()))
execFileSync('tar', ['-xzf', tarball, '-C', work, `open-fixture-library-${COMMIT}/fixtures`])
const root = join(work, `open-fixture-library-${COMMIT}`, 'fixtures')

const manufacturers = JSON.parse(readFileSync(join(root, 'manufacturers.json'), 'utf8'))
delete manufacturers.$schema

function pixelCount(fixture, repeatFor) {
  if (Array.isArray(repeatFor)) return repeatFor.length
  const m = fixture.matrix ?? {}
  if (repeatFor === 'eachPixelGroup') return Object.keys(m.pixelGroups ?? {}).length
  if (m.pixelKeys) return m.pixelKeys.flat(2).filter((k) => k !== null).length
  return (m.pixelCount ?? [1, 1, 1]).reduce((a, b) => a * b, 1)
}

const channelCount = (fixture, mode) => mode.channels.reduce((n, c) => n + (c && typeof c === 'object' ? pixelCount(fixture, c.repeatFor) * c.templateChannels.length : 1), 0)

rmSync(OUT, { recursive: true, force: true })
const fixtures = []
for (const man of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  for (const file of readdirSync(join(root, man)).filter((f) => f.endsWith('.json')).sort()) {
    const fixture = JSON.parse(readFileSync(join(root, man, file), 'utf8'))
    if (fixture.redirectTo || !fixture.modes) continue
    const key = file.slice(0, -5)
    mkdirSync(join(OUT, man), { recursive: true })
    writeFileSync(join(OUT, man, file), JSON.stringify(fixture))
    fixtures.push([man, key, fixture.name, fixture.categories, fixture.modes.map((m) => [m.name, channelCount(fixture, m)])])
  }
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ commit: COMMIT, license: 'MIT, Open Fixture Library (https://open-fixture-library.org)', manufacturers: Object.fromEntries(Object.entries(manufacturers).map(([k, v]) => [k, v.name])), fixtures }))
rmSync(work, { recursive: true, force: true })
console.log(`${fixtures.length} fixtures from OFL ${COMMIT.slice(0, 7)} → ${OUT}`)
