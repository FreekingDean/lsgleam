import { useState, type CSSProperties } from 'react'
import { EXTRAS, litHex, parseLength } from '../model/format'
import type { Color } from '../model/show'

export function Field({ label, value, onCommit, type = 'text', step, placeholder }: { label: string; value: string | number; onCommit: (v: string) => void; type?: string; step?: number; placeholder?: string }) {
  const [text, setText] = useState(String(value))
  const commit = () => text !== String(value) && onCommit(text)
  return (
    <div className="par">
      <label>{label}</label>
      <input type={type} step={step} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
    </div>
  )
}

export function NumField({ label, value, onCommit, step = 0.01 }: { label: string; value: number; onCommit: (v: number) => void; step?: number }) {
  return <Field label={label} type="number" step={step} value={value} onCommit={(v) => !Number.isNaN(Number(v)) && onCommit(Number(v))} />
}

export function LengthField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return <Field label={`${label} · ${Number((value / 0.3048).toFixed(1))} ft`} value={Number(value.toFixed(3))} onCommit={(v) => { const m = parseLength(v); if (m !== null) onCommit(m) }} />
}

export function NumberBox({ value, onCommit, max = 1 }: { value: number; onCommit: (v: number) => void; max?: number }) {
  return (
    <input
      className="slider-num"
      type="number"
      min={0}
      max={max}
      step={0.01}
      key={value}
      defaultValue={Number(value.toFixed(3))}
      onBlur={(e) => { const v = Math.max(0, Math.min(max, Number(e.target.value))); if (!Number.isNaN(v) && v !== value) onCommit(v) }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

export const litStyle = (c: Color) => ({ '--lit': litHex(c) }) as CSSProperties

export function ColorExtras({ value, onCommit, disabled }: { value: Color; onCommit: (c: Color) => void; disabled?: boolean }) {
  return (
    <span className="color-extras">
      {EXTRAS.map(([key, short, label]) => (
        <label key={key} title={`${label}, DMX 0–255`}>
          {short}
          <input
            type="number"
            min={0}
            max={255}
            step={1}
            disabled={disabled}
            key={value[key]}
            defaultValue={Math.round(value[key] * 255)}
            onBlur={(e) => { const v = Math.max(0, Math.min(255, Math.round(Number(e.target.value)))) / 255; if (!Number.isNaN(v) && v !== value[key]) onCommit({ ...value, [key]: v }) }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </label>
      ))}
    </span>
  )
}
