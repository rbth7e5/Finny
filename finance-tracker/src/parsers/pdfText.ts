import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function readPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise
  let text = ''
  for (let page = 1; page <= doc.numPages; page += 1) {
    const p = await doc.getPage(page)
    const content = await p.getTextContent()
    text += `${content.items.map((it) => ('str' in it ? it.str : '')).join('\n')}\n`
  }
  return text
}
