import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const APP = '/Applications/TouchDesigner.app/Contents'
const BASE = `${APP}/Resources/tfs/Samples/Setup/Base/NewProject.toe`
const BRIDGE = new URL('../../td/bridge_callbacks.py', import.meta.url)
export const PORT = Number(process.env.TD_TEST_PORT ?? 9981)

function text(content) {
  const body = Buffer.from(content)
  const head = Buffer.alloc(24)
  ;[1, 1, 1, 1, 2, body.length].forEach((v, i) => head.writeUInt32BE(v, i * 4))
  return Buffer.concat([Buffer.from('2\n*'), head, body])
}

export function makeToe() {
  const dir = mkdtempSync(join(tmpdir(), 'lsgleam-td-'))
  const toe = join(dir, 'test.toe')
  cpSync(BASE, toe)
  spawnSync(`${APP}/MacOS/toeexpand`, [toe], { cwd: dir })
  const files = {
    'project1/webserver1.n': 'DAT:webserver\ntile 0 0 130 90\nflags =  viewer 1 parlanguage 0\ncolor 0.55 0.55 0.55\nend\n',
    'project1/webserver1.parm': `?\nactive 67108864 on\nport 67108864 ${PORT}\ncallbacks 67108864 webserver1_callbacks\n?\n`,
    'project1/webserver1_callbacks.n': 'DAT:text\ntile 0 -200 130 90\nflags =  viewer 1 parlanguage 0\ncolor 0.55 0.55 0.55\nend\n',
    'project1/webserver1_callbacks.parm': '?\nlanguage 67108864 python\n?\n',
    'project1/webserver1_callbacks.text': text(readFileSync(BRIDGE, 'utf8')),
  }
  mkdirSync(join(dir, 'test.toe.dir/project1'), { recursive: true })
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(join(dir, 'test.toe.dir', name), data)
    appendFileSync(join(dir, 'test.toe.toc'), `${name}\n`)
  }
  rmSync(toe)
  spawnSync(`${APP}/MacOS/toecollapse`, [toe], { cwd: dir })
  if (!existsSync(toe)) throw new Error('toecollapse failed')
  return toe
}

export function send(code, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`)
    const timer = setTimeout(() => { ws.close(); reject(new Error('timeout')) }, timeout)
    ws.onerror = () => { clearTimeout(timer); reject(new Error('no test TouchDesigner on port ' + PORT)) }
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, code }))
    ws.onmessage = (e) => { clearTimeout(timer); ws.close(); resolve(JSON.parse(e.data)) }
  })
}

export async function start() {
  const toe = makeToe()
  spawn(`${APP}/MacOS/TouchDesigner`, [toe], { detached: true, stdio: 'ignore' }).unref()
  for (let i = 0; i < 120; i++) {
    try { return { toe, ...(await send('result = app.version', 2000)) } } catch { await new Promise((r) => setTimeout(r, 1000)) }
  }
  throw new Error('test TouchDesigner did not start')
}

export const stop = () => send('project.quit(force=True)', 5000).catch(() => null)

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, file] = process.argv.slice(2)
  if (cmd === 'start') console.log(JSON.stringify(await start()))
  else if (cmd === 'stop') console.log(JSON.stringify(await stop()))
  else if (cmd === 'run') console.log(JSON.stringify(await send(readFileSync(file, 'utf8'), 600000)))
  else console.log('usage: node scripts/td.mjs start | stop | run <file.py>')
}
