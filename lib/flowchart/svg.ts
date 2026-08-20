import type {
  FlowchartDocument,
  FlowchartEdge,
  FlowchartNode,
} from "./schema"

export type FlowchartSvgOptions = {
  background: "document" | "transparent"
  resolveColor?: (color: string) => string
}

type Point = { x: number; y: number }

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function number(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function resolveColor(
  value: string,
  resolver: FlowchartSvgOptions["resolveColor"]
): string {
  return resolver ? resolver(value) : value
}

function nodeCenter(node: FlowchartNode): Point {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  }
}

function connectionPoints(source: FlowchartNode, target: FlowchartNode): {
  source: Point
  target: Point
} {
  const sourceCenter = nodeCenter(source)
  const targetCenter = nodeCenter(target)
  const deltaX = targetCenter.x - sourceCenter.x
  const deltaY = targetCenter.y - sourceCenter.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      source: {
        x:
          sourceCenter.x +
          (deltaX >= 0 ? source.size.width / 2 : -source.size.width / 2),
        y: sourceCenter.y,
      },
      target: {
        x:
          targetCenter.x +
          (deltaX >= 0 ? -target.size.width / 2 : target.size.width / 2),
        y: targetCenter.y,
      },
    }
  }

  return {
    source: {
      x: sourceCenter.x,
      y:
        sourceCenter.y +
        (deltaY >= 0 ? source.size.height / 2 : -source.size.height / 2),
    },
    target: {
      x: targetCenter.x,
      y:
        targetCenter.y +
        (deltaY >= 0 ? -target.size.height / 2 : target.size.height / 2),
    },
  }
}

function edgePath(edge: FlowchartEdge, source: Point, target: Point): string {
  if (edge.type === "straight") {
    return `M ${number(source.x)} ${number(source.y)} L ${number(target.x)} ${number(
      target.y
    )}`
  }

  if (edge.type === "step") {
    const middleX = (source.x + target.x) / 2
    return `M ${number(source.x)} ${number(source.y)} H ${number(
      middleX
    )} V ${number(target.y)} H ${number(target.x)}`
  }

  if (edge.type === "bezier") {
    const distance = Math.max(48, Math.abs(target.x - source.x) * 0.45)
    const direction = target.x >= source.x ? 1 : -1
    return `M ${number(source.x)} ${number(source.y)} C ${number(
      source.x + distance * direction
    )} ${number(source.y)}, ${number(target.x - distance * direction)} ${number(
      target.y
    )}, ${number(target.x)} ${number(target.y)}`
  }

  const middleX = (source.x + target.x) / 2
  const radius = Math.min(
    24,
    Math.max(8, Math.abs(target.x - source.x) / 6),
    Math.max(8, Math.abs(target.y - source.y) / 6)
  )
  const verticalDirection = target.y >= source.y ? 1 : -1
  const horizontalDirection = target.x >= source.x ? 1 : -1
  const firstTurnX = middleX - radius * horizontalDirection
  const secondTurnX = middleX + radius * horizontalDirection
  const firstTurnY = source.y + radius * verticalDirection
  const secondTurnY = target.y - radius * verticalDirection

  if (Math.abs(target.y - source.y) < radius * 2) {
    return `M ${number(source.x)} ${number(source.y)} C ${number(middleX)} ${number(
      source.y
    )}, ${number(middleX)} ${number(target.y)}, ${number(target.x)} ${number(
      target.y
    )}`
  }

  return [
    `M ${number(source.x)} ${number(source.y)}`,
    `H ${number(firstTurnX)}`,
    `Q ${number(middleX)} ${number(source.y)} ${number(middleX)} ${number(
      firstTurnY
    )}`,
    `V ${number(secondTurnY)}`,
    `Q ${number(middleX)} ${number(target.y)} ${number(secondTurnX)} ${number(
      target.y
    )}`,
    `H ${number(target.x)}`,
  ].join(" ")
}

function wrapLabel(node: FlowchartNode): string[] {
  const horizontalPadding = node.type === "decision" ? 64 : 32
  const usableWidth = Math.max(24, node.size.width - horizontalPadding)
  const maxCharacters = Math.max(
    1,
    Math.floor(usableWidth / (node.style.fontSize * 0.55))
  )
  const words = node.text.trim().split(/\s+/)
  const lines: string[] = []
  let current = ""

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxCharacters && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  })

  if (current) lines.push(current)
  return lines.length > 0 ? lines : [""]
}

function renderNodeShape(
  node: FlowchartNode,
  options: FlowchartSvgOptions
): string {
  const x = node.position.x
  const y = node.position.y
  const width = node.size.width
  const height = node.size.height
  const fill = escapeXml(resolveColor(node.style.fill, options.resolveColor))
  const stroke = escapeXml(resolveColor(node.style.stroke, options.resolveColor))
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${number(
    node.style.strokeWidth
  )}"`

  if (node.type === "decision") {
    return `<polygon points="${number(x + width / 2)},${number(y)} ${number(
      x + width
    )},${number(y + height / 2)} ${number(x + width / 2)},${number(
      y + height
    )} ${number(x)},${number(y + height / 2)}" ${common} />`
  }

  if (node.type === "document") {
    const wave = Math.min(12, height / 6)
    return `<path d="M ${number(x)} ${number(y)} H ${number(
      x + width
    )} V ${number(y + height - wave)} Q ${number(x + width * 0.75)} ${number(
      y + height - wave * 2
    )} ${number(x + width / 2)} ${number(
      y + height - wave
    )} Q ${number(x + width * 0.25)} ${number(y + height)} ${number(x)} ${number(
      y + height - wave
    )} Z" ${common} />`
  }

  if (node.type === "note") {
    const fold = Math.min(18, width / 5, height / 4)
    return `<path d="M ${number(x)} ${number(y)} H ${number(
      x + width - fold
    )} L ${number(x + width)} ${number(y + fold)} V ${number(
      y + height
    )} H ${number(x)} Z M ${number(x + width - fold)} ${number(y)} V ${number(
      y + fold
    )} H ${number(x + width)}" ${common} stroke-linejoin="round" />`
  }

  return `<rect x="${number(x)}" y="${number(y)}" width="${number(
    width
  )}" height="${number(height)}" rx="${number(
    node.type === "terminator" ? height / 2 : node.style.radius
  )}" ${common}${
    node.type === "group" ? ' stroke-dasharray="8 6"' : ""
  } />`
}

