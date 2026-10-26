import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'vite'

const PORT = 5399
const OUT = join(import.meta.dirname, '..', '..', 'docs', 'images')
const SHOW = readFileSync(join(import.meta.dirname, '..', '..', 'shows', 'seasons.json'), 'utf8')

mkdirSync(OUT, { recursive: true })
const server = await createServer({ root: join(import.meta.dirname, '..'), logLevel: 'error', server: { port: PORT, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ channel: process.env.SHOTS_CHANNEL ?? 'chrome' })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.on('pageerror', (e) => console.error('page error:', e.message))

const pause = (ms = 500) => page.waitForTimeout(ms)
const shot = async (name, target, maxHeight = Infinity) => {
  await pause(300)
  const path = join(OUT, `${name}.png`)
  if (!target) await page.screenshot({ path })
  else {
    const box = await target.boundingBox()
    const bottom = await target.evaluate((el) => Math.max(...[...el.querySelectorAll('*')].map((c) => c.getBoundingClientRect().bottom)))
    await page.screenshot({ path, clip: { x: box.x, y: box.y, width: box.width, height: Math.min(bottom + 16, page.viewportSize().height, box.y + maxHeight) - box.y } })
  }
  console.log(name)
}
const region = async (name, from, to) => {
  await pause(300)
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  const x = Math.min(a.x, b.x) - 12
  await page.screenshot({ path: join(OUT, `${name}.png`), clip: { x, y: a.y - 8, width: Math.max(a.x + a.width, b.x + b.width) - x + 12, height: b.y + b.height - a.y + 16 } })
  console.log(name)
}
const panel = () => page.locator('aside.panel').last()
const page_ = (name) => page.click(`header .tabs button:text-is("${name}")`)
const tab = async (name) => { await page.click(`.scene-tabs button:text-is("${name}")`); await pause(700) }
const paletteTab = (name) => page.click(`.palette-tabs button:text-is("${name}")`)
const add = async (label) => { await page.locator('.palette-item', { hasText: label }).first().dblclick(); await pause() }
const node = (id) => page.locator(`.react-flow__node[data-id="${id}"]`)
const select = async (id) => { await node(id).click({ force: true }); await pause() }
const INPUTS = '__inputs'
const OUTPUTS = '__outputs'
const handle = (nodeId, id) => page.locator(`.react-flow__handle[data-nodeid="${nodeId}"][data-handleid="${id}"]`)
const centre = async (l) => { const b = await l.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2] }
const drag = async (from, to) => { await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(...to, { steps: 12 }); await page.mouse.up(); await pause(400) }
const newest = (kind) => page.evaluate((kind) => JSON.parse(localStorage.getItem('lsgleamShow')).blocks.findLast((b) => b.kind === kind).id, kind)
const deselect = async () => { await page.keyboard.press('Escape'); await pause(200) }
const zoom = async (steps, x = 800, y = 500) => { await page.mouse.move(x, y); for (let i = 0; i < Math.abs(steps); i++) { await page.mouse.wheel(0, steps > 0 ? -100 : 100); await pause(60) } await pause(300) }

await page.goto(`http://localhost:${PORT}/`)
await page.evaluate((show) => {
  localStorage.clear()
  localStorage.setItem('bridgeUrl', 'ws://localhost:1')
  localStorage.setItem('lsgleamShow', show)
}, SHOW)
await page.reload()
await pause(1500)

await shot('show-tab')
await zoom(4, 1150, 600)
await shot('show-closeup', page.locator('.react-flow'))
await page.click('.react-flow__controls-fitview')
await pause()
await shot('header', page.locator('header'))
await page.click('header button:text-is("library")')
await page.click('.library-lib button:text-is("search")')
await page.fill('.ofl-search', 'chauvet slimpar')
await pause(800)
await shot('library-ofl', page.locator('.designer.library'), 420)
await page.keyboard.press('Escape')
await pause()

await tab('layout')
await shot('layout-tab')
await zoom(9, 845, 640)
await shot('layout-closeup', page.locator('.react-flow'))
await page.click('.react-flow__controls-fitview')
await pause()
await shot('rig-panel', panel())
await paletteTab('Fixtures')
await shot('palette-fixtures', page.locator('aside.palette'))
await paletteTab('Hardware')
await select('fix9')
await shot('fixture-panel', panel())
await select('net1')
await shot('artnet-panel', panel())
await select('dmxin8')
await shot('dmx-controller-panel', panel())
await deselect()

