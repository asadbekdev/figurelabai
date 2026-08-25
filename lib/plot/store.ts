"use client"

import { create } from "zustand"

import { parsePlotDocument, type PlotDocument } from "./schema"

type PlotEditorState = {
  document: PlotDocument | null
  changeSerial: number
  loadDocument: (document: PlotDocument) => void
  updateDocument: (updater: (document: PlotDocument) => PlotDocument) => void
  reset: () => void
}

export const usePlotEditorStore = create<PlotEditorState>((set, get) => ({
  document: null,
  changeSerial: 0,
  loadDocument: (document) => set({ document: parsePlotDocument(document), changeSerial: 0 }),
  updateDocument: (updater) => {
    const current = get().document
    if (!current) return
    const next = parsePlotDocument(updater(structuredClone(current)))
    set({
      document: next,
      changeSerial: get().changeSerial + 1,
    })
  },
  reset: () => set({ document: null, changeSerial: 0 }),
}))
