import type {
  FlowchartDocument,
  FlowchartEdge,
  FlowchartNode,
} from "./schema"

export type ReadinessSeverity = "error" | "warning"

export type ReadinessIssueCode =
  | "empty-label"
  | "dangling-edge"
  | "unreachable-node"
  | "overlapping-nodes"
  | "outside-page"
  | "text-too-small"
  | "low-contrast"
  | "contrast-unverified"
  | "label-overflow"
  | "invalid-page"

export type ReadinessIssue = {
  id: string
  code: ReadinessIssueCode
  severity: ReadinessSeverity
  title: string
  description: string
  nodeIds: string[]
  edgeIds: string[]
}

export type ReadinessReport = {
  ready: boolean
  errors: number
  warnings: number
  issues: ReadinessIssue[]
}

type Rgb = { red: number; green: number; blue: number }

const MIN_FONT_SIZE = 11
const MIN_NORMAL_TEXT_CONTRAST = 4.5
const MIN_LARGE_TEXT_CONTRAST = 3
const OVERLAP_TOLERANCE = 4

function issue(
  code: ReadinessIssueCode,
  severity: ReadinessSeverity,
  title: string,
  description: string,
  nodeIds: string[] = [],
  edgeIds: string[] = []
): ReadinessIssue {
  return {
    id: [code, ...nodeIds, ...edgeIds].join(":"),
    code,
    severity,
    title,
    description,
    nodeIds,
    edgeIds,
  }
}

function parseHexColor(value: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim())
  if (!match) return null

  const hex = match[1]
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex.slice(0, 6)

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function luminance(color: Rgb): number {
  const channels = [color.red, color.green, color.blue].map((value) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const light = Math.max(luminance(foreground), luminance(background))
  const dark = Math.min(luminance(foreground), luminance(background))
  return (light + 0.05) / (dark + 0.05)
}

function nodesOverlap(first: FlowchartNode, second: FlowchartNode): boolean {
  const overlapWidth =
    Math.min(first.position.x + first.size.width, second.position.x + second.size.width) -
    Math.max(first.position.x, second.position.x)
  const overlapHeight =
    Math.min(first.position.y + first.size.height, second.position.y + second.size.height) -
    Math.max(first.position.y, second.position.y)

  return overlapWidth > OVERLAP_TOLERANCE && overlapHeight > OVERLAP_TOLERANCE
}

function findPrimaryNode(nodes: FlowchartNode[], edges: FlowchartEdge[]): FlowchartNode | undefined {
  const incoming = new Set(edges.map((edge) => edge.targetNodeId))
  const roots = nodes.filter((node) => !incoming.has(node.id))
  const candidates = roots.length > 0 ? roots : nodes

  return [...candidates].sort(
    (first, second) =>
      first.position.y - second.position.y || first.position.x - second.position.x
  )[0]
}

function findReachableNodeIds(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[]
): Set<string> {
  const primary = findPrimaryNode(nodes, edges)
  if (!primary) return new Set()

  const outgoing = new Map<string, string[]>()
  edges.forEach((edge) => {
    const targets = outgoing.get(edge.sourceNodeId) ?? []
    targets.push(edge.targetNodeId)
    outgoing.set(edge.sourceNodeId, targets)
  })

  const reachable = new Set<string>()
  const queue = [primary.id]

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId || reachable.has(nodeId)) continue
    reachable.add(nodeId)
    queue.push(...(outgoing.get(nodeId) ?? []))
  }

  return reachable
}

function estimatedLabelHeight(node: FlowchartNode): number {
  const horizontalPadding = node.type === "decision" ? 64 : 32
  const usableWidth = Math.max(24, node.size.width - horizontalPadding)
  const averageCharacterWidth = node.style.fontSize * 0.55
  const charactersPerLine = Math.max(1, Math.floor(usableWidth / averageCharacterWidth))
  const words = node.text.trim().split(/\s+/)
  let lines = 1
  let lineLength = 0

  words.forEach((word) => {
    const nextLength = lineLength === 0 ? word.length : lineLength + 1 + word.length
    if (nextLength > charactersPerLine) {
      lines += 1
      lineLength = word.length
    } else {
      lineLength = nextLength
    }
  })

  return lines * node.style.fontSize * 1.25
}

