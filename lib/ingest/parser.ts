import mammoth from 'mammoth'

export async function parseDocument(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'md' || ext === 'txt') return buffer.toString('utf-8')
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    await parser.destroy()
    return result.text
  }
  throw new Error(`Unsupported file type: ${ext}`)
}
