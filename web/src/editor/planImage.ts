import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const LONGEST = 3000
const BUDGET = 1_000_000

export type PlanImage = { src: string; aspect: number }

export const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

export async function openPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
}

export async function renderPage(pdf: PDFDocumentProxy, n: number, side: number) {
  const page = await pdf.getPage(n)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: side / Math.max(base.width, base.height) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  await page.render({ canvas, viewport }).promise
  return canvas
}

function encode(source: CanvasImageSource, w: number, h: number): PlanImage {
  for (let side = LONGEST; ; side = Math.round(side * 0.8)) {
    const k = Math.min(1, side / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * k)
    canvas.height = Math.round(h * k)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    for (const q of [0.8, 0.65]) {
      const webp = canvas.toDataURL('image/webp', q)
      const src = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', q)
      if (src.length < BUDGET || side < 1000) return { src, aspect: canvas.width / canvas.height }
    }
  }
}

export async function pdfPlan(pdf: PDFDocumentProxy, n: number) {
  const canvas = await renderPage(pdf, n, LONGEST)
  return encode(canvas, canvas.width, canvas.height)
}

export async function imagePlan(file: File) {
  const bitmap = await createImageBitmap(file)
  const plan = encode(bitmap, bitmap.width, bitmap.height)
  bitmap.close()
  return plan
}
