"use client"

import { create } from "zustand"

import type { IllustrationDocument } from "@/lib/illustration/schema"
import type { PlotDocument } from "@/lib/plot/schema"

import type {
  DocumentConflict,
  DocumentSummary,
  FigureMode,
  ProjectThread,
  ProjectVersionRecord,
  WorkspaceAsset,
  WorkspaceDocument,
} from "./workspace-types"

export type ProjectSaveState = "loading" | "ready" | "dirty" | "saving" | "saved" | "offline" | "conflict"

export type RecoveryOffer = {
  kind: "unsaved" | "conflict"
  conflict?: DocumentConflict
  storedSummary?: DocumentSummary
  localSummary?: DocumentSummary
}

type ProjectSessionState = {
  projectId: string | null
  title: string
  mode: FigureMode
  revision: number
  documentId: string | null
  saveState: ProjectSaveState
  lastSavedAt: string | null
  versions: ProjectVersionRecord[]
  missing: boolean
  loadError: string | null
  recovery: RecoveryOffer | null
  thread: ProjectThread | null
  asset: WorkspaceAsset | null
  plotDocument: PlotDocument | null
  illustrationDocument: IllustrationDocument | null
  setSession: (patch: Partial<Omit<ProjectSessionState, "setSession" | "reset">>) => void
  reset: () => void
}

const emptySession = {
  projectId: null,
  title: "",
  mode: "flowchart" as const,
  revision: 0,
  documentId: null,
  saveState: "loading" as const,
  lastSavedAt: null,
  versions: [],
  missing: false,
  loadError: null,
  recovery: null,
  thread: null,
  asset: null,
  plotDocument: null,
  illustrationDocument: null,
}

export const useProjectSessionStore = create<ProjectSessionState>((set) => ({
  ...emptySession,
  setSession: (patch) => set(patch),
  reset: () => set(emptySession),
}))

export function summarizeForCompare(
  document: WorkspaceDocument,
  revision: number,
  checksum: string
): DocumentSummary {
  return {
    title: document.metadata.title,
    revision,
    nodeCount:
      document.kind === "flowchart"
        ? document.nodes.length
        : document.kind === "plot"
          ? document.rows.length
          : document.objects.length,
    edgeCount:
      document.kind === "flowchart"
        ? document.edges.length
        : document.kind === "plot"
          ? document.seriesColumnIndices.length
          : document.comments.length,
    checksum,
  }
}
