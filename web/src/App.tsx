import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Panel, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  type Edge, type Connection, type OnSelectionChangeParams, type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bridge } from './td/bridge'
import { Td, colorTable, valueTable } from './td/td'
import { SCALE, STEP, flipY, metres, unitSize } from './td/spots'
import { isLight, ownersOf, type Cable, type TubeDesign, INPUTS_ID, LAYOUT, LAYOUT_KINDS, NODE_H, OUTPUTS_ID, SELECTOR_ID, hasProfile, profileOf, scenesOf, sendersOf, type Block, type ColorResponse, type FloorPlan, type PaletteItem, type Placement, type Show, type Wire } from './model/show'
import { ceilingAt, addCable, canCable, removeCables, unitsOf } from './model/units'
import { setDesign, placeUnit, copyBlocks, diffShows, pasteBlocks, moveScene, newBlock, patchBlock, removeBlocks, type Clip } from './model/edit'
import { addWire, canWire, drivenPorts, outOfRooms, removeWires } from './model/wiring'
import { downstream, repatch } from './model/patch'
import { FIXTURES, compiledOf, setCustomProfiles, type StoredProfile } from './model/fixtures'
import { addComposite, addDesign, addPalette, setProfile, type ColorPalette } from './model/library'
import { LibraryView } from './views/LibraryView'
import { ProfileEditor } from './views/ProfileEditor'
import { BlockNode, RailNode, ZoneNode, type FlowNode } from './editor/BlockNode'
import { BoxNode, UnitNode, type UnitFlowNode } from './editor/UnitNode'
import { BlockPanel } from './panels/BlockPanel'
import { RigPanel } from './panels/RigPanel'
import { MultiPanel } from './panels/MultiPanel'
import { Palette } from './editor/Palette'
import { PaletteView } from './views/PaletteView'
import { PatchView } from './views/PatchView'
import { changedWires } from './views/scenePatch'
import { Simulator } from './sim/Simulator'
import { Schedule } from './views/Schedule'
import { Plot } from './views/Plot'
import { download } from './td/blt'
import { wipesMoved } from './blocks/group'
import { ConnectContext, DirectorContext, FocusContext, PickContext, portKey, type PortKey } from './editor/connect'
import { LiveContext, outputValue, record, type PortValues } from './editor/live'
import { type AnyNode, type FloorView, alignScenes, toNodes, toEdges, toCable, connectPairs, toWire, cabled, wireTargets } from './editor/graph'
import { CalibrateBar, FloorPlanLayer, PlanImport } from './editor/FloorPlan'
import type { PlanImage } from './editor/planImage'
import { calibrate, movePlan, newPlan, type Calib } from './model/floorplan'
import { floorOf, floorsOf, withPlan } from './model/floors'
import { FloorsPanel } from './panels/FloorsPanel'
import { withRails, load, DRAFT_KEY, OFFLINE_KEY, readDraft, remember, offlineEdits } from './editor/draft'

const NODE_TYPES = { block: BlockNode, unit: UnitNode, box: BoxNode, rail: RailNode, zone: ZoneNode }
const GRID = 20

const snap = (v: number) => Math.round(v / GRID) * GRID
const centred = (v: number, size: number) => Math.round((v + size / 2) / (SCALE / STEP)) * (SCALE / STEP) - size / 2

