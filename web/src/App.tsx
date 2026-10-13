import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  type Edge, type Connection, type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bridge } from './bridge'
import { Td, colorTable, valueTable } from './td'
import { ceilingAt, ownersOf, membersOf, setDesign, type Cable, type TubeDesign, boardUniverses, tubePatch, EMPTY_SHOW, INPUTS_ID, LAYOUT, NODE_H, ON_PORT, OUTPUTS_ID, RAIL_SEP, SELECTOR_ID, SOURCE_KINDS, TYPE_COLORS, FIXTURE_PORT, addCable, addWire, canCable, canWire, fixturesOf, inputRail, outputRail, placeUnit, removeCables, unitsOf, unitPatch, type Rail, type Unit, copyBlocks, diffShows, downstream, hasProfile, pasteBlocks, drivenPorts, inputPorts, moveScene, newBlock, outputPorts, patchBlock, patchOf, portOf, profileOf, removeBlocks, repatch, removeWires, scenesOf, visibleBlocks, visibleWires, type Block, type Clip, type ColorResponse, type PaletteItem, type Placement, type Show, type Wire } from './show'
import { normalize } from './migrate'
import { FIXTURES, setCustomProfiles, type FixtureProfile } from './fixtures'
import { addComposite, addDesign, addPalette, setProfile, type ColorPalette } from './library'
import { LibraryView } from './LibraryView'
import { ProfileEditor } from './ProfileEditor'
import { BlockNode, RailNode, type FlowNode, type RailFlowNode } from './BlockNode'
import { BoxNode, UnitNode, type BoxFlowNode, type UnitFlowNode } from './UnitNode'
import { BlockPanel } from './BlockPanel'
import { MultiPanel } from './MultiPanel'
import { Palette } from './Palette'
import { PaletteView } from './PaletteView'
import { Simulator } from './Simulator'
import { download } from './blt'
import { ConnectContext, FocusContext, PickContext, portKey, type PortKey } from './connect'
import { LiveContext, liveKey, outputValue, record, type PortValues } from './live'

const NODE_TYPES = { block: BlockNode, unit: UnitNode, box: BoxNode, rail: RailNode }
const SCALE = 100
type AnyNode = FlowNode | UnitFlowNode | BoxFlowNode | RailFlowNode
const unitSize = (u: Unit): [number, number] => {
  if (u.block.kind === 'box') return [u.block.size[0] * SCALE, u.block.size[1] * SCALE]
  const side = Math.max(100, 54 + Math.max(u.inputs.length, u.outputs.length) * 16)
  return [side, side]
}
const GRID = 20
const RAIL_W = 240
const railHeight = (rails: Rail[]) => 50 + rails.reduce((h, r) => h + 22 + r.ports.length * 18, 0)

const snap = (v: number) => Math.round(v / GRID) * GRID
const flipY = (y: number, h: number) => -y - h

function unitSub(show: Show, u: Unit) {
  const b = u.block
  if (b.kind === 'fixture') {
    const p = unitPatch(show, u.key)
    return `${profileOf(b).label} · ${p ? `U${p.universe} @${b.address}` : 'no DMX'}`
  }
  if (b.kind === 'artnet') return `${b.protocol} ${b.ip}`
  if (b.kind === 'audio') return b.device || 'default device'
  if (b.kind === 'cdj') return `player ${b.player}`
  if (b.kind === 'dmxin') return `${b.channels} faders`
  if (b.kind === 'blt') return `OSC :${b.port}`
  if (b.kind === 'audioslice') return `OSC :${b.port}`
  if (b.kind === 'tube') {
    const p = tubePatch(show, b.id)
    return `${b.leds} ${b.protocol} · ${b.length.toFixed(2)} m · ${p ? `out ${p.output} @${p.offset + 1}` : 'no cable'}`
  }
  if (b.kind === 'tubeset') return `${show.designs?.find((d) => d.id === b.design)?.name ?? 'no design'} · ${membersOf(show, b.id).length === 1 ? '1 tube' : `${membersOf(show, b.id).length} tubes`}`
  if (b.kind === 'board') return `${b.ip} · U${b.startUniverse}–${b.startUniverse + boardUniverses(b).length - 1}`
  if (b.kind === 'box') return b.size.map((v) => `${Number((v / 0.3048).toFixed(1))}`).join(' × ') + ' ft'
  return b.kind
}

function railSpots(show: Show): Record<string, { x: number; y: number }> {
  const blocks = visibleBlocks(show, null)
  const top = Math.min(0, ...blocks.map((b) => flipY(b.y, b.h)))
  return {
    [INPUTS_ID]: { x: Math.min(0, ...blocks.map((b) => b.x)) - RAIL_W - 160, y: top },
    [OUTPUTS_ID]: { x: Math.max(400, ...blocks.map((b) => b.x + b.w)) + 160, y: top },
    ...show.rails,
  }
}

function railNodes(show: Show): RailFlowNode[] {
  const spots = railSpots(show)
  const node = (id: string, title: string, rails: Rail[], side: 'in' | 'out'): RailFlowNode => ({ id, type: 'rail', position: spots[id], style: { width: RAIL_W, height: railHeight(rails) }, deletable: false, selectable: false, data: { title, rails, side } })
  return [node(INPUTS_ID, 'Inputs', inputRail(show), 'in'), node(OUTPUTS_ID, 'Outputs', outputRail(show), 'out')]
}

