import {
  parseFlowchartDocument,
  type FlowchartDocument,
  type FlowchartEdge,
  type FlowchartEdgeType,
  type FlowchartNode,
  type FlowchartNodeType,
} from "../flowchart/schema"

import type { FigurePlan } from "./contracts"
import { layoutFlowchartDocument, positionsNeedRelayout } from "./layout"

const NODE_TYPES = new Set<FlowchartNodeType>([
  "process",
  "decision",
  "terminator",
  "document",
  "group",
  "note",
])

const EDGE_TYPES = new Set<FlowchartEdgeType>([
  "straight",
  "step",
  "smoothstep",
  "bezier",
])

const COLOR =
  /^(#[0-9a-f]{3,8}|(?:rgb|hsl|oklch|oklab|lab|lch)a?\([^)]{1,160}\)|var\(--[a-z0-9-]+\)|transparent)$/i

const defaultNodeStyle: FlowchartNode["style"] = {
  fill: "#ffffff",
  stroke: "#3f3f46",
  textColor: "#18181b",
  fontSize: 14,
  radius: 14,
  strokeWidth: 2,
}

const defaultEdgeStyle: FlowchartEdge["style"] = {
  color: "#52525b",
  width: 2,
  markerEnd: "arrow",
  dashed: false,
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function asOptionalData(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function safeId(value: unknown, fallback: string): string {
  const raw = asString(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return raw || fallback
}

function safeColor(value: unknown, fallback: string): string {
  const color = asString(value, fallback).trim()
  return COLOR.test(color) ? color : fallback
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? text).trim()
  return JSON.parse(candidate) as unknown
}

function unwrapDocument(value: unknown): Record<string, unknown> {
  const record = asRecord(value)
  if (record.kind === "flowchart") return record
  if (record.document) return asRecord(record.document)
  if (record.flowchart) return asRecord(record.flowchart)
  if (record.data) return unwrapDocument(record.data)
  return record
}

function normalizeNode(raw: unknown, index: number, usedIds: Set<string>): FlowchartNode {
  const record = asRecord(raw)
  let id = safeId(record.id, `node-${index + 1}`)
  if (usedIds.has(id)) id = `node-${index + 1}`
  usedIds.add(id)

  const type = NODE_TYPES.has(record.type as FlowchartNodeType)
    ? (record.type as FlowchartNodeType)
    : "process"
  const style = asRecord(record.style)
  const position = asRecord(record.position)
  const size = asRecord(record.size)
  const data = asOptionalData(record.data)

  return {
    id,
    type,
    position: {
      x: asNumber(position.x, 80 + index * 240),
      y: asNumber(position.y, 160),
    },
    size: {
      width: Math.min(2_000, Math.max(48, asNumber(size.width, type === "decision" ? 180 : 180))),
      height: Math.min(2_000, Math.max(32, asNumber(size.height, type === "decision" ? 120 : 84))),
    },
    text: asString(record.text, `Untitled ${type}`).slice(0, 2_000) || `Untitled ${type}`,
    style: {
      fill: safeColor(style.fill, defaultNodeStyle.fill),
      stroke: safeColor(style.stroke, defaultNodeStyle.stroke),
      textColor: safeColor(style.textColor, defaultNodeStyle.textColor),
      fontSize: Math.min(96, Math.max(8, asNumber(style.fontSize, defaultNodeStyle.fontSize))),
      radius: Math.min(
        100,
        Math.max(0, asNumber(style.radius, type === "terminator" ? 42 : type === "decision" ? 0 : 14))
      ),
      strokeWidth: Math.min(20, Math.max(0, asNumber(style.strokeWidth, defaultNodeStyle.strokeWidth))),
    },
    ...(typeof record.parentId === "string" ? { parentId: safeId(record.parentId, "") || undefined } : {}),
    ...(typeof record.locked === "boolean" ? { locked: record.locked } : {}),
    ...(data ? { data } : {}),
  }
}

function normalizeEdge(
  raw: unknown,
  index: number,
  nodeIds: Set<string>,
  usedIds: Set<string>
): FlowchartEdge | null {
  const record = asRecord(raw)
  const sourceNodeId = safeId(record.sourceNodeId ?? record.source, "")
  const targetNodeId = safeId(record.targetNodeId ?? record.target, "")
  if (!sourceNodeId || !targetNodeId) return null
  if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) return null
  if (sourceNodeId === targetNodeId) return null

  let id = safeId(record.id, `edge-${index + 1}`)
  if (usedIds.has(id)) id = `edge-${index + 1}`
  usedIds.add(id)

  const style = asRecord(record.style)
  const type = EDGE_TYPES.has(record.type as FlowchartEdgeType)
    ? (record.type as FlowchartEdgeType)
    : "smoothstep"
  const sourceHandle = asString(record.sourceHandle).trim().slice(0, 80)
  const targetHandle = asString(record.targetHandle).trim().slice(0, 80)

  return {
    id,
    sourceNodeId,
    targetNodeId,
    ...(sourceHandle ? { sourceHandle } : {}),
    ...(targetHandle ? { targetHandle } : {}),
    type,
    ...(asString(record.label).trim()
      ? { label: asString(record.label).trim().slice(0, 500) }
      : {}),
    style: {
      color: safeColor(style.color, defaultEdgeStyle.color),
      width: Math.min(20, Math.max(0.5, asNumber(style.width, defaultEdgeStyle.width))),
      markerEnd: style.markerEnd === "none" ? "none" : "arrow",
      dashed: asBoolean(style.dashed, false),
    },
  }
}

export function parseModelJson(text: string): unknown {
  try {
    return extractJson(text)
  } catch {
    throw new Error("The model did not return valid JSON.")
  }
}

export function normalizeFlowchartDocument(
  input: unknown,
  options: { prompt?: string; plan?: FigurePlan } = {}
): FlowchartDocument {
  const raw = unwrapDocument(input)
  const nodeUsedIds = new Set<string>()
  const nodes = (Array.isArray(raw.nodes) ? raw.nodes : [])
    .slice(0, 250)
    .map((node, index) => normalizeNode(node, index, nodeUsedIds))

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edgeUsedIds = new Set<string>()
  const edges = (Array.isArray(raw.edges) ? raw.edges : [])
    .slice(0, 400)
    .map((edge, index) => normalizeEdge(edge, index, nodeIds, edgeUsedIds))
    .filter((edge): edge is FlowchartEdge => edge !== null)

  const page = asRecord(raw.page)
  const viewport = asRecord(raw.viewport)
  const metadata = asRecord(raw.metadata)
  const title =
    asString(metadata.title, options.plan?.title || options.prompt || "Generated flowchart")
      .slice(0, 300)
      .trim() || "Generated flowchart"

  const draft: FlowchartDocument = {
    kind: "flowchart",
    schemaVersion: 1,
    page: {
      width: Math.min(20_000, Math.max(320, asNumber(page.width, 1_120))),
      height: Math.min(20_000, Math.max(240, asNumber(page.height, 720))),
      background: safeColor(page.background, "#ffffff"),
      padding: Math.min(1_000, Math.max(0, asNumber(page.padding, 64))),
      ...(page.colorMode === "color" || page.colorMode === "grayscale"
        ? { colorMode: page.colorMode }
        : {}),
    },
    viewport: {
      x: asNumber(viewport.x, 0),
      y: asNumber(viewport.y, 0),
      zoom: Math.min(8, Math.max(0.05, asNumber(viewport.zoom, 0.82))),
    },
    nodes,
    edges,
    metadata: {
      title,
      ...(asString(metadata.description, options.plan?.goal).trim()
        ? { description: asString(metadata.description, options.plan?.goal).slice(0, 2_000) }
        : {}),
      sourceAssetIds: Array.isArray(metadata.sourceAssetIds)
        ? metadata.sourceAssetIds.filter((id): id is string => typeof id === "string").slice(0, 100)
        : [],
    },
  }

  const direction = options.plan?.structure.primaryDirection ?? "left-right"
  const laidOut = positionsNeedRelayout(draft.nodes)
    ? layoutFlowchartDocument(draft, direction)
    : draft

  return parseFlowchartDocument(laidOut)
}

export function formatValidationIssues(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues
    return issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`)
      .join("; ")
  }
  if (error instanceof Error) return error.message
  return "The generated flowchart could not be validated."
}