export function runFlowchartReadiness(
  document: FlowchartDocument
): ReadinessReport {
  const issues: ReadinessIssue[] = []
  const nodeIds = new Set(document.nodes.map((node) => node.id))

  if (
    document.page.width <= document.page.padding * 2 ||
    document.page.height <= document.page.padding * 2
  ) {
    issues.push(
      issue(
        "invalid-page",
        "error",
        "Page padding leaves no usable area",
        "Reduce the page padding or increase the export dimensions."
      )
    )
  }

  document.nodes.forEach((node) => {
    if (node.text.trim().length === 0) {
      issues.push(
        issue(
          "empty-label",
          "error",
          "Node label is empty",
          "Add a meaningful label before export.",
          [node.id]
        )
      )
    }

    const outsidePage =
      node.position.x < document.page.padding ||
      node.position.y < document.page.padding ||
      node.position.x + node.size.width >
        document.page.width - document.page.padding ||
      node.position.y + node.size.height >
        document.page.height - document.page.padding

    if (outsidePage) {
      issues.push(
        issue(
          "outside-page",
          "error",
          "Node is outside the page bounds",
          "Move the node inside the padded export area.",
          [node.id]
        )
      )
    }

    if (node.style.fontSize < MIN_FONT_SIZE) {
      issues.push(
        issue(
          "text-too-small",
          "error",
          "Text is too small for publication",
          `Increase the node text to at least ${MIN_FONT_SIZE} px.`,
          [node.id]
        )
      )
    }

    if (estimatedLabelHeight(node) > node.size.height - 24) {
      issues.push(
        issue(
          "label-overflow",
          "warning",
          "Label may not fit the node",
          "Shorten the label, reduce the text size, or enlarge the node.",
          [node.id]
        )
      )
    }

    const textColor = parseHexColor(node.style.textColor)
    const fillColor = parseHexColor(node.style.fill)

    if (textColor && fillColor) {
      const requiredContrast =
        node.style.fontSize >= 18
          ? MIN_LARGE_TEXT_CONTRAST
          : MIN_NORMAL_TEXT_CONTRAST
      const ratio = contrastRatio(textColor, fillColor)
      if (ratio < requiredContrast) {
        issues.push(
          issue(
            "low-contrast",
            "error",
            "Text contrast is too low",
            `The text-to-fill contrast is ${ratio.toFixed(
              1
            )}:1; this text size needs at least ${requiredContrast}:1.`,
            [node.id]
          )
        )
      }
    } else {
      issues.push(
        issue(
          "contrast-unverified",
          "warning",
          "Contrast could not be verified",
          "Use explicit export colors to run a deterministic contrast check.",
          [node.id]
        )
      )
    }
  })

  document.edges.forEach((edge) => {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
      issues.push(
        issue(
          "dangling-edge",
          "error",
          "Connection has a missing endpoint",
          "Reconnect or remove this connection before export.",
          [],
          [edge.id]
        )
      )
    }
  })

  for (let firstIndex = 0; firstIndex < document.nodes.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < document.nodes.length;
      secondIndex += 1
    ) {
      const first = document.nodes[firstIndex]
      const second = document.nodes[secondIndex]
      if (nodesOverlap(first, second)) {
        issues.push(
          issue(
            "overlapping-nodes",
            "error",
            "Nodes overlap",
            "Separate the nodes so labels and connection points remain clear.",
            [first.id, second.id]
          )
        )
      }
    }
  }

  const reachableNodeIds = findReachableNodeIds(document.nodes, document.edges)
  document.nodes.forEach((node) => {
    if (!reachableNodeIds.has(node.id)) {
      issues.push(
        issue(
          "unreachable-node",
          "warning",
          "Node is disconnected from the primary flow",
          "Connect this node or confirm that it is an intentional island.",
          [node.id]
        )
      )
    }
  })

  const errors = issues.filter((item) => item.severity === "error").length
  const warnings = issues.filter((item) => item.severity === "warning").length

  return {
    ready: errors === 0,
    errors,
    warnings,
    issues,
  }
}
