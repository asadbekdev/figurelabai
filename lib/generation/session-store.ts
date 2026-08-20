"use client"

import { create } from "zustand"

import type { FigurePlan } from "./contracts"

export type SessionChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type SessionGeneratedImage = {
  id: string
  prompt: string
  mimeType: string
  dataUrl: string
  createdAt: string
}

type GenerationSessionState = {
  chatMessages: SessionChatMessage[]
  images: SessionGeneratedImage[]
  lastPlan: FigurePlan | null
  appendChat: (message: SessionChatMessage) => void
  addImage: (image: Omit<SessionGeneratedImage, "id" | "createdAt">) => SessionGeneratedImage
  setLastPlan: (plan: FigurePlan | null) => void
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useGenerationSessionStore = create<GenerationSessionState>((set) => ({
  chatMessages: [],
  images: [],
  lastPlan: null,
  appendChat: (message) => {
    set((state) => ({ chatMessages: [...state.chatMessages, message].slice(-40) }))
  },
  addImage: (image) => {
    const next: SessionGeneratedImage = {
      ...image,
      id: nextId("image"),
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ images: [next, ...state.images].slice(0, 12) }))
    return next
  },
  setLastPlan: (plan) => set({ lastPlan: plan }),
}))
