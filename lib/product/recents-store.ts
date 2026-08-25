"use client"

import { create } from "zustand"

type RecentsState = {
  newFigureKey: number
  startNewFigure: () => void
}

export const useRecentsStore = create<RecentsState>((set) => ({
  newFigureKey: 0,
  startNewFigure: () => {
    set((state) => ({ newFigureKey: state.newFigureKey + 1 }))
  },
}))