const withRails = (show: Show): Show => ({ ...show, rails: railSpots(show) })

function load(raw: Partial<Show>) {
  setCustomProfiles(raw.profiles ?? [])
  return withRails(normalize(raw))
}

function toNodes(show: Show, prev: AnyNode[], tab: string | null): AnyNode[] {
  const selected = new Set(prev.filter((n) => n.selected).map((n) => n.id))
  if (tab === LAYOUT) return unitsOf(show).filter((u) => !(u.block.kind === 'tube' && u.block.set)).map((u) => {
    const [w, h] = unitSize(u)
    const box = u.block.kind === 'box'
    return {
      id: u.key,
      type: box ? 'box' : 'unit',
      position: { x: u.placement.position[0] * SCALE - w / 2, y: u.placement.position[2] * SCALE - h / 2 },
      style: { width: w, height: h },
      zIndex: box ? 0 : 2,
      draggable: !(u.block.kind === 'box' && u.block.locked),
      selected: selected.has(u.key),
      data: { unit: u, block: u.block, sub: unitSub(show, u) },
    } as AnyNode
  })
  const blocks = visibleBlocks(show, tab)
  const nodes: AnyNode[] = blocks.map((b) => ({
    id: b.id,
    type: 'block',
    position: { x: b.x, y: flipY(b.y, b.h) },
    style: { width: b.w, height: b.h },
    selected: selected.has(b.id),
    data: { block: b, keys: liveKeys(show, b), inputs: inputPorts(b, show, tab), outputs: outputPorts(b, show), patch: patchOf(show, b.id), targets: fixturesOf(show, b.id, true).map((id) => show.blocks.find((x) => x.id === id)?.name ?? id) },
  }))
  return tab === null ? [...railNodes(show), ...nodes] : nodes
}

function liveKeys(show: Show, b: Block) {
  const keys: Record<string, string | null> = {}
  for (const p of inputPorts(b, show)) keys[`in:${p.id}`] = liveKey(show, b, p.id, true)
  for (const p of outputPorts(b, show)) keys[`out:${p.id}`] = liveKey(show, b, p.id, false)
  return keys
}

const isSource = (show: Show, id: string) => SOURCE_KINDS.includes(show.blocks.find((b) => b.id === id)?.kind ?? 'scene')
const isFixture = (show: Show, id: string) => show.blocks.some((b) => b.id === id && (b.kind === 'fixture' || b.kind === 'tube'))

function toEdges(show: Show, tab: string | null): Edge[] {
  if (tab === LAYOUT) return show.cables.map((c) => ({
    id: `cable:${c.from}#${c.fromPort}->${c.to}#${c.port}`,
    source: cableEnd(show, c.from, c.fromPort, 'o')[0],
    sourceHandle: cableEnd(show, c.from, c.fromPort, 'o')[1],
    target: cableEnd(show, c.to, c.port, 'i')[0],
    targetHandle: cableEnd(show, c.to, c.port, 'i')[1],
    data: { cable: c },
    zIndex: 1,
    style: { stroke: TYPE_COLORS[unitsOf(show).find((u) => u.key === c.from)?.outputs.find((p) => p.id === c.fromPort)?.type ?? ''] },
  }))
  return visibleWires(show, tab).map((w) => {
    const rail = tab === null && isSource(show, w.from)
    const out = tab === null && isFixture(show, w.to)
    return {
      id: `${w.scene ?? 'show'}:${w.from}#${w.fromPort}->${w.to}#${w.port}`,
      source: rail ? INPUTS_ID : w.from,
      sourceHandle: rail ? `${w.from}${RAIL_SEP}${w.fromPort}` : w.fromPort,
      target: out ? OUTPUTS_ID : w.to,
      targetHandle: out ? w.to : w.port,
      data: { scene: w.scene },
      style: { stroke: TYPE_COLORS[portOf(show, w)?.type ?? ''] },
    }
  })
}

function cableEnd(show: Show, id: string, port: string, dir: 'o' | 'i'): [string, string] {
  const b = show.blocks.find((x) => x.id === id)
  return b?.kind === 'tube' && b.set ? [b.set, `${dir}:${id}`] : [id, port]
}

const fromHandle = (id: string, handle: string): [string, string] => (handle.startsWith('o:') ? [handle.slice(2), 'out'] : handle.startsWith('i:') ? [handle.slice(2), 'in'] : [id, handle])

const toCable = (c: { source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null }): Cable => {
  const [from, fromPort] = fromHandle(c.source, c.sourceHandle ?? '')
  const [to, port] = fromHandle(c.target, c.targetHandle ?? '')
  return { from, fromPort, to, port }
}

