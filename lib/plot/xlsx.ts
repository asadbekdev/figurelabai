import { parseTable, type ParsedTable } from "./parse"

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const nodeZlib = (
    globalThis as { process?: { versions?: { node?: string } } }
  ).process?.versions?.node
    ? await import("node:zlib")
    : null
  if (nodeZlib) return nodeZlib.inflateRawSync(data)
  const stream = new DecompressionStream("deflate-raw")
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()
  await writer.write(Uint8Array.from(data))
  await writer.close()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return concat(chunks)
}

type ZipEntry = { name: string; data: Uint8Array }

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

export async function readZipEntries(buffer: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const entries: ZipEntry[] = []
  let offset = 0
  while (offset + 30 <= buffer.length) {
    if (readU32(view, offset) !== 0x04034b50) break
    const method = readU16(view, offset + 8)
    const compressedSize = readU32(view, offset + 18)
    const nameLength = readU16(view, offset + 26)
    const extraLength = readU16(view, offset + 28)
    const nameStart = offset + 30
    const name = new TextDecoder().decode(buffer.subarray(nameStart, nameStart + nameLength))
    const dataStart = nameStart + nameLength + extraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
    const data =
      method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null
    if (data) entries.push({ name, data })
    offset = dataStart + compressedSize
  }
  return entries
}

function xmlText(source: string, tag: string): string[] {
  const values: string[] = []
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi")
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    values.push(
      match[1]
        .replace(/<[^>]+>/g, "")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .trim()
    )
  }
  return values
}

function cellRefToIndex(ref: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref)
  if (!match) return null
  let col = 0
  for (const char of match[1].toUpperCase()) {
    col = col * 26 + (char.charCodeAt(0) - 64)
  }
  return { row: Number(match[2]) - 1, col: col - 1 }
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = []
  const siPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gi
  let match: RegExpExecArray | null
  while ((match = siPattern.exec(xml))) {
    strings.push(xmlText(match[1], "t").join(""))
  }
  return strings
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/gi
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowPattern.exec(xml))) {
    const cells: string[] = []
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const attrs = cellMatch[1]
      const ref = /r="([^"]+)"/.exec(attrs)?.[1]
      const type = /t="([^"]+)"/.exec(attrs)?.[1]
      const position = ref ? cellRefToIndex(ref) : null
      let value = ""
      if (type === "s") {
        const index = Number(xmlText(cellMatch[2], "v")[0] ?? "")
        value = shared[index] ?? ""
      } else if (type === "inlineStr") {
        value = xmlText(cellMatch[2], "t").join("")
      } else {
        value = xmlText(cellMatch[2], "v")[0] ?? ""
      }
      if (position) {
        while (cells.length < position.col) cells.push("")
        cells[position.col] = value
      } else {
        cells.push(value)
      }
    }
    if (cells.some((cell) => cell.length > 0)) rows.push(cells)
  }
  return rows
}

export async function parseXlsx(buffer: Uint8Array): Promise<ParsedTable | null> {
  const entries = await readZipEntries(buffer)
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]))
  const sheet =
    byName.get("xl/worksheets/sheet1.xml") ??
    [...byName.entries()].find(([name]) => name.startsWith("xl/worksheets/sheet"))?.[1]
  if (!sheet) return null
  const shared = byName.get("xl/sharedStrings.xml")
    ? parseSharedStrings(new TextDecoder().decode(byName.get("xl/sharedStrings.xml")))
    : []
  const grid = parseSheet(new TextDecoder().decode(sheet), shared)
  if (grid.length < 2) return null
  const width = Math.max(...grid.map((row) => row.length))
  if (width < 2) return null
  const columns = grid[0].map((cell, index) => cell || `Column ${index + 1}`)
  while (columns.length < width) columns.push(`Column ${columns.length + 1}`)
  const rows = grid.slice(1).map((row) => {
    const next = row.slice()
    while (next.length < columns.length) next.push("")
    return next.slice(0, columns.length)
  })
  return { columns, rows }
}

export async function parseXlsxFile(file: File): Promise<ParsedTable | null> {
  const buffer = new Uint8Array(await file.arrayBuffer())
  return await parseXlsx(buffer)
}

export function tableFromXlsxOrCsv(textOrTable: string | ParsedTable): ParsedTable | null {
  if (typeof textOrTable !== "string") return textOrTable
  return parseTable(textOrTable)
}

function crc32(data: Uint8Array): number {
  let crc = ~0
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return ~crc >>> 0
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return bytes
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function createMinimalXlsx(table: ParsedTable): Uint8Array {
  const shared = [...table.columns, ...table.rows.flat()]
  const unique: string[] = []
  const indexOf = new Map<string, number>()
  for (const value of shared) {
    if (!indexOf.has(value)) {
      indexOf.set(value, unique.length)
      unique.push(value)
    }
  }
  const sharedXml = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${unique.length}" uniqueCount="${unique.length}">${unique
    .map((value) => `<si><t>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</t></si>`)
    .join("")}</sst>`
  const sheetRows = [table.columns, ...table.rows].map((row, rowIndex) => {
    const cells = row
      .map((value, colIndex) => {
        const col = String.fromCharCode(65 + colIndex)
        const ref = `${col}${rowIndex + 1}`
        return `<c r="${ref}" t="s"><v>${indexOf.get(value)}</v></c>`
      })
      .join("")
    return `<row r="${rowIndex + 1}">${cells}</row>`
  })
  const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows.join(
    ""
  )}</sheetData></worksheet>`
  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
  return createStoredZip([
    { name: "xl/sharedStrings.xml", body: sharedXml },
    { name: "xl/worksheets/sheet1.xml", body: sheetXml },
    { name: "xl/workbook.xml", body: workbookXml },
  ])
}

export function createStoredZip(files: Array<{ name: string; body: string }>): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = new TextEncoder().encode(file.name)
    const data = new TextEncoder().encode(file.body)
    const crc = crc32(data)
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ])
    locals.push(local)
    centrals.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ])
    )
    offset += local.length
  }
  const central = concat(centrals)
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ])
  return concat([...locals, central, end])
}
