import { useState } from 'react'

type Named = { name: string }

export function PositionRows<T extends Named>({ positions, locked, summary, onStore, onSet, onGo, onChange }: {
  positions: T[]; locked: boolean; summary: (p: T) => string
  onStore: () => Promise<T>; onSet: (p: T) => Promise<T>; onGo: (p: T) => void; onChange: (positions: T[]) => void
}) {
  const [error, setError] = useState('')
  const attempt = (work: () => Promise<void>) => work().catch((e: Error) => setError(e.message))
  const store = () => attempt(async () => onChange([...positions, await onStore()]))
  const overwrite = (i: number) => attempt(async () => {
    const next = await onSet(positions[i])
    onChange(positions.map((q, k) => (k === i ? next : q)))
  })
  return (
    <>
      <hr />
      <div className="positions-head">
        <h4>Positions</h4>
        <button onClick={store}>store current</button>
      </div>
      {error && <div className="error">{error}</div>}
      {positions.map((p, i) => (
        <div key={i} className={`position${locked ? ' driven' : ''}`}>
          <span className="position-index">{i}</span>
          <input value={p.name} onChange={(e) => onChange(positions.map((q, k) => (k === i ? { ...q, name: e.target.value } : q)))} />
          <span className="position-values">{summary(p)}</span>
          <button disabled={locked} title="move here" onClick={() => onGo(p)}>go</button>
          <button title="overwrite with current" onClick={() => overwrite(i)}>set</button>
          <button title="delete" onClick={() => onChange(positions.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
    </>
  )
}