await add('OSC out')
await select(await newest('oscout'))
await page.locator('.par', { hasText: 'Name' }).locator('input').fill('MadMapper')
await page.keyboard.press('Enter')
await page.locator('.par', { hasText: 'Address' }).locator('input').fill('/season')
await page.keyboard.press('Enter')
await page.locator('.par', { hasText: 'Scale' }).locator('input').fill('90')
await page.keyboard.press('Enter')
await page.locator('.par', { hasText: 'Glide' }).locator('input').fill('2')
await page.keyboard.press('Enter')
await pause()
await shot('oscout-panel', panel())
await deselect()

await paletteTab('Pixels')
await add('Pixel controller')
await select(await newest('board'))
await shot('board-panel', panel())
await deselect()
await add('LED tubes')
await select(await newest('tubeset'))
await shot('tubes-panel', panel())
await page.click('button:text-is("edit design")')
await pause(800)
await page.click('.designer-side button:text-is("make shape")')
await pause(1200)
await shot('tube-designer', page.locator('.modal .designer'))
await page.click('.designer-side button:text-is("cancel")')
await pause()

await page_('simulate')
await pause(2000)
await shot('simulate')
await page_('schedule')
await pause(800)
await shot('schedule')
await page_('plot')
await pause(800)
await shot('plot')
await page_('build')
await pause()

await tab('show')
await select('scene42')
await shot('scene-panel', panel())
await select('manual53')
await shot('scene-select-panel', panel())
await select('count52')
await page.locator('.par', { hasText: 'At the end' }).locator('select').selectOption('steps')
await pause()
await page.locator('.par:has(> label:text-is("Max"))').locator('input').fill('6')
await page.keyboard.press('Enter')
await page.locator('.par:has(> label:text-is("Every N triggers"))').locator('input').fill('4')
await page.keyboard.press('Enter')
await pause()
await shot('counter-panel', panel())
await deselect()
await node('scene42').locator('.patch-badge').click()
await pause(800)
await shot('patch-matrix', page.locator('.modal .designer'))
await page.click('.patch-view button:text-is("close")')
await pause()

await paletteTab('Logic')
await add('Priority')
const prio = await newest('priority')
const box = await node(prio).boundingBox()
await drag([box.x + 20, box.y + 4], [640, 520])
await zoom(4, 600, 420)
for (let i = 1; i <= 4; i++) await drag(await centre(handle(INPUTS, `dmxin8|ch${i}`)), await centre(handle(prio, `in${i}`)))
await page.click('.react-flow__controls-fitview')
await pause()
await drag(await centre(handle(prio, 'out')), await centre(handle(OUTPUTS, await newest('oscout'))))
await select(prio)
await page.locator('.par', { hasText: 'Name' }).locator('input').fill('Season faders')
await page.keyboard.press('Enter')
await shot('priority-panel', panel())
await zoom(3, 540, 400)
await shot('recipe-priority-osc', page.locator('.react-flow'))
await page.click('.react-flow__controls-fitview')
await deselect()

await tab('Fall')
await shot('scene-tab')
await select('grp64')
await shot('group-panel', panel())
await page.locator('.par', { hasText: 'Wipe' }).locator('input[type=checkbox]').check()
await pause()
const wipe = page.locator('.par:has(> label:text-is("Wipe"))')
await wipe.evaluate((el) => el.scrollIntoView({ block: 'start' }))
await region('group-wipe', wipe, page.locator('.help', { hasText: 'Wipe: each member' }))

await tab('layout')
const plan = await page.evaluate(() => {
  const c = document.createElement('canvas')
  c.width = 1500
  c.height = 600
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#000'
  g.fillStyle = '#000'
  g.lineWidth = 8
  g.strokeRect(50, 100, 1400, 450)
  g.lineWidth = 3
  g.strokeRect(550, 110, 400, 120)
  g.strokeRect(1150, 380, 280, 150)
  g.beginPath()
  g.moveTo(50, 60)
  g.lineTo(1450, 60)
  g.stroke()
  g.font = '32px sans-serif'
  g.fillText('30 m', 710, 45)
  g.fillText('STAGE', 700, 180)
  g.fillText('BAR', 1260, 465)
  return c.toDataURL('image/png').split(',')[1]
})
await page.locator('label.file-button input[type=file]').setInputFiles({ name: 'club-plan.png', mimeType: 'image/png', buffer: Buffer.from(plan, 'base64') })
await pause(1500)
await shot('floor-plan')
await page.click('.calibrate button:text-is("cancel")')

await browser.close()
await server.close()
