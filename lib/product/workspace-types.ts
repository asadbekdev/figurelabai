import { z } from "zod"

import {
  flowchartDocumentSchema,
  type FlowchartDocument,
} from "@/lib/flowchart/schema"
import { figurePlanSchema } from "@/lib/generation/contracts"
import { illustrationDocumentSchema } from "@/lib/illustration/schema"
import { plotDocumentSchema } from "@/lib/plot/schema"

export const workspaceDocumentSchema = z.discriminatedUnion("kind", [
  flowchartDocumentSchema,
  plotDocumentSchema,
  illustrationDocumentSchema,
])

export type WorkspaceDocument = z.infer<typeof workspaceDocumentSchema>

export function parseWorkspaceDocument(input: unknown): WorkspaceDocument {
  return workspaceDocumentSchema.parse(input)
}

export const figureModeSchema = z.enum(["flowchart", "plot", "illustration"])
export const projectStatusSchema = z.enum([
  "draft",
  "generating",
  "ready",
  "failed",
  "archived",
])
export const documentSourceSchema = z.enum([
  "autosave",
  "generation",
  "manual_version",
  "restore",
  "migration",
])
export const assetKindSchema = z.enum([
  "upload",
  "thumbnail",
  "reference",
  "export",
  "generated_asset",
])

export const PROJECT_ID_PATTERN =
  /^(demo|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export const projectRecordSchema = z
  .object({
    id: z.string().regex(PROJECT_ID_PATTERN),
    title: z.string().min(1).max(300),
    mode: figureModeSchema,
    status: projectStatusSchema,
    currentDocumentId: z.string().min(1).nullable(),
    currentAssetId: z.string().min(1).nullable().optional(),
    lastOpenedAt: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict()

export const persistedDocumentSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().regex(PROJECT_ID_PATTERN),
    schemaVersion: z.literal(1),
    revision: z.number().int().min(1),
    content: workspaceDocumentSchema,
    source: documentSourceSchema,
    parentDocumentId: z.string().min(1).nullable(),
    checksum: z.string().min(1),
    createdAt: z.string().min(1),
  })
  .strict()

export const projectVersionSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().regex(PROJECT_ID_PATTERN),
    documentId: z.string().min(1),
    name: z.string().min(1).max(120),
    description: z.string().max(400).optional(),
    createdAt: z.string().min(1),
  })
  .strict()

export const workspaceAssetSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().regex(PROJECT_ID_PATTERN).nullable(),
    kind: assetKindSchema,
    mimeType: z.string().min(1).max(120),
    dataUrl: z.string().min(1),
    prompt: z.string().max(4_000).optional(),
    folderId: z.string().min(1).nullable().default(null),
    favorite: z.boolean().default(false),
    createdAt: z.string().min(1),
  })
  .strict()

export const libraryFolderSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(80),
    createdAt: z.string().min(1),
  })
  .strict()

export const recoverySnapshotSchema = z
  .object({
    projectId: z.string().regex(PROJECT_ID_PATTERN),
    baseRevision: z.number().int().min(0),
    document: flowchartDocumentSchema,
    updatedAt: z.string().min(1),
  })
  .strict()

export const projectMessageSchema = z
  .object({
    id: z.string().min(1),
    authorType: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(16_000),
    createdAt: z.string().min(1),
  })
  .strict()

export const projectThreadSchema = z
  .object({
    projectId: z.string().regex(PROJECT_ID_PATTERN),
    prompt: z.string().max(16_000),
    plan: figurePlanSchema.nullable(),
    messages: z.array(projectMessageSchema).max(200),
    updatedAt: z.string().min(1),
  })
  .strict()

export type FigureMode = z.infer<typeof figureModeSchema>
export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type DocumentSource = z.infer<typeof documentSourceSchema>
export type ProjectRecord = z.infer<typeof projectRecordSchema>
export type PersistedDocument = z.infer<typeof persistedDocumentSchema>
export type ProjectVersionRecord = z.infer<typeof projectVersionSchema>
export type WorkspaceAsset = z.infer<typeof workspaceAssetSchema>
export type LibraryFolder = z.infer<typeof libraryFolderSchema>
export type RecoverySnapshot = z.infer<typeof recoverySnapshotSchema>
export type ProjectMessage = z.infer<typeof projectMessageSchema>
export type ProjectThread = z.infer<typeof projectThreadSchema>

export type DocumentSummary = {
  title: string
  revision: number
  nodeCount: number
  edgeCount: number
  checksum: string
}

export type DocumentConflict = {
  code: "DOCUMENT_CONFLICT"
  stored: PersistedDocument
  local: WorkspaceDocument
  localBaseRevision: number
}

export type SaveDocumentSuccess = {
  ok: true
  revision: number
  documentId: string
  checksum: string
  savedAt: string
}

export type SaveDocumentResult =
  | SaveDocumentSuccess
  | { ok: false; conflict: DocumentConflict }

export type OpenedProject = {
  project: ProjectRecord
  document: PersistedDocument | null
  versions: ProjectVersionRecord[]
  recovery: RecoverySnapshot | null
  thread: ProjectThread | null
  asset: WorkspaceAsset | null
}

export function isProjectId(value: string): boolean {
  return PROJECT_ID_PATTERN.test(value)
}

export function summarizeDocument(
  document: FlowchartDocument,
  revision: number,
  checksum: string
): DocumentSummary {
  return {
    title: document.metadata.title,
    revision,
    nodeCount: document.nodes.length,
    edgeCount: document.edges.length,
    checksum,
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function createEntityId(): string {
  return crypto.randomUUID()
}
