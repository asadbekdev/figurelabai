"use client"

import { create } from "zustand"

import { vectorDocumentFromSvg } from "./from-svg"
import { nowIso, parseVectorDocument, type VectorDocument, type VectorObject } from "./schema"
import {
  createIndexedDbVectorStorage,
  createMemoryVectorStorage,
  type VectorCanvasStorage,
} from "./storage"

type VectorCanvasState = {
  hydrated: boolean
  documents: VectorDocument[]
  hydrate: () => Promise<void>
  refresh: () => Promise<void>
  createFromSvg: (input: { svg: string; title: string }) => Promise<VectorDocument>
  save: (document: VectorDocument) => Promise<VectorDocument>
  update: (
    id: string,
    updater: (document: VectorDocument) => VectorDocument
  ) => Promise<VectorDocument | null>
  addObject: (id: string, object: VectorObject) => Promise<VectorDocument | null>
  removeObject: (id: string, objectId: string) => Promise<VectorDocument | null>
  rename: (id: string, title: string) => Promise<void>
  remove: (id: string) => Promise<void>
  get: (id: string) => VectorDocument | undefined
}

let storagePromise: Promise<VectorCanvasStorage> | null = null

async function getStorage(): Promise<VectorCanvasStorage> {
  if (!storagePromise) {
    storagePromise =
      typeof indexedDB === "undefined"
        ? Promise.resolve(createMemoryVectorStorage())
        : createIndexedDbVectorStorage().catch(() => createMemoryVectorStorage())
  }
  return storagePromise
}

let hydratePromise: Promise<void> | null = null

export const useVectorCanvasStore = create<VectorCanvasState>((set, get) => ({
  hydrated: false,
  documents: [],

  hydrate: async () => {
    if (get().hydrated) return
    if (!hydratePromise) {
      hydratePromise = (async () => {
        const storage = await getStorage()
        set({ hydrated: true, documents: await storage.list() })
      })().finally(() => {
        hydratePromise = null
      })
    }
    await hydratePromise
  },

  refresh: async () => {
    const storage = await getStorage()
    set({ documents: await storage.list() })
  },

  createFromSvg: async ({ svg, title }) => {
    const storage = await getStorage()
    const document = await storage.put(vectorDocumentFromSvg({ svg, title }))
    await get().refresh()
    return document
  },

  save: async (document) => {
    const storage = await getStorage()
    const next = await storage.put(
      parseVectorDocument({ ...document, updatedAt: nowIso() })
    )
    await get().refresh()
    return next
  },

  update: async (id, updater) => {
    const storage = await getStorage()
    const current = await storage.get(id)
    if (!current) return null
    const next = await storage.put(
      parseVectorDocument({ ...updater(current), updatedAt: nowIso() })
    )
    await get().refresh()
    return next
  },

  addObject: async (id, object) => {
    return get().update(id, (document) => ({
      ...document,
      objects: [...document.objects, object],
    }))
  },

  removeObject: async (id, objectId) => {
    return get().update(id, (document) => ({
      ...document,
      objects: document.objects.filter((item) => item.id !== objectId),
    }))
  },

  rename: async (id, title) => {
    const next = title.trim().slice(0, 300)
    if (!next) return
    await get().update(id, (document) => ({ ...document, title: next }))
  },

  remove: async (id) => {
    const storage = await getStorage()
    await storage.remove(id)
    await get().refresh()
  },

  get: (id) => get().documents.find((document) => document.id === id),
}))
