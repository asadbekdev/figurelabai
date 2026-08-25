import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import {
  shareRecordSchema,
  type ShareRecord,
  type ShareSnapshot,
} from "./contracts"
import { createShareSalt, hashSharePassword } from "./password"

const MAX_LINKS = 100

export type ShareStore = {
  create(snapshot: ShareSnapshot, options?: { password?: string }): Promise<ShareRecord>
  get(token: string): Promise<ShareRecord | null>
  remove(token: string): Promise<boolean>
  list(): Promise<ShareRecord[]>
}

function nowIso(): string {
  return new Date().toISOString()
}

function createToken(): string {
  return crypto.randomUUID().replaceAll("-", "")
}

export function createMemoryShareStore(seed: ShareRecord[] = []): ShareStore {
  const records = new Map(seed.map((record) => [record.token, record]))

  function prune() {
    if (records.size <= MAX_LINKS) return
    const ranked = [...records.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    )
    for (const record of ranked.slice(0, records.size - MAX_LINKS)) {
      records.delete(record.token)
    }
  }

  return {
    async create(snapshot, options) {
      let token = createToken()
      while (records.has(token)) token = createToken()
      const password = options?.password?.trim()
      const salt = password ? createShareSalt() : undefined
      const record = shareRecordSchema.parse({
        ...snapshot,
        token,
        createdAt: nowIso(),
        passwordProtected: Boolean(password),
        passwordSalt: salt,
        passwordHash: password && salt ? await hashSharePassword(password, salt) : undefined,
      })
      records.set(token, record)
      prune()
      return record
    },
    async get(token) {
      return records.get(token) ?? null
    },
    async remove(token) {
      return records.delete(token)
    },
    async list() {
      return [...records.values()]
    },
  }
}

export function createFileShareStore(
  filePath = join(process.cwd(), ".data", "share-links.json")
): ShareStore {
  const memory = createMemoryShareStore(readPersistedRecords(filePath))

  async function persist() {
    try {
      mkdirSync(dirname(filePath), { recursive: true })
      const rows = await memory.list()
      const tmp = `${filePath}.tmp`
      writeFileSync(tmp, JSON.stringify(rows))
      renameSync(tmp, filePath)
    } catch {
      // Local durability only. A read-only host still keeps links in memory.
    }
  }

  return {
    get: memory.get,
    list: memory.list,
    async create(snapshot, options) {
      const record = await memory.create(snapshot, options)
      await persist()
      return record
    },
    async remove(token) {
      const removed = await memory.remove(token)
      if (removed) await persist()
      return removed
    },
  }
}

function readPersistedRecords(filePath: string): ShareRecord[] {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown
    if (!Array.isArray(raw)) return []
    return raw.flatMap((row) => {
      const parsed = shareRecordSchema.safeParse(row)
      return parsed.success ? [parsed.data] : []
    })
  } catch {
    return []
  }
}
