"use client"

import { create } from "zustand"

import type { VectorObject } from "@/lib/vector-canvas/schema"

import {
  createIllustrationOverlay,
  readIllustrationOverlay,
  writeIllustrationOverlay,
  type IllustrationComment,
  type IllustrationOverlay,
} from "./overlay"

const HISTORY_LIMIT = 60

type IllustrationSnapshot = {
  objects: VectorObject[]
  comments: IllustrationComment[]
}

type IllustrationCanvasState = {
  projectId: string | null
  assetId: string | null
  page: { width: number; height: number }
  objects: VectorObject[]
  comments: IllustrationComment[]
  past: IllustrationSnapshot[]
  future: IllustrationSnapshot[]
  announcement: string
  changeSerial: number
  hydrate: (input: {
    projectId: string
    assetId: string
    width: number
    height: number
    objects?: VectorObject[]
    comments?: IllustrationComment[]
  }) => void
  commit: (next: Partial<IllustrationSnapshot>, announcement: string) => void
  undo: () => void
  redo: () => void
  snapshot: () => IllustrationOverlay | null
}

function persist(state: IllustrationCanvasState) {
  if (!state.projectId || !state.assetId) return
  try {
    writeIllustrationOverlay(
      createIllustrationOverlay({
        projectId: state.projectId,
        assetId: state.assetId,
        width: state.page.width,
        height: state.page.height,
        objects: state.objects,
        comments: state.comments,
      })
    )
  } catch {
    // Quota or private-mode storage can fail; the in-memory overlay still works.
  }
}

function currentSnapshot(state: IllustrationCanvasState): IllustrationSnapshot {
  return { objects: state.objects, comments: state.comments }
}

export const useIllustrationCanvasStore = create<IllustrationCanvasState>((set, get) => ({
  projectId: null,
  assetId: null,
  page: { width: 1280, height: 720 },
  objects: [],
  comments: [],
  past: [],
  future: [],
  announcement: "Illustration canvas ready",
  changeSerial: 0,

  hydrate: ({ projectId, assetId, width, height, objects: incomingObjects, comments: incomingComments }) => {
    const page = {
      width: Math.max(8, Math.min(8_000, width)),
      height: Math.max(8, Math.min(8_000, height)),
    }
    const state = get()
    if (state.projectId === projectId && incomingObjects === undefined) {
      set({
        assetId,
        page,
      })
      return
    }
    const stored = readIllustrationOverlay(projectId)
    const objects = incomingObjects ?? stored?.objects ?? []
    const comments = incomingComments ?? stored?.comments ?? []
    set({
      projectId,
      assetId,
      page,
      objects,
      comments,
      past: [],
      future: [],
      announcement:
        objects.length > 0 || comments.length > 0
          ? "Restored canvas marks"
          : "Illustration canvas ready",
    })
  },

  commit: (next, announcement) => {
    const state = get()
    const updated = {
      ...state,
      objects: next.objects ?? state.objects,
      comments: next.comments ?? state.comments,
      past: [...state.past, currentSnapshot(state)].slice(-HISTORY_LIMIT),
      future: [],
      announcement,
      changeSerial: state.changeSerial + 1,
    }
    set(updated)
    persist(updated)
  },

  undo: () => {
    const state = get()
    const previous = state.past.at(-1)
    if (!previous) return
    const updated = {
      ...state,
      objects: previous.objects,
      comments: previous.comments,
      past: state.past.slice(0, -1),
      future: [...state.future, currentSnapshot(state)],
      announcement: "Undid canvas edit",
    }
    set(updated)
    persist(updated)
  },

  redo: () => {
    const state = get()
    const upcoming = state.future.at(-1)
    if (!upcoming) return
    const updated = {
      ...state,
      objects: upcoming.objects,
      comments: upcoming.comments,
      past: [...state.past, currentSnapshot(state)],
      future: state.future.slice(0, -1),
      announcement: "Redid canvas edit",
    }
    set(updated)
    persist(updated)
  },

  snapshot: () => {
    const state = get()
    if (!state.projectId || !state.assetId) return null
    return createIllustrationOverlay({
      projectId: state.projectId,
      assetId: state.assetId,
      width: state.page.width,
      height: state.page.height,
      objects: state.objects,
      comments: state.comments,
    })
  },
}))
