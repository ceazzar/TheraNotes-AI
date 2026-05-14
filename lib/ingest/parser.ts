import mammoth from 'mammoth'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function ensurePdfCanvasGlobals() {
  const canvas = require('@napi-rs/canvas') as typeof import('@napi-rs/canvas')
  globalThis.DOMMatrix ??= canvas.DOMMatrix as unknown as typeof DOMMatrix
  globalThis.ImageData ??= canvas.ImageData as unknown as typeof ImageData
  globalThis.Path2D ??= canvas.Path2D as unknown as typeof Path2D
}

export async function parseDocument(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'md' || ext === 'txt') return buffer.toString('utf-8')
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  if (ext === 'pdf') {
    ensurePdfCanvasGlobals()
    // Force the Node/CJS export. Next's production bundler can otherwise pick
    // the browser/pdf.js build, which expects DOMMatrix and fails on Vercel.
    const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    await parser.destroy()
    return result.text
  }
  throw new Error(`Unsupported file type: ${ext}`)
}