function connectPairs(c: Connection, picked: Set<string>): Connection[] {
  const side = (type: 'source' | 'target', node: string, handle: string) => {
    const key = portKey({ type, node, id: handle })
    if (!picked.has(key)) return [[node, handle]]
    const keys = [...picked].map((k) => JSON.parse(k) as string[]).filter((k) => k[0] === type)
    const y = ([, n, h]: string[]) => document.querySelector(`.react-flow__handle[data-nodeid="${CSS.escape(n)}"][data-handleid="${CSS.escape(h)}"]`)?.getBoundingClientRect() ?? { top: 0, left: 0 }
    return keys.sort((a, b) => y(a).top - y(b).top || y(a).left - y(b).left).map(([, n, h]) => [n, h])
  }
  const sources = side('source', c.source, c.sourceHandle ?? '')
  const targets = side('target', c.target, c.targetHandle ?? '')
  const pairs = sources.length > 1 && targets.length > 1 ? sources.slice(0, targets.length).map((s, i) => [s, targets[i]]) : sources.flatMap((s) => targets.map((t) => [s, t]))
  return pairs.map(([[source, sourceHandle], [target, targetHandle]]) => ({ source, sourceHandle, target, targetHandle }))
}

type Ends = { source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null; data?: Record<string, unknown> }

function toWire(e: Ends, tab?: string | null): Wire {
  const scene = tab === undefined ? (e.data?.scene as string | undefined) : tab ?? undefined
  const [from, fromPort] = e.source === INPUTS_ID ? (e.sourceHandle ?? '').split(RAIL_SEP) : [e.source, e.sourceHandle ?? 'out']
  const [to, port] = e.target === OUTPUTS_ID ? [e.targetHandle ?? '', FIXTURE_PORT] : [e.target, e.targetHandle ?? '']
  return { from, fromPort, to, port, ...(scene ? { scene } : {}) }
}

const cabled = (show: Show) => show.blocks.filter((b) => b.kind === 'artnet' || b.kind === 'dmxin' || b.kind === 'board').map((b) => b.id)

function wireTargets(show: Show, wires: Wire[]) {
  return [...new Set(wires.flatMap((w) => {
    const to = show.blocks.find((b) => b.id === w.to)
    if (to?.kind === 'composite') return [w.port]
    if (to?.kind !== 'scene') return [w.to]
    return [w.port === ON_PORT ? SELECTOR_ID : w.port]
  }))]
}