function Editor() {
  const [url, setUrl] = useState(() => localStorage.getItem('bridgeUrl') ?? 'ws://localhost:9980')
  const [connected, setConnected] = useState(false)
  const connectedRef = useRef(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState<Show>(readDraft)
  const baseline = useRef(show)
  const [conflict, setConflict] = useState<[Show, string[]] | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIds = useRef<string[]>([])
  const [multi, setMulti] = useState<string[]>([])
  const clipboard = useRef<Clip | null>(null)
  const td = useRef<Td>(null)
  const showRef = useRef(show)
  const [debug, setDebug] = useState(false)
  const [page, setPage] = useState<'build' | 'simulate' | 'schedule' | 'plot'>('build')
  const [tab, setTab] = useState<string | null>(null)
  const [paletteId, setPaletteId] = useState<string | null>(null)
  const [patchId, setPatchId] = useState<string | null>(null)
  const [library, setLibrary] = useState(false)
  const [editing, setEditing] = useState<StoredProfile | null | undefined>(undefined)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [planFile, setPlanFile] = useState<File | null>(null)
  const [floorView, setFloorView] = useState<{ floor: string; all: boolean }>(() => { try { return { floor: '', all: false, ...JSON.parse(localStorage.getItem('layoutFloor') ?? '{}') } } catch { return { floor: '', all: false } } })
  const floorRef = useRef(floorView)
  const viewOf = useCallback((s: Show): FloorView => ({ id: floorOf(s, floorRef.current.floor).id, all: floorRef.current.all }), [])
  const [calib, setCalib] = useState<Calib | null>(null)
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
  useEffect(() => {
    setPicked(new Set())
    setCalib(null)
  }, [tab])
  const tabRef = useRef(tab)
  tabRef.current = tab
  const [tick, setTick] = useState(0)
  const past = useRef<Show[]>([])
  const future = useRef<Show[]>([])
  const [historyTick, setHistoryTick] = useState(0)
  const valuesRef = useRef<PortValues>({})
  const historyRef = useRef(new Map<string, number[]>())
  const { screenToFlowPosition, fitView, getNode } = useReactFlow()
  const onLayoutNodesChange = useCallback((changes: NodeChange<AnyNode>[]) => onNodesChange(changes.map((c) => {
    const n = c.type === 'position' && c.position && getNode(c.id)
    if (!n || !n.style) return c
    return { ...c, position: { x: centred(c.position!.x, Number(n.style.width)), y: centred(c.position!.y, Number(n.style.height)) } }
  })), [onNodesChange, getNode])

  const apply = useCallback((next: Show) => {
    setCustomProfiles(next.profiles ?? [])
    showRef.current = next
    setShow(next)
    setNodes((prev) => toNodes(next, prev, tabRef.current, viewOf(next)))
    setEdges(toEdges(next, tabRef.current))
  }, [setNodes, setEdges, viewOf])

  useEffect(() => {
    floorRef.current = floorView
    try { localStorage.setItem('layoutFloor', JSON.stringify(floorView)) } catch { /* private mode */ }
    setSelectedId(null)
    setNodes((prev) => toNodes(showRef.current, prev, tab, viewOf(showRef.current)))
    setEdges(toEdges(showRef.current, tab))
    const t = setTimeout(() => fitView({ padding: 0.1 }), 60)
    return () => clearTimeout(t)
  }, [tab, floorView, setNodes, setEdges, fitView, viewOf])

  const queue = useRef<Promise<void>>(Promise.resolve())
  const saving = useRef<Show | null>(null)

  const tdDo = useCallback((work: () => Promise<unknown>) => {
    queue.current = queue.current.then(async () => {
      if (!connectedRef.current) return
      try {
        setError('')
        await work()
      } catch (e) {
        if (connectedRef.current) setError((e as Error).message)
      }
    })
    return queue.current
  }, [])

  const saveLatest = useCallback(async (show: Show) => {
    if (saving.current === show) await td.current!.saveShow(show)
  }, [])

  const commit = useCallback((next: Show, work?: () => Promise<unknown>) => {
    if (!next.rails) next = withRails(next)
    const prev = showRef.current
    past.current = [...past.current.slice(-99), prev]
    future.current = []
    setHistoryTick((t) => t + 1)
    apply(next)
    saving.current = next
    tdDo(async () => {
      await work?.()
      const moved = wipesMoved(prev, next)
      if (moved.length) await td.current!.buildAll(next, moved)
      await saveLatest(next)
    })
  }, [apply, tdDo, saveLatest])

  const rebuild = useCallback((next: Show, ids: string[]) => td.current!.buildAll(next, downstream(next, ids)), [])

  const adopt = useCallback(async (loaded: Show, rewired: string[] = []) => {
    const t = td.current!
    remember(OFFLINE_KEY, null)
    baseline.current = loaded
    apply(loaded)
    const present = new Set(await t.existing())
    const wanted = new Set([...loaded.blocks.filter((b) => b.kind !== 'scene' && b.kind !== 'composite' && b.kind !== 'audiosource' && b.kind !== 'box' && b.kind !== 'tubeset').map((b) => b.id), SELECTOR_ID])
    await rebuild(loaded, [...wanted].filter((id) => !present.has(id) || rewired.includes(id)))
    const extra = [...present].filter((id) => !wanted.has(id))
    if (extra.length) await t.destroy(extra)
    if (rewired.length) await t.saveShow(loaded)
  }, [apply, rebuild])

  const replaceTd = useCallback(async (next: Show) => {
    const t = td.current!
    const present = await t.existing()
    if (present.length) await t.destroy(present)
    await rebuild(next, [SELECTOR_ID, ...next.blocks.map((b) => b.id)])
  }, [rebuild])

  const sendMine = useCallback(async () => {
    const mine = showRef.current
    remember(OFFLINE_KEY, null)
    baseline.current = mine
    await replaceTd(mine)
    await td.current!.saveShow(mine)
  }, [replaceTd])

  const sync = useCallback(async () => {
    const t = td.current!
    const raw = await t.loadShow()
    await t.legacy()
    const mine = showRef.current
    if (!raw?.blocks?.length && mine.blocks.length) return sendMine()
    const theirs = load(raw ?? {})
    const rewired = wireTargets(theirs, theirs.wires.filter((w) => !(raw?.wires ?? []).some((r) => r.from === w.from && r.fromPort === w.fromPort && r.to === w.to && r.port === w.port)))
    if (!mine.blocks.length) return adopt(theirs, rewired)
    setCustomProfiles(mine.profiles ?? [])
    if (offlineEdits() && JSON.stringify(theirs) !== JSON.stringify(mine)) return setConflict([theirs, rewired])
    await adopt(theirs, rewired)
  }, [adopt, sendMine])

  const repatchAll = useCallback(() => {
    const next = repatch(showRef.current)
    commit(next, () => rebuild(next, next.blocks.filter((b) => b.kind === 'fixture').map((b) => b.id)))
  }, [commit, rebuild])

  const rebuildAll = useCallback(() => tdDo(() => rebuild(showRef.current, [SELECTOR_ID, ...showRef.current.blocks.map((b) => b.id)])), [tdDo, rebuild])

  const travel = useCallback((target: Show) => {
    const from = showRef.current
    const d = diffShows(from, target)
    apply(target)
    saving.current = target
    tdDo(async () => {
      const t = td.current!
      if (d.removed.length) await t.destroy(d.removed)
      for (const b of d.moved) await t.move(b.id, b.x, b.y)
      await t.place(target, [INPUTS_ID, OUTPUTS_ID, ...target.blocks.filter((b) => LAYOUT_KINDS.includes(b.kind)).map((b) => b.id)])
      const ids = [...new Set([...d.rebuilt, ...wireTargets(target, d.wires).filter((id) => target.blocks.some((b) => b.id === id) || id === SELECTOR_ID), ...(d.scenes ? [SELECTOR_ID, ...target.blocks.filter((b) => b.kind === 'manual').map((b) => b.id)] : []), ...(d.cables ? cabled(target) : []), ...(from.visualiser !== target.visualiser ? sendersOf(target) : [])])]
      await rebuild(target, [...ids, ...wipesMoved(from, target)])
      await saveLatest(target)
    })
  }, [apply, tdDo, rebuild, saveLatest])

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
      commit(loaded, () => replaceTd(loaded))
    }).catch((e: Error) => setError(e.message))
  }, [commit, replaceTd])

  const sceneListChanged = useCallback((next: Show) => [SELECTOR_ID, ...next.blocks.filter((b) => b.kind === 'manual').map((b) => b.id)], [])

  useEffect(() => {
    localStorage.setItem('bridgeUrl', url)
    const b = new Bridge(url)
    td.current = new Td(b)
    b.onStatus = (ok) => {
      connectedRef.current = ok
      setConnected(ok)
      if (ok) tdDo(sync)
      else {
        setError('')
        setConflict(null)
      }
    }
    b.connect()
    return () => b.close()
  }, [url, sync, tdDo])

  useEffect(() => {
    const t = setTimeout(() => remember(DRAFT_KEY, JSON.stringify(show)), 300)
    if (show !== baseline.current && !connectedRef.current) remember(OFFLINE_KEY, '1')
    return () => clearTimeout(t)
  }, [show])

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
      const floor = floorOf(made, floorRef.current.floor).elevation
      const next = patchBlock(made, block.id, { sim: { position: [metres(x), hung ? ceilingAt(made, metres(x), metres(y), floor) ?? floor + 3 : block.kind === 'box' ? floor : floor + 1, metres(y)], rotation: [0, 0, 0] } })
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
      if (e.key === 'a') { setNodes((ns) => ns.map((n) => ({ ...n, selected: n.type !== 'rail' && n.type !== 'zone' }))); e.preventDefault(); return }
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
    commit(next, () => rebuild(next, wireTargets(prev, prev.wires.filter((w) => !next.wires.includes(w)))))
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
    const placed: string[] = []
    for (const n of dragged) {
      if (n.type === 'rail') {
        next = { ...next, rails: { ...next.rails, [n.id]: { x: Math.round(n.position.x), y: Math.round(n.position.y) } } }
        placed.push(n.id)
        continue
      }
      if (n.type === 'unit' || n.type === 'box') {
        const u = (n as UnitFlowNode).data.unit
        const [w, h] = unitSize(u)
        const p = u.placement
        next = placeUnit(next, n.id, { ...p, position: [metres(n.position.x + w / 2), p.position[1], metres(n.position.y + h / 2)] })
        placed.push(n.id)
        continue
      }
      const x = Math.round(n.position.x)
      const y = Math.round(flipY(n.position.y, (n as FlowNode).data.block.h))
      next = patchBlock(next, n.id, { x, y })
      moved.push([n.id, x, y])
    }
    commit(next, async () => {
      for (const [id, x, y] of moved) await td.current!.move(id, x, y)
      if (placed.length) await td.current!.place(next, placed)
    })
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
    if (block.kind === 'scene' && Object.keys(patch).every((k) => k === 'fadeIn' || k === 'fadeOut')) {
      commit(next, () => td.current!.setFades(next))
      return
    }
    if (block.kind === 'scene' && 'rooms' in patch) {
      const gone = outOfRooms(next, block.id)
      const pruned = removeWires(next, gone)
      commit(pruned, gone.length ? () => rebuild(pruned, wireTargets(next, gone)) : undefined)
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

  const alignDirector = useCallback(() => {
    let next = showRef.current
    const moved = alignScenes(next)
    for (const [id, x, y] of moved) next = patchBlock(next, id, { x, y })
    commit(next, async () => {
      for (const [id, x, y] of moved) await td.current!.move(id, x, y)
    })
  }, [commit])
  const director = useMemo(() => ({ patch: setPatchId, align: alignDirector }), [alignDirector])

  const closePalette = useCallback(() => setPaletteId(null), [])
  const closePatch = useCallback(() => setPatchId(null), [])

  const rewire = useCallback((next: Show) => {
    const wires = changedWires(showRef.current, next)
    if (wires.length) commit(next, () => rebuild(next, wireTargets(next, wires)))
  }, [commit, rebuild])

  const setResponse = useCallback((profile: string, response: ColorResponse) => {
    commit({ ...showRef.current, responses: { ...showRef.current.responses, [profile]: response } })
  }, [commit])

  const saveProfile = useCallback((profile: StoredProfile) => {
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

  const setValueOf = useCallback((selectedId: string, key: string, value: number, member?: string) => {
    const show = showRef.current
    const block = show.blocks.find((b) => b.id === selectedId)
    if (block?.kind !== 'fixture' && block?.kind !== 'light' && block?.kind !== 'group') return
    const index = profileOf(block).attrs.findIndex((a) => a.key === key)
    if (block.kind === 'group' && member !== undefined) {
      apply(patchBlock(show, selectedId, { aims: { ...block.aims, [member]: { ...block.aims[member], [key]: value } } }))
      if (connectedRef.current) td.current!.setValue(selectedId, index, value, [`m${Number(member) + 1}_`], key).catch((e) => setError(e.message))
      return
    }
    apply(patchBlock(show, selectedId, { values: { ...block.values, [key]: value } }))
    const prefixes = block.kind === 'group' ? Array.from({ length: block.size }, (_, i) => `m${i + 1}_`) : ['']
    if (connectedRef.current) td.current!.setValue(selectedId, index, value, prefixes, key).catch((e) => setError(e.message))
  }, [apply])

  const setValue = useCallback((key: string, value: number, member?: string) => { if (sel) setValueOf(sel, key, value, member) }, [sel, setValueOf])

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

  const jump = useCallback((id: string) => {
    setPage('build')
    setTab(LAYOUT)
    setTimeout(() => {
      selectOnly([id])
      fitView({ nodes: [{ id }], maxZoom: 1.5, duration: 300 })
    }, 120)
  }, [selectOnly, fitView])

  const setPlan = useCallback((floor: string, plan: FloorPlan | null) => commit(withPlan(showRef.current, floor, plan)), [commit])
  const planOf = (floor: string) => floorOf(showRef.current, floor).floorplan
  const showFloor = useCallback((floor: string, all = false) => setFloorView({ floor, all }), [])
  const setVisualiser = useCallback((ip: string) => {
    const { visualiser: _old, ...rest } = showRef.current
    const next: Show = ip ? { ...rest, visualiser: ip } : rest
    commit(next, () => rebuild(next, sendersOf(next)))
  }, [commit, rebuild])

  const commitFloors = useCallback((next: Show) => {
    if (!floorsOf(next).some((f) => f.id === calib?.floor && f.floorplan)) setCalib(null)
    commit(next)
  }, [commit, calib])

  const placePlan = useCallback(({ src, aspect }: PlanImage) => {
    setPlanFile(null)
    const floor = floorOf(showRef.current, floorRef.current.floor).id
    const p = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setPlan(floor, newPlan(src, aspect, [p.x / SCALE, p.y / SCALE]))
    setCalib({ floor, points: [] })
  }, [setPlan, screenToFlowPosition])

  const listAudioDevices = useCallback(() => td.current!.audioDevices(), [])

  const readValues = useCallback(async (names: string[], member?: string) => {
    if (connectedRef.current) return td.current!.readValues(sel!, names, member === undefined ? '' : `m${Number(member) + 1}_`)
    const block = showRef.current.blocks.find((b) => b.id === sel)
    if (!block || !isLight(block)) return {}
    const aims = block.kind === 'group' && member !== undefined ? block.aims[member] ?? {} : {}
    return Object.fromEntries(names.map((n) => [n, aims[n] ?? block.values[n] ?? 0]))
  }, [sel])

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
  const patchScene = show.blocks.find((b) => b.id === patchId && b.kind === 'scene')
  const focused = new Set(tab === LAYOUT ? [] : multi)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const activeFloor = floorOf(show, floorView.floor)
  const floors = floorsOf(show)
  const shownEdges = edges.filter((e) => tab !== LAYOUT || (nodeIds.has(e.source) && nodeIds.has(e.target))).map((e) => {
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
          <button className={page === 'schedule' ? 'on' : ''} onClick={() => setPage('schedule')}>schedule</button>
          <button className={page === 'plot' ? 'on' : ''} onClick={() => setPage('plot')}>plot</button>
        </nav>
        <input className="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button onClick={undo} disabled={!past.current.length} title="undo (⌘Z)">undo</button>
        <button onClick={redo} disabled={!future.current.length} title="redo (⇧⌘Z)">redo</button>
        <button onClick={rebuildAll} disabled={!connected}>rebuild all</button>
        <button onClick={exportShow} title="download the show as a JSON file to keep or hand off">save file</button>
        <label className="toggle" title="open a show JSON file, replacing the current one"><input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importShow(f); e.target.value = '' }} />open file</label>
        <button onClick={() => setLibrary(true)} title="import, use and export shared fixture profiles, tube designs, palettes and composites">library</button>
        <button onClick={repatchAll} title="number DMX addresses along each cable chain">repatch</button>
        <label className="toggle"><input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> debug</label>
        {connected ? <span className="error">{error}</span> : <span className="design-mode" title="the show autosaves in this browser; TouchDesigner gets it when it connects">design mode · not connected to TouchDesigner</span>}
      </header>
      {conflict && (
        <div className="modal">
          <div className="dialog conflict">
            <h2>TouchDesigner has a show and you have offline changes</h2>
            <div className="help">Using TouchDesigner's replaces your offline changes; sending yours rebuilds everything in TouchDesigner. Save a file first to keep both.</div>
            <div className="conflict-actions">
              <button onClick={exportShow}>save file</button>
              <button onClick={() => { const [theirs, rewired] = conflict; setConflict(null); tdDo(() => adopt(theirs, rewired)) }}>use TouchDesigner's</button>
              <button onClick={() => { setConflict(null); tdDo(sendMine) }}>send mine to TouchDesigner</button>
            </div>
          </div>
        </div>
      )}
      <nav className="scene-tabs" hidden={page !== 'build'}>
        <button className={tab === LAYOUT ? 'on' : ''} onClick={() => setTab(LAYOUT)}>layout</button>
        <button className={tab === null ? 'on' : ''} onClick={() => setTab(null)}>show</button>
        {scenesOf(show).map((s) => <button key={s.id} className={tab === s.id || openPath.some((o) => o.id === s.id) ? 'on' : ''} onClick={() => setTab(s.id)}>{s.name}</button>)}
        {openPath.filter((o) => o.kind === 'composite').map((o) => <button key={o.id} className={`composite-tab${tab === o.id ? ' on' : ''}`} onClick={() => setTab(o.id)}>› {o.name}</button>)}
      </nav>
      <main hidden={page !== 'build'}>
        <Palette onAdd={addAtCenter} tab={tab} composite={tabBlock?.kind === 'composite'} designs={show.designs ?? []} profiles={[...FIXTURES, ...(show.profiles ?? [])].map(compiledOf)} onNewProfile={() => setEditing(null)} />
        <ConnectContext value={canConnect}>
        <PickContext value={picks}>
        <FocusContext value={focus}>
        <DirectorContext value={director}>
        <LiveContext value={live}>
        <ReactFlow
          nodes={nodes}
          edges={shownEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={tab === LAYOUT ? onLayoutNodesChange : onNodesChange}
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
          snapToGrid={tab !== LAYOUT}
          elevateNodesOnSelect={false}
          elevateEdgesOnSelect={false}
          snapGrid={[GRID, GRID]}
          minZoom={tab === LAYOUT ? 0.02 : 0.1}
          fitView
          colorMode="dark"
        >
          {tab === LAYOUT ? <>
            <Background id="minor" variant={BackgroundVariant.Lines} gap={SCALE / 4} color="#25252d" />
            <Background id="major" variant={BackgroundVariant.Lines} gap={SCALE} color="#3a3a46" bgColor="transparent" />
          </> : <Background gap={GRID} />}
          {tab === LAYOUT && <FloorPlanLayer floors={floors.filter((f) => f.floorplan && (floorView.all || f.id === activeFloor.id))} active={activeFloor.id} calib={calib} onMove={(floor, x, z) => setPlan(floor, movePlan(planOf(floor)!, x, z))} onPoint={(floor, p) => setCalib((c) => c && c.floor === floor ? { floor, points: [...c.points, p] } : c)} />}
          {tab === LAYOUT && calib && floors.some((f) => f.id === calib.floor && f.floorplan) && <CalibrateBar points={calib.points} onApply={(m) => { setPlan(calib.floor, calibrate(planOf(calib.floor)!, calib.points, m)); setCalib(null) }} onReset={() => setCalib({ ...calib, points: [] })} onCancel={() => setCalib(null)} />}
          {tab === LAYOUT && floors.length > 1 && <Panel position="top-left" className="floor-tabs">
            {floors.map((f) => <button key={f.id} className={!floorView.all && f.id === activeFloor.id ? 'on' : ''} onClick={() => showFloor(f.id)}>{f.name}</button>)}
            <button className={floorView.all ? 'on' : ''} onClick={() => showFloor(activeFloor.id, true)} title={`every floor; ${activeFloor.name} is active and the others are greyed`}>all</button>
          </Panel>}
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
        </LiveContext>
        </DirectorContext>
        </FocusContext>
        </PickContext>
        </ConnectContext>
        {multi.length > 1 && (
          <aside className="panel" onMouseUp={saveValues} onTouchEnd={saveValues}>
            <h2>{multi.length} selected</h2>
            <div className="pars">
              <MultiPanel show={show} ids={multi} layout={tab === LAYOUT} onPatch={patchMany} onPlace={placeMany} onValue={(ids, i, v) => ids.forEach((id) => setValueOf(id, i, v))} />
              <div className="help">{multi.map((id) => (tab === LAYOUT ? unitsOf(show).find((u) => u.key === id)?.name : show.blocks.find((b) => b.id === id)?.name) ?? id).join(", ")}</div>
              {tab === LAYOUT && <div className="help">Drag to place them on the floor (bright lines every 1 m, faint every 25 cm).</div>}
              <div className="help">⌘-click adds to the selection; shift-drag draws a box. Dragging moves every selected node. Backspace deletes the selection.</div>
            </div>
          </aside>
        )}
        {tab === LAYOUT && !selected && multi.length <= 1 && <RigPanel show={show} onSchedule={() => setPage('schedule')} onVisualiser={setVisualiser}><FloorsPanel show={show} active={activeFloor.id} onActive={(id) => showFloor(id, floorView.all)} onCommit={commitFloors} onFile={setPlanFile} onCalibrate={() => setCalib({ floor: activeFloor.id, points: [] })} /></RigPanel>}
        {selected && (
          <div className="panel-wrap" onMouseUp={saveValues} onTouchEnd={saveValues}>
            <BlockPanel show={show} block={selected} driven={driven} onPatch={patchSelected} onOpenScene={setTab} onMoveScene={reorderScene} onPatchOther={patchOther} onResetPattern={() => tdDo(() => td.current!.resetPattern(selected.id))} onDesign={changeDesign} layout={unit && { placement: unit.placement, flip: unit.flip, onPlace: (p, flip) => commit(placeUnit(showRef.current, unit.key, p, flip)) }} onValue={setValue} listAudioDevices={listAudioDevices} readValues={readValues} configureAudioSlice={configureAudioSlice} onOpenPalette={setPaletteId} onOpenPatch={setPatchId} />
          </div>
        )}
        {paletteBlock?.kind === 'colors' && <PaletteView show={show} block={paletteBlock} onPatch={(patch) => patchById(paletteBlock.id, patch)} onResponse={setResponse} onClose={closePalette} />}
        {patchScene && <PatchView show={show} scene={patchScene.id} onScene={setPatchId} onChange={rewire} onClose={closePatch} />}
        {library && <LibraryView show={show} onFixture={saveProfile} onDesign={(d) => commit(addDesign(showRef.current, d))} onPalette={placePalette} onComposite={placeComposite} onEditProfile={setEditing} onClose={closeLibrary} />}
        {planFile && <PlanImport file={planFile} onPlan={placePlan} onClose={() => setPlanFile(null)} />}
        {editing !== undefined && <ProfileEditor profile={editing} taken={(show.profiles ?? []).map((p) => p.id)} onSave={saveProfile} onClose={closeEditor} />}
      </main>
      <main hidden={page !== 'simulate'}>
        <Simulator show={show} td={td.current} connected={connected} active={page === 'simulate'} onPlace={placeSim} />
      </main>
      <main hidden={page !== 'schedule'}>
        {page === 'schedule' && <Schedule show={show} onJump={jump} />}
      </main>
      <main hidden={page !== 'plot'}>
        {page === 'plot' && <Plot show={show} />}
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
