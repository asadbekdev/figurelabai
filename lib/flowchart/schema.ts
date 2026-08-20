import { z } from "zod"

const MAX_NODES = 250
const MAX_EDGES = 400
const MAX_DOCUMENT_BYTES = 500_000
const colorPattern =
  /^(#[0-9a-f]{3,8}|(?:rgb|hsl|oklch|oklab|lab|lch)a?\([^)]{1,160}\)|var\(--[a-z0-9-]+\)|transparent)$/i

const finiteNumber = z.number().finite()
const color = z.string().max(180).regex(colorPattern, "Invalid CSS color")

export const flowchartNodeTypeSchema = z.enum([
  "process",
  "decision",
  "terminator",
  "document",
  "group",
  "note",
])

export const flowchartEdgeTypeSchema = z.enum([
  "straight",
  "step",
  "smoothstep",
  "bezier",
])

export const flowchartNodeSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: flowchartNodeTypeSchema,
    position: z.object({ x: finiteNumber, y: finiteNumber }).strict(),
    size: z
      .object({
        width: finiteNumber.min(48).max(2_000),
        height: finiteNumber.min(32).max(2_000),
      })
      .strict(),
    text: z.string().max(2_000),
    style: z
      .object({
        fill: color,
        stroke: color,
        textColor: color,
        fontSize: finiteNumber.min(8).max(96),
        radius: finiteNumber.min(0).max(100),
        strokeWidth: finiteNumber.min(0).max(20),
      })
      .strict(),
    parentId: z.string().min(1).max(80).optional(),
    locked: z.boolean().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const flowchartEdgeSchema = z
  .object({
    id: z.string().min(1).max(80),
    sourceNodeId: z.string().min(1).max(80),
    targetNodeId: z.string().min(1).max(80),
    sourceHandle: z.string().max(80).optional(),
    targetHandle: z.string().max(80).optional(),
    type: flowchartEdgeTypeSchema,
    label: z.string().max(500).optional(),
    style: z
      .object({
        color,
        width: finiteNumber.min(0.5).max(20),
        markerEnd: z.enum(["none", "arrow"]),
        dashed: z.boolean(),
      })
      .strict(),
  })
  .strict()

export const flowchartDocumentSchema = z
  .object({
    kind: z.literal("flowchart"),
    schemaVersion: z.literal(1),
    page: z
      .object({
        width: finiteNumber.min(320).max(20_000),
        height: finiteNumber.min(240).max(20_000),
        background: color,
        padding: finiteNumber.min(0).max(1_000),
      })
      .strict(),
    viewport: z
      .object({
        x: finiteNumber,
        y: finiteNumber,
        zoom: finiteNumber.min(0.05).max(8),
      })
      .strict(),
    nodes: z.array(flowchartNodeSchema).max(MAX_NODES),
    edges: z.array(flowchartEdgeSchema).max(MAX_EDGES),
    metadata: z
      .object({
        title: z.string().min(1).max(300),
        description: z.string().max(2_000).optional(),
        sourceAssetIds: z.array(z.string().min(1).max(120)).max(100),
      })
      .strict(),
  })
  .strict()
  .superRefine((document, context) => {
    const nodeIds = new Set<string>()
    const edgeIds = new Set<string>()

    document.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate node id: ${node.id}`,
          path: ["nodes", index, "id"],
        })
      }
      nodeIds.add(node.id)
    })

    document.edges.forEach((edge, index) => {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate edge id: ${edge.id}`,
          path: ["edges", index, "id"],
        })
      }
      edgeIds.add(edge.id)

      if (!nodeIds.has(edge.sourceNodeId)) {
        context.addIssue({
          code: "custom",
          message: `Dangling source node: ${edge.sourceNodeId}`,
          path: ["edges", index, "sourceNodeId"],
        })
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        context.addIssue({
          code: "custom",
          message: `Dangling target node: ${edge.targetNodeId}`,
          path: ["edges", index, "targetNodeId"],
        })
      }
    })

    document.nodes.forEach((node, index) => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        context.addIssue({
          code: "custom",
          message: `Missing parent node: ${node.parentId}`,
          path: ["nodes", index, "parentId"],
        })
      }
    })
  })

export type FlowchartDocument = z.infer<typeof flowchartDocumentSchema>
export type FlowchartNode = z.infer<typeof flowchartNodeSchema>
export type FlowchartEdge = z.infer<typeof flowchartEdgeSchema>
export type FlowchartNodeType = z.infer<typeof flowchartNodeTypeSchema>
export type FlowchartEdgeType = z.infer<typeof flowchartEdgeTypeSchema>

export function parseFlowchartDocument(input: unknown): FlowchartDocument {
  const serialized = JSON.stringify(input)
  if (serialized.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`Flowchart document exceeds ${MAX_DOCUMENT_BYTES} bytes`)
  }
  return flowchartDocumentSchema.parse(input)
}

export function cloneFlowchartDocument(document: FlowchartDocument): FlowchartDocument {
  return parseFlowchartDocument(JSON.parse(JSON.stringify(document)))
}
