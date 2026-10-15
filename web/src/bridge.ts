type Reply = { id: number; ok: boolean; result?: unknown; error?: string }
type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void }

export class Bridge {
  private ws?: WebSocket
  private nextId = 1
  private pending = new Map<number, Pending>()
  private closed = false
  private url: string
  onStatus?: (connected: boolean) => void

  constructor(url: string) {
    this.url = url
  }

  connect() {
    this.closed = false
    const ws = new WebSocket(this.url)
    this.ws = ws
    ws.onopen = () => this.onStatus?.(true)
    ws.onmessage = (ev) => {
      const r = JSON.parse(ev.data) as Reply
      const p = this.pending.get(r.id)
      if (!p) return
      this.pending.delete(r.id)
      if (r.ok) p.resolve(r.result)
      else p.reject(new Error(r.error))
    }
    ws.onclose = () => {
      this.onStatus?.(false)
      this.pending.forEach((p) => p.reject(new Error('disconnected')))
      this.pending.clear()
      if (!this.closed) setTimeout(() => this.connect(), 1000)
    }
    ws.onerror = () => ws.close()
  }

  close() {
    this.closed = true
    this.onStatus = undefined
    this.ws?.close()
  }

  eval<T>(code: string): Promise<T> {
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return reject(new Error('not connected'))
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      this.ws.send(JSON.stringify({ id, code }))
    })
  }
}