function renderNode(node: FlowchartNode, options: FlowchartSvgOptions): string {
  const lines = wrapLabel(node)
  const lineHeight = node.style.fontSize * 1.25
  const firstBaseline =
    node.position.y +
    node.size.height / 2 -
    ((lines.length - 1) * lineHeight) / 2 +
    node.style.fontSize * 0.35
  const textColor = escapeXml(
    resolveColor(node.style.textColor, options.resolveColor)
  )

  const text = lines
    .map(
      (line, index) =>
        `<tspan x="${number(
          node.position.x + node.size.width / 2
        )}" y="${number(firstBaseline + index * lineHeight)}">${escapeXml(line)}</tspan>`
    )
    .join("")

  return `<g id="node-${safeId(node.id)}" data-object-id="${escapeXml(
    node.id
  )}" data-object-kind="node">${renderNodeShape(
    node,
    options
  )}<text text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif" font-size="${number(
    node.style.fontSize
  )}" font-weight="500" fill="${textColor}">${text}</text></g>`
}

function renderEdge(
  edge: FlowchartEdge,
  nodes: Map<string, FlowchartNode>,
  options: FlowchartSvgOptions
): string {
  const sourceNode = nodes.get(edge.sourceNodeId)
  const targetNode = nodes.get(edge.targetNodeId)
  if (!sourceNode || !targetNode) return ""

  const points = connectionPoints(sourceNode, targetNode)
  const path = edgePath(edge, points.source, points.target)
  const color = escapeXml(resolveColor(edge.style.color, options.resolveColor))
  const markerId = `arrow-${safeId(edge.id)}`
  const marker =
    edge.style.markerEnd === "arrow"
      ? `<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}" /></marker></defs>`
      : ""
  const markerAttribute =
    edge.style.markerEnd === "arrow" ? ` marker-end="url(#${markerId})"` : ""
  const dashAttribute = edge.style.dashed ? ' stroke-dasharray="8 6"' : ""
  const labelPoint = {
    x: (points.source.x + points.target.x) / 2,
    y: (points.source.y + points.target.y) / 2,
  }
  const label = edge.label
    ? `<g class="edge-label"><rect x="${number(
        labelPoint.x - edge.label.length * 3.7 - 7
      )}" y="${number(labelPoint.y - 11)}" width="${number(
        edge.label.length * 7.4 + 14
      )}" height="22" rx="6" fill="${escapeXml(
        resolveColor("#ffffff", options.resolveColor)
      )}" fill-opacity="0.94" /><text x="${number(labelPoint.x)}" y="${number(
        labelPoint.y + 4
      )}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif" font-size="12" font-weight="500" fill="${color}">${escapeXml(
        edge.label
      )}</text></g>`
    : ""

  return `<g id="edge-${safeId(edge.id)}" data-object-id="${escapeXml(
    edge.id
  )}" data-object-kind="edge">${marker}<path d="${path}" fill="none" stroke="${color}" stroke-width="${number(
    edge.style.width
  )}" stroke-linecap="round" stroke-linejoin="round"${dashAttribute}${markerAttribute} />${label}</g>`
}

export function renderFlowchartSvg(
  document: FlowchartDocument,
  options: FlowchartSvgOptions = { background: "document" }
): string {
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))
  const background =
    options.background === "document"
      ? `<rect width="100%" height="100%" fill="${escapeXml(
          resolveColor(document.page.background, options.resolveColor)
        )}" />`
      : ""
  const edges = document.edges
    .map((edge) => renderEdge(edge, nodes, options))
    .join("")
  const orderedNodes = [...document.nodes].sort((first, second) => {
    if (first.type === "group" && second.type !== "group") return -1
    if (first.type !== "group" && second.type === "group") return 1
    return 0
  })
  const renderedNodes = orderedNodes
    .map((node) => renderNode(node, options))
    .join("")

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${number(
      document.page.width
    )}" height="${number(document.page.height)}" viewBox="0 0 ${number(
      document.page.width
    )} ${number(document.page.height)}" role="img" aria-labelledby="figure-title figure-description">`,
    `<title id="figure-title">${escapeXml(document.metadata.title)}</title>`,
    `<desc id="figure-description">${escapeXml(
      document.metadata.description ?? "Editable flowchart exported from FigureLab"
    )}</desc>`,
    background,
    `<g id="connections">${edges}</g>`,
    `<g id="nodes">${renderedNodes}</g>`,
    "</svg>",
  ].join("")
}