function Editor() {
  const [url, setUrl] = useState(() => localStorage.getItem('bridgeUrl') ?? 'ws://localhost:9980')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState<Show>(EMPTY_SHOW)
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIds = useRef<string[]>([])
  const [multi, setMulti] = useState<string[]>([])
  const clipboard = useRef<Clip | null>(null)
  const td = useRef<Td>(null)
  const showRef = useRef(show)
  const [debug, setDebug] = useState(false)
  const [page, setPage] = useState<'build' | 'simulate'>('build')
  const [tab, setTab] = useState<string | null>(null)
  const [paletteId, setPaletteId] = useState<string | null>(null)
  const [library, setLibrary] = useState(false)
  const [editing, setEditing] = useState<FixtureProfile | null | undefined>(undefined)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const pickedRef = useRef(picked)
  pickedRef.current = picked
  const togglePorts = useCallback((ports: PortKey[]) => setPicked((prev) => {
    const keys = ports.map(portKey)
    const all = keys.every((k) => prev.has(k))
    const next = new Set(prev)
    for (const k of keys) if (all) next.delete(k); else next.add(k)
    return next
  }), [])
  const picks = useMemo(() => ({ picked, toggle: togglePorts }), [picked, togglePorts])
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('hiddenWires') ?? '[]')) } catch { return new Set() } })
  const [hovered, setHovered] = useState<string | null>(null)
  const toggleHidden = useCallback((id: string) => setHiddenNodes((prev) => {
    const next = new Set(prev)
    if (!next.delete(id)) next.add(id)
    try { localStorage.setItem('hiddenWires', JSON.stringify([...next])) } catch { /* private mode */ }
    return next
  }), [])
  const focus = useMemo(() => ({ hidden: hiddenNodes, toggleHidden, hover: setHovered }), [hiddenNodes, toggleHidden])
  useEffect(() => setPicked(new Set()), [tab])
  const tabRef = useRef(tab)
  tabRef.current = tab
  const [tick, setTick] = useState(0)
  const past = useRef<Show[]>([])
  const future = useRef<Show[]>([])
  const [historyTick, setHistoryTick] = useState(0)
  const valuesRef = useRef<PortValues>({})
  const historyRef = useRef(new Map<string, number[]>())
  const { screenToFlowPosition, fitView } = useReactFlow()

  const apply = useCallback((next: Show) => {
    setCustomProfiles(next.profiles ?? [])
    showRef.current = next
    setShow(next)
    setNodes((prev) => toNodes(next, prev, tabRef.current))
    setEdges(toEdges(next, tabRef.current))
  }, [setNodes, setEdges])

  useEffect(() => {
    setSelectedId(null)
    setNodes((prev) => toNodes(showRef.current, prev, tab))
    setEdges(toEdges(showRef.current, tab))
    const t = setTimeout(() => fitView({ padding: 0.1 }), 60)
    return () => clearTimeout(t)
  }, [tab, setNodes, setEdges, fitView])

  const tdDo = useCallback(async (work: () => Promise<unknown>) => {
    try {
      setError('')
      await work()
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const commit = useCallback((next: Show, work?: () => Promise<unknown>) => {
    if (!next.rails) next = withRails(next)
    past.current = [...past.current.slice(-99), showRef.current]
    future.current = []
    setHistoryTick((t) => t + 1)
    apply(next)
    tdDo(async () => {
      await work?.()
      await td.current!.saveShow(next)
    })
  }, [apply, tdDo])

  const rebuild = useCallback((next: Show, ids: string[]) => td.current!.buildAll(next, downstream(next, ids)), [])

  const sync = useCallback(async () => {
    const t = td.current!
    const loaded = load(await t.loadShow() ?? {})
    apply(loaded)
    await t.legacy()
    const present = new Set(await t.existing())
    const wanted = new Set([...loaded.blocks.filter((b) => b.kind !== 'scene' && b.kind !== 'composite' && b.kind !== 'cdj' && b.kind !== 'box' && b.kind !== 'tubeset').map((b) => b.id), SELECTOR_ID])
    await rebuild(loaded, [...wanted].filter((id) => !present.has(id)))
    const extra = [...present].filter((id) => !wanted.has(id))
    if (extra.length) await t.destroy(extra)
  }, [apply, rebuild])

  const repatchAll = useCallback(() => {
    const next = repatch(showRef.current)
    commit(next, () => rebuild(next, next.blocks.filter((b) => b.kind === 'fixture').map((b) => b.id)))
  }, [commit, rebuild])

  const rebuildAll = useCallback(() => tdDo(() => rebuild(showRef.current, [SELECTOR_ID, ...showRef.current.blocks.map((b) => b.id)])), [tdDo, rebuild])

  const travel = useCallback((target: Show) => {
    const from = showRef.current
    const d = diffShows(from, target)
    apply(target)
    tdDo(async () => {
      const t = td.current!
      if (d.removed.length) await t.destroy(d.removed)
      for (const b of d.moved) await t.move(b.id, b.x, b.y)
      const ids = [...new Set([...d.rebuilt, ...wireTargets(target, d.wires).filter((id) => target.blocks.some((b) => b.id === id) || id === SELECTOR_ID), ...(d.scenes ? [SELECTOR_ID, ...target.blocks.filter((b) => b.kind === 'manual').map((b) => b.id)] : []), ...(d.cables ? cabled(target) : []), ...(d.responses ? target.blocks.filter((b) => b.kind === 'fixture').map((b) => b.id) : [])])]
      await rebuild(target, ids)
      await t.saveShow(target)
    })
  }, [apply, tdDo, rebuild])

  const undo = useCallback(() => {
    const target = past.current.pop()
    if (!target) return
    future.current.push(showRef.current)
    setHistoryTick((t) => t + 1)
    travel(target)
  }, [travel])

  const redo = useCallback(() => {
    const target = future.current.pop()
    if (!target) return
    past.current.push(showRef.current)
    setHistoryTick((t) => t + 1)
    travel(target)
  }, [travel])

  const exportShow = useCallback(() => download('lsgleam-show.json', JSON.stringify(showRef.current, null, 2)), [])

  const importShow = useCallback((file: File) => {
    file.text().then((text) => {
      const loaded = load(JSON.parse(text))
      commit(loaded, async () => {
        const t = td.current!
        const present = await t.existing()
        if (present.length) await t.destroy(present)
        await rebuild(loaded, [SELECTOR_ID, ...loaded.blocks.map((b) => b.id)])
      })
    }).catch((e: Error) => setError(e.message))
  }, [commit, rebuild])

  const sceneListChanged = useCallback((next: Show) => [SELECTOR_ID, ...next.blocks.filter((b) => b.kind === 'manual').map((b) => b.id)], [])

  useEffect(() => {
    localStorage.setItem('bridgeUrl', url)
    const b = new Bridge(url)
    td.current = new Td(b)
    b.onStatus = (ok) => {
      setConnected(ok)
      if (ok) tdDo(sync)
    }
    b.connect()
    return () => b.close()
  }, [url, sync, tdDo])

  useEffect(() => {
    if (!debug || !connected) return
    let busy = false
    const id = setInterval(async () => {
      const picked = selectedIds.current
      if (busy || !picked.length) return
      busy = true
      try {
        const feeding = showRef.current.wires.filter((w) => picked.includes(w.to)).map((w) => w.from)
        valuesRef.current = await td.current!.readPorts([...new Set([...picked, ...feeding])])
        record(showRef.current, valuesRef.current, historyRef.current)
        setTick((t) => t + 1)
      } catch {
        valuesRef.current = {}
      } finally {
        busy = false
      }
    }, 150)
    return () => clearInterval(id)
  }, [debug, connected])

  const live = useMemo(() => ({
    debug,
    get: (key: string) => {
      const [id, port] = key.split(':')
      const block = showRef.current.blocks.find((b) => b.id === id)
      const value = block && outputValue(block, valuesRef.current[id], port, showRef.current)
      return value === undefined ? undefined : { value, history: historyRef.current.get(key) ?? [] }
    },
  }), [debug, tick])

  const addBlock = useCallback((item: PaletteItem, x: number, y: number) => {
    const tab = tabRef.current
    if (tab === LAYOUT) {
      const [made, block] = newBlock(showRef.current, item, -600, -showRef.current.nextId * 40, null)
      const hung = block.kind === 'fixture' || block.kind === 'tube' || block.kind === 'tubeset'
      const next = patchBlock(made, block.id, { sim: { position: [x / SCALE, hung ? ceilingAt(made, x / SCALE, y / SCALE) ?? 3 : block.kind === 'box' ? 0 : 1, y / SCALE], rotation: [0, 0, 0] } })
      commit(next, () => rebuild(next, [block.id]))
      return
    }
    const [next, block] = newBlock(showRef.current, item, x, y, tab)
    commit(next, () => rebuild(next, block.kind === 'scene' ? sceneListChanged(next) : [block.id]))
  }, [commit, rebuild, sceneListChanged])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/lsgleam')
    if (!raw) return
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addBlock(JSON.parse(raw), snap(p.x), tabRef.current === LAYOUT ? snap(p.y) : snap(flipY(p.y, NODE_H)))
  }, [addBlock, screenToFlowPosition])

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const addAtCenter = useCallback((item: PaletteItem) => {
    const p = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    addBlock(item, snap(p.x), tabRef.current === LAYOUT ? snap(p.y) : snap(flipY(p.y, NODE_H)))
  }, [addBlock, screenToFlowPosition])

  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    selectedIds.current = nodes.map((n) => n.id)
    setMulti(nodes.map((n) => n.id))
    setSelectedId(nodes.length === 1 ? nodes[0].id : null)
  }, [])

  const selectOnly = useCallback((ids: string[]) => setNodes((ns) => ns.map((n) => ({ ...n, selected: ids.includes(n.id) }))), [setNodes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { selectOnly([]); setPicked(new Set()); setEdges((es) => es.map((x) => ({ ...x, selected: false }))); return }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z' && e.shiftKey) { redo(); e.preventDefault(); return }
      if (e.key === 'z') { undo(); e.preventDefault(); return }
      if (e.key === 'y') { redo(); e.preventDefault(); return }
      if (e.key === 'a') { setNodes((ns) => ns.map((n) => ({ ...n, selected: n.type !== 'rail' }))); e.preventDefault(); return }
      if (tabRef.current === LAYOUT) {
        if (e.key === 'c') clipboard.current = copyBlocks(showRef.current, selectedIds.current)
        if (e.key === 'v' && clipboard.current) {
          const [pasted, ids] = pasteBlocks(showRef.current, clipboard.current, null)
          let next = pasted
          for (const id of ids) {
            const u = unitsOf(next).find((x) => x.key === id)
            if (u) next = placeUnit(next, id, { ...u.placement, position: [u.placement.position[0] + 1, u.placement.position[1], u.placement.position[2]] })
          }
          if (ids.length) {
            commit(next, () => rebuild(next, ids))
            selectOnly(ids)
          }
        }
        if (e.key === 'c' || e.key === 'v') e.preventDefault()
        return
      }
      if (e.key === 'c' && selectedIds.current.length) {
        clipboard.current = copyBlocks(showRef.current, selectedIds.current)
        e.preventDefault()
      } else if (e.key === 'v' && clipboard.current) {
        const [next, ids] = pasteBlocks(showRef.current, clipboard.current, tabRef.current)
        if (!ids.length) return
        const scenes = next.blocks.some((b) => ids.includes(b.id) && b.kind === 'scene')
        commit(next, () => rebuild(next, scenes ? [...ids, ...sceneListChanged(next)] : ids))
        selectOnly(ids)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commit, rebuild, sceneListChanged, undo, redo, selectOnly, setEdges, setNodes])

  const onNodesDelete = useCallback((deleted: AnyNode[]) => {
    const prev = showRef.current
    const next = removeBlocks(prev, deleted.map((n) => n.id))
    const gone = prev.blocks.filter((b) => !next.blocks.some((x) => x.id === b.id)).map((b) => b.id)
    const affected = downstream(prev, gone).filter((id) => !gone.includes(id) && (id === SELECTOR_ID || next.blocks.some((b) => b.id === id)))
    const scenesGone = prev.blocks.some((b) => gone.includes(b.id) && b.kind === 'scene')
    setSelectedId(null)
    commit(next, async () => {
      await td.current!.destroy(gone)
      await rebuild(next, [...affected, ...(tabRef.current === LAYOUT ? cabled(next) : []), ...(scenesGone ? sceneListChanged(next) : [])])
    })
  }, [commit, rebuild, sceneListChanged])

  const onConnect = useCallback((c: Connection) => {
    const pairs = connectPairs(c, pickedRef.current)
    setPicked(new Set())
    let next = showRef.current
    if (tabRef.current === LAYOUT) {
      for (const pair of pairs) {
        const cable = toCable(pair)
        if (canCable(next, cable.from, cable.fromPort, cable.to, cable.port)) next = addCable(next, cable)
      }
      if (next !== showRef.current) commit(next, () => rebuild(next, cabled(next)))
      return
    }
    const wires: Wire[] = []
    for (const pair of pairs) {
      const wire = toWire(pair, tabRef.current)
      if (!canWire(next, wire.from, wire.fromPort, wire.to, wire.port, tabRef.current)) continue
      next = addWire(next, wire)
      wires.push(wire)
    }
    if (wires.length) commit(next, () => rebuild(next, wireTargets(next, wires)))
  }, [commit, rebuild])

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    if (tabRef.current === LAYOUT) {
      const next = removeCables(showRef.current, deleted.map((e) => (e.data?.cable as Cable | undefined) ?? toCable(e)))
      commit(next, () => rebuild(next, cabled(next)))
      return
    }
    const wires = deleted.map((e) => toWire(e))
    const prev = showRef.current
    const next = removeWires(prev, wires)
    commit(next, () => rebuild(next, wireTargets(prev, wires)))
  }, [commit, rebuild])

  const canConnect = useCallback((source: string, sourceHandle: string, target: string, targetHandle: string) => {
    if (tabRef.current === LAYOUT) {
      const c = toCable({ source, sourceHandle, target, targetHandle })
      return canCable(showRef.current, c.from, c.fromPort, c.to, c.port)
    }
    const w = toWire({ source, sourceHandle, target, targetHandle }, tabRef.current)
    return canWire(showRef.current, w.from, w.fromPort, w.to, w.port, tabRef.current)
  }, [])

  const isValidConnection = useCallback((c: Edge | Connection) => canConnect(c.source, c.sourceHandle ?? 'out', c.target, c.targetHandle ?? ''), [canConnect])

  const onNodeDragStop = useCallback((_: unknown, _n: AnyNode, dragged: AnyNode[]) => {
    let next = showRef.current
    const moved: [string, number, number][] = []
    for (const n of dragged) {
      if (n.type === 'rail') {
        next = { ...next, rails: { ...next.rails, [n.id]: { x: Math.round(n.position.x), y: Math.round(n.position.y) } } }
        continue
      }
      if (n.type === 'unit' || n.type === 'box') {
        const u = (n as UnitFlowNode).data.unit
        const [w, h] = unitSize(u)
        const p = u.placement
        next = placeUnit(next, n.id, { ...p, position: [(n.position.x + w / 2) / SCALE, p.position[1], (n.position.y + h / 2) / SCALE] })
        continue
      }
      const x = Math.round(n.position.x)
      const y = Math.round(flipY(n.position.y, (n as FlowNode).data.block.h))
      next = patchBlock(next, n.id, { x, y })
      moved.push([n.id, x, y])
    }
    commit(next, async () => { for (const [id, x, y] of moved) await td.current!.move(id, x, y) })
  }, [commit])

  const sel = selectedId

  const commitDiff = useCallback((next: Show) => {
    const d = diffShows(showRef.current, next)
    commit(next, async () => {
      if (d.removed.length) await td.current!.destroy(d.removed)
      await rebuild(next, [...d.rebuilt, ...cabled(next)])
    })
  }, [commit, rebuild])

  const patchById = useCallback((selectedId: string, patch: Partial<Block>) => {
    const next = patchBlock(showRef.current, selectedId, patch)
    const block = next.blocks.find((b) => b.id === selectedId)!
    const cosmetic = Object.keys(patch).every((k) => k === 'name') && block.kind !== 'input'
    if (block.kind === 'constant' && Object.keys(patch).every((k) => k === 'value') && block.pulse === 0) {
      commit(next, () => td.current!.setConstant(block.id, block.value))
      return
    }
    const prev = showRef.current.blocks.find((b) => b.id === selectedId)
    if (block.kind === 'tubeset') {
      commitDiff(next)
      return
    }
    if (block.kind === 'strip' && prev?.kind === 'strip' && Object.keys(patch).every((k) => ['color', 'dimmer', 'position', 'width', 'speed', 'spread', 'stops'].includes(k)) && block.stops.length === prev.stops.length) {
      commit(next, () => td.current!.setStrip(block))
      return
    }
    if (block.kind === 'values' && prev?.kind === 'values' && Object.keys(patch).every((k) => k === 'rows') && block.rows.length === prev.rows.length) {
      commit(next, () => td.current!.setColors(block.id, valueTable(block)))
      return
    }
    if (block.kind === 'colors' && prev?.kind === 'colors' && Object.keys(patch).every((k) => k === 'rows') && block.rows.length === prev.rows.length) {
      commit(next, () => td.current!.setColors(block.id, colorTable(block)))
      return
    }
    if (block.kind === 'manual' && 'active' in patch && !showRef.current.wires.some((w) => w.to === block.id && w.port === 'index')) {
      commit(next, () => td.current!.setManual(block.id, block.active, scenesOf(next).length))
      return
    }
    commit(next, cosmetic ? undefined : () => rebuild(next, [block.id]))
  }, [commit, commitDiff, rebuild])

  const patchSelected = useCallback((patch: Partial<Block>) => { if (sel) patchById(sel, patch) }, [sel, patchById])

  const closePalette = useCallback(() => setPaletteId(null), [])

  const setResponse = useCallback((profile: string, response: ColorResponse) => {
    const next = { ...showRef.current, responses: { ...showRef.current.responses, [profile]: response } }
    commit(next, () => rebuild(next, next.blocks.filter((b) => b.kind === 'fixture' && profileOf(b).id === profile).map((b) => b.id)))
  }, [commit, rebuild])

  const saveProfile = useCallback((profile: FixtureProfile) => {
    const next = setProfile(showRef.current, profile)
    commit(next, () => rebuild(next, next.blocks.filter((b) => hasProfile(b) && b.profile === profile.id).map((b) => b.id)))
  }, [commit, rebuild])

  const libraryTab = useCallback((): [string | null, number, number] => {
    if (tabRef.current === LAYOUT) return [null, 0, 0]
    const p = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    return [tabRef.current, snap(p.x), snap(flipY(p.y, NODE_H))]
  }, [screenToFlowPosition])

  const placePalette = useCallback((palette: ColorPalette) => {
    const [next, block] = addPalette(showRef.current, palette, ...libraryTab())
    commit(next, () => rebuild(next, [block.id]))
  }, [commit, rebuild, libraryTab])

  const placeComposite = useCallback((clip: Clip) => {
    const [next, ids] = addComposite(showRef.current, clip, ...libraryTab())
    commit(next, () => rebuild(next, ids))
  }, [commit, rebuild, libraryTab])

  const closeLibrary = useCallback(() => setLibrary(false), [])
  const closeEditor = useCallback(() => setEditing(undefined), [])

  const changeDesign = useCallback((design: TubeDesign) => commitDiff(setDesign(showRef.current, design)), [commitDiff])

  const patchOther = useCallback((id: string, patch: Partial<Block>) => {
    const next = patchBlock(showRef.current, id, patch)
    commit(next, () => rebuild(next, [id]))
  }, [commit, rebuild])

  const reorderScene = useCallback((id: string, dir: -1 | 1) => {
    const next = moveScene(showRef.current, id, dir)
    commit(next, () => rebuild(next, sceneListChanged(next)))
  }, [commit, rebuild, sceneListChanged])

  const onNodeDoubleClick = useCallback((_: unknown, n: AnyNode) => {
    if ('block' in n.data && (n.data.block.kind === 'scene' || n.data.block.kind === 'composite')) setTab(n.id)
    if ('block' in n.data && n.data.block.kind === 'colors') setPaletteId(n.id)
  }, [])

  const setValueOf = useCallback((selectedId: string, index: number, value: number, member?: string) => {
    const show = showRef.current
    const block = show.blocks.find((b) => b.id === selectedId)
    if (block?.kind !== 'fixture' && block?.kind !== 'light' && block?.kind !== 'group') return
    const ch = profileOf(block).channels[index].name
    if (block.kind === 'group' && member !== undefined) {
      apply(patchBlock(show, selectedId, { aims: { ...block.aims, [member]: { ...block.aims[member], [ch]: value } } }))
      td.current!.setValue(selectedId, index, value, [`m${Number(member) + 1}_`], ch).catch((e) => setError(e.message))
      return
    }
    apply(patchBlock(show, selectedId, { values: block.values.map((v, i) => (i === index ? value : v)) }))
    const prefixes = block.kind === 'group' ? Array.from({ length: block.size }, (_, i) => `m${i + 1}_`) : ['']
    td.current!.setValue(selectedId, index, value, prefixes, ch).catch((e) => setError(e.message))
  }, [apply])

  const setValue = useCallback((index: number, value: number, member?: string) => { if (sel) setValueOf(sel, index, value, member) }, [sel, setValueOf])

  const patchMany = useCallback((patches: [string, Partial<Block>][]) => {
    let next = showRef.current
    for (const [id, patch] of patches) next = patchBlock(next, id, patch)
    commit(next, () => rebuild(next, patches.map(([id]) => id)))
  }, [commit, rebuild])

  const placeMany = useCallback((placements: [string, Placement, boolean | undefined][]) => {
    let next = showRef.current
    for (const [key, p, flip] of placements) next = placeUnit(next, key, p, flip)
    commit(next)
  }, [commit])

  const listAudioDevices = useCallback(() => td.current!.audioDevices(), [])

  const readValues = useCallback((names: string[], member?: string) => td.current!.readValues(sel!, names, member === undefined ? '' : `m${Number(member) + 1}_`), [sel])

  const placeSim = useCallback((key: string, p: Placement) => commit(placeUnit(showRef.current, key, p)), [commit])

  const configureAudioSlice = useCallback(() => {
    const block = showRef.current.blocks.find((b) => b.id === sel)
    if (block?.kind !== 'audioslice') return Promise.reject(new Error('no AudioSlice block selected'))
    return td.current!.configureAudioSlice(block)
  }, [sel])

  const saveValues = useCallback(() => {
    tdDo(() => td.current!.saveShow(showRef.current))
  }, [tdDo])

  void historyTick
  const selected = show.blocks.find((b) => b.id === sel) ?? null
  const unit = tab === LAYOUT ? unitsOf(show).find((u) => u.key === selectedId) : undefined
  const tabBlock = show.blocks.find((b) => b.id === tab)
  const paletteBlock = show.blocks.find((b) => b.id === paletteId)
  const focused = new Set(tab === LAYOUT ? [] : multi)
  const shownEdges = edges.map((e) => {
    const lit = hovered !== null && ((e.target === OUTPUTS_ID && e.targetHandle === hovered) || (e.source === INPUTS_ID && e.sourceHandle === hovered))
    const touches = focused.has(e.source) || focused.has(e.target)
    const dim = hovered !== null ? !lit : focused.size > 0 && !touches
    const hidden = (hiddenNodes.has(e.source) || hiddenNodes.has(e.target)) && !lit && !touches
    return hidden || dim ? { ...e, hidden, style: { ...e.style, opacity: dim ? 0.08 : 1 } } : e
  })
  const openPath = tabBlock ? [...ownersOf(show, tabBlock), tabBlock] : []
  const driven = sel ? drivenPorts(show, sel, tab) : new Set<string>()

  return (
    <div className="app">
      <header>
        <span className={`dot${connected ? ' on' : ''}`} />
        <nav className="tabs">
          <button className={page === 'build' ? 'on' : ''} onClick={() => setPage('build')}>build</button>
          <button className={page === 'simulate' ? 'on' : ''} onClick={() => setPage('simulate')}>simulate</button>
        </nav>
        <input className="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button onClick={undo} disabled={!past.current.length} title="undo (⌘Z)">undo</button>
        <button onClick={redo} disabled={!future.current.length} title="redo (⇧⌘Z)">redo</button>
        <button onClick={rebuildAll} disabled={!connected}>rebuild all</button>
        <button onClick={exportShow} title="download the show as JSON">export</button>
        <label className="toggle" title="load a show JSON, replacing the current one"><input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importShow(f); e.target.value = '' }} />import</label>
        <button onClick={() => setLibrary(true)} title="import, use and export shared fixture profiles, tube designs, palettes and composites">library</button>
        <button onClick={repatchAll} disabled={!connected} title="number DMX addresses along each cable chain">repatch</button>
        <label className="toggle"><input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> debug</label>
        <span className="error">{error}</span>
      </header>
      <nav className="scene-tabs" hidden={page !== 'build'}>
        <button className={tab === LAYOUT ? 'on' : ''} onClick={() => setTab(LAYOUT)}>layout</button>
        <button className={tab === null ? 'on' : ''} onClick={() => setTab(null)}>show</button>
        {scenesOf(show).map((s) => <button key={s.id} className={tab === s.id || openPath.some((o) => o.id === s.id) ? 'on' : ''} onClick={() => setTab(s.id)}>{s.name}</button>)}
        {openPath.filter((o) => o.kind === 'composite').map((o) => <button key={o.id} className={`composite-tab${tab === o.id ? ' on' : ''}`} onClick={() => setTab(o.id)}>› {o.name}</button>)}
      </nav>
      <main hidden={page !== 'build'}>
        <Palette onAdd={addAtCenter} tab={tab} composite={tabBlock?.kind === 'composite'} designs={show.designs ?? []} profiles={[...FIXTURES, ...(show.profiles ?? [])]} onNewProfile={() => setEditing(null)} />
        <ConnectContext value={canConnect}>
        <PickContext value={picks}>
        <FocusContext value={focus}>
        <LiveContext value={live}>
        <ReactFlow
          nodes={nodes}
          edges={shownEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          isValidConnection={isValidConnection}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onSelectionChange={onSelectionChange}
          onDrop={onDrop}
          onDragOver={onDragOver}
          deleteKeyCode={['Backspace', 'Delete']}
          snapToGrid
          elevateNodesOnSelect={false}
          elevateEdgesOnSelect={false}
          snapGrid={[GRID, GRID]}
          minZoom={0.1}
          fitView
          colorMode="dark"
        >
          <Background gap={tab === LAYOUT ? SCALE : GRID} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
        </LiveContext>
        </FocusContext>
        </PickContext>
        </ConnectContext>
        {multi.length > 1 && (
          <aside className="panel" onMouseUp={saveValues} onTouchEnd={saveValues}>
            <h2>{multi.length} selected</h2>
            <div className="pars">
              <MultiPanel show={show} ids={multi} layout={tab === LAYOUT} onPatch={patchMany} onPlace={placeMany} onValue={(ids, i, v) => ids.forEach((id) => setValueOf(id, i, v))} />
              <div className="help">{multi.map((id) => (tab === LAYOUT ? unitsOf(show).find((u) => u.key === id)?.name : show.blocks.find((b) => b.id === id)?.name) ?? id).join(", ")}</div>
              {tab === LAYOUT && <div className="help">Drag to place them on the floor (1 grid square = 1 m).</div>}
              <div className="help">⌘-click adds to the selection; shift-drag draws a box. Dragging moves every selected node. Backspace deletes the selection.</div>
            </div>
          </aside>
        )}
        {selected && (
          <div className="panel-wrap" onMouseUp={saveValues} onTouchEnd={saveValues}>
            <BlockPanel show={show} block={selected} driven={driven} onPatch={patchSelected} onOpenScene={setTab} onMoveScene={reorderScene} onPatchOther={patchOther} onResetPattern={() => tdDo(() => td.current!.resetPattern(selected.id))} onDesign={changeDesign} layout={unit && { placement: unit.placement, flip: unit.flip, onPlace: (p, flip) => commit(placeUnit(showRef.current, unit.key, p, flip)) }} onValue={setValue} listAudioDevices={listAudioDevices} readValues={readValues} configureAudioSlice={configureAudioSlice} onOpenPalette={setPaletteId} />
          </div>
        )}
        {paletteBlock?.kind === 'colors' && <PaletteView show={show} block={paletteBlock} onPatch={(patch) => patchById(paletteBlock.id, patch)} onResponse={setResponse} onClose={closePalette} />}
        {library && <LibraryView show={show} onFixture={saveProfile} onDesign={(d) => commit(addDesign(showRef.current, d))} onPalette={placePalette} onComposite={placeComposite} onEditProfile={setEditing} onClose={closeLibrary} />}
        {editing !== undefined && <ProfileEditor profile={editing} taken={(show.profiles ?? []).map((p) => p.id)} onSave={saveProfile} onClose={closeEditor} />}
      </main>
      <main hidden={page !== 'simulate'}>
        <Simulator show={show} td={td.current} connected={connected} active={page === 'simulate'} onPlace={placeSim} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  )
}
