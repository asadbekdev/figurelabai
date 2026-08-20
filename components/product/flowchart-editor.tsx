"use client"

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useNodesInitialized,
  useReactFlow,
  useStoreApi,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react"
import {
  CopyIcon,
  LockIcon,
  Maximize2Icon,
  PlusIcon,
  Redo2Icon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  documentToReactFlow,
  reactFlowToDocument,
  type FlowchartReactEdge,
  type FlowchartReactNode,
} from "@/lib/flowchart/adapter"
import {
  type FlowchartEdgeType,
  type FlowchartNodeType,
} from "@/lib/flowchart/schema"
import { documentColorOptions } from "@/lib/flowchart/palette"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"

const nodeTypeLabels: Record<FlowchartNodeType, string> = {
  process: "Process",
  decision: "Decision",
  terminator: "Terminator",
  document: "Document",
  group: "Group",
  note: "Note",
}

const edgeTypeLabels: Record<FlowchartEdgeType, string> = {
  straight: "Straight",
  step: "Step",
  smoothstep: "Smooth step",
  bezier: "Bezier",
}

// Document colors are portable artifact values, not app theme tokens, so
// exports render identically outside the app. See lib/flowchart/palette.ts.

function nodeShapeClass(type: FlowchartNodeType) {
  return cn(
    "relative grid size-full place-items-center px-4 text-center",
    type === "decision" ? "px-6" : "border",
    type === "group" && "border-dashed",
    type === "note" && "items-start text-start"
  )
}

const FlowchartNodeView = memo(function FlowchartNodeView({
  data,
  selected,
}: NodeProps<FlowchartReactNode>) {
  console.count("render:NodeView")
  const node = data.node
  const updateNode = useFlowchartEditorStore((state) => state.updateNode)
  const selectNodes = useFlowchartEditorStore((state) => state.selectNodes)
  const addNode = useFlowchartEditorStore((state) => state.addNode)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.text)

  const saveLabel = useCallback(() => {
    const nextText = draft.trim() || "Untitled node"
    if (nextText !== node.text) updateNode(node.id, { text: nextText })
    setEditing(false)
  }, [draft, node.id, node.text, updateNode])

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      saveLabel()
    }
    if (event.key === "Escape") {
      setDraft(node.text)
      setEditing(false)
    }
  }

  const addConnectedNode = () => {
    selectNodes([node.id])
    addNode()
  }

  const isDecision = node.type === "decision"
  const shapeStyle = isDecision
    ? {
        color: node.style.textColor,
        fontSize: node.style.fontSize,
      }
    : {
        background: node.style.fill,
        borderColor: node.style.stroke,
        borderWidth: node.style.strokeWidth,
        borderRadius: node.type === "terminator" ? 999 : node.style.radius,
        color: node.style.textColor,
        fontSize: node.style.fontSize,
        boxShadow: selected
          ? "0 0 0 1px var(--ring), 0 0 0 5px color-mix(in oklch, var(--ring) 16%, transparent)"
          : undefined,
      }

  return (
    <div className="group relative size-full">
      <Handle
        type="target"
        position={Position.Left}
        aria-label={"Connect into " + node.text}
        className="size-3 border-2 border-surface-raised bg-foreground"
      />
      <div
        className={nodeShapeClass(node.type)}
        style={shapeStyle}
        onDoubleClick={() => {
          if (!node.locked) {
            setDraft(node.text)
            setEditing(true)
          }
        }}
      >
        {isDecision && (
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {selected && (
              <polygon
                points="50,0.5 99.5,50 50,99.5 0.5,50"
                fill="none"
                stroke="var(--ring)"
                strokeWidth={5}
                vectorEffect="non-scaling-stroke"
                opacity="0.35"
              />
            )}
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={node.style.fill}
              stroke={selected ? "var(--ring)" : node.style.stroke}
              strokeWidth={node.style.strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
        {editing ? (
          <Input
            autoFocus
            aria-label={"Edit label for " + node.text}
            className="nodrag nowheel relative h-9 bg-surface-raised text-center"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={saveLabel}
            onKeyDown={handleEditorKeyDown}
          />
        ) : (
          <span className="relative line-clamp-4 font-medium">{node.text}</span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        aria-label={"Connect from " + node.text}
        className="size-3 border-2 border-surface-raised bg-foreground"
      />
      {!node.locked && (
        <button
          type="button"
          aria-label={"Add a connected node after " + node.text}
          title="Add connected node"
          className="nodrag absolute top-1/2 -right-9 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border bg-surface-raised text-foreground opacity-0 shadow-surface outline-none motion-safe:transition-[opacity,background-color,scale] motion-safe:duration-150 hover:bg-muted focus-visible:opacity-100 active:scale-[0.96] group-hover:opacity-100"
          onClick={addConnectedNode}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
})

const nodeTypes = { flowchart: FlowchartNodeView }
const multiSelectionKeys = ["Meta", "Control", "Shift"]
const panOnDragButtons = [1, 2]
const reactFlowProOptions = { hideAttribution: true }

function EditorPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="h-full gap-0 border-border/70 bg-surface/70 py-0 shadow-none">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-ui">{title}</CardTitle>
        <CardDescription className="text-caption">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-3">{children}</CardContent>
    </Card>
  )
}

function FlowchartObjectList({ onObjectFocus }: { onObjectFocus?: () => void }) {
  console.count("render:ObjectList")
  const flowchart = useFlowchartEditorStore((state) => state.document)
  const selectedNodeIds = useFlowchartEditorStore((state) => state.selectedNodeIds)
  const selectedEdgeId = useFlowchartEditorStore((state) => state.selectedEdgeId)
  const selectNodes = useFlowchartEditorStore((state) => state.selectNodes)
  const selectEdge = useFlowchartEditorStore((state) => state.selectEdge)
  const { getNode, setCenter } = useReactFlow<FlowchartReactNode, FlowchartReactEdge>()

  const focusNode = async (nodeId: string) => {
    selectNodes([nodeId])
    const node = getNode(nodeId)
    if (node) {
      await setCenter(
        node.position.x + node.data.node.size.width / 2,
        node.position.y + node.data.node.size.height / 2,
        { zoom: 1, duration: 250 }
      )
    }
    onObjectFocus?.()
    requestAnimationFrame(() => {
      window.document
        .querySelector<HTMLElement>(
          '.react-flow__node[data-id="' + CSS.escape(nodeId) + '"]'
        )
        ?.focus()
    })
  }

  const focusEdge = async (edgeId: string) => {
    selectEdge(edgeId)
    const edge = flowchart.edges.find((item) => item.id === edgeId)
    const source = edge ? getNode(edge.sourceNodeId) : undefined
    const target = edge ? getNode(edge.targetNodeId) : undefined
    if (source && target) {
      const sourceX = source.position.x + source.data.node.size.width / 2
      const sourceY = source.position.y + source.data.node.size.height / 2
      const targetX = target.position.x + target.data.node.size.width / 2
      const targetY = target.position.y + target.data.node.size.height / 2
      await setCenter((sourceX + targetX) / 2, (sourceY + targetY) / 2, {
        zoom: 1,
        duration: 250,
      })
    }
    onObjectFocus?.()
    requestAnimationFrame(() => {
      window.document
        .querySelector<HTMLElement>(
          '.react-flow__edge[data-id="' + CSS.escape(edgeId) + '"]'
        )
        ?.focus()
    })
  }

  return (
    <ScrollArea className="h-128 pr-3" data-flowchart-shortcuts>
      <div className="space-y-5">
        <section aria-labelledby="node-list-title">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="node-list-title" className="text-ui font-medium">
              Nodes
            </h3>
            <Badge variant="outline" className="tabular-nums">
              {flowchart.nodes.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {flowchart.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-pressed={selectedNodeIds.includes(node.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-start outline-none motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]",
                  selectedNodeIds.includes(node.id)
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => void focusNode(node.id)}
              >
                {node.locked ? (
                  <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full border"
                    style={{ background: node.style.fill, borderColor: node.style.stroke }}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-ui font-medium">{node.text}</span>
                  <span className="block text-caption text-muted-foreground">
                    {nodeTypeLabels[node.type]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="edge-list-title">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="edge-list-title" className="text-ui font-medium">
              Connections
            </h3>
            <Badge variant="outline" className="tabular-nums">
              {flowchart.edges.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {flowchart.edges.map((edge) => {
              const source = flowchart.nodes.find((node) => node.id === edge.sourceNodeId)
              const target = flowchart.nodes.find((node) => node.id === edge.targetNodeId)
              return (
                <button
                  key={edge.id}
                  type="button"
                  aria-pressed={selectedEdgeId === edge.id}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-start outline-none motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]",
                    selectedEdgeId === edge.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => void focusEdge(edge.id)}
                >
                  <span className="block truncate text-ui font-medium">
                    {source?.text} → {target?.text}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {edge.label || "No label"}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </ScrollArea>
  )
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onCommit,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        key={id + "-" + value}
        id={id}
        type="number"
        min={min}
        max={max}
        defaultValue={value}
        className="tabular-nums"
        onBlur={(event) => {
          const nextValue = Number(event.target.value)
          if (Number.isFinite(nextValue) && nextValue >= min && nextValue <= max) {
            if (nextValue !== value) onCommit(nextValue)
          } else {
            event.target.value = String(value)
          }
        }}
      />
    </div>
  )
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const options = documentColorOptions.some((option) => option.value === value)
    ? documentColorOptions
    : [{ value, label: "Custom" }, ...documentColorOptions]

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span
                className="size-3 rounded-full border"
                style={{ background: option.value }}
                aria-hidden="true"
              />
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function FlowchartInspector() {
  console.count("render:Inspector")
  const flowchart = useFlowchartEditorStore((state) => state.document)
  const selectedNodeIds = useFlowchartEditorStore((state) => state.selectedNodeIds)
  const selectedEdgeId = useFlowchartEditorStore((state) => state.selectedEdgeId)
  const updateNode = useFlowchartEditorStore((state) => state.updateNode)
  const updateEdge = useFlowchartEditorStore((state) => state.updateEdge)

  const selectedNode =
    selectedNodeIds.length === 1
      ? flowchart.nodes.find((node) => node.id === selectedNodeIds[0])
      : undefined
  const selectedEdge = selectedEdgeId
    ? flowchart.edges.find((edge) => edge.id === selectedEdgeId)
    : undefined

  if (selectedNodeIds.length > 1) {
    return (
      <div className="rounded-md bg-muted p-4">
        <p className="text-ui font-medium">{selectedNodeIds.length} nodes selected</p>
        <p className="mt-1 text-meta text-muted-foreground">
          Drag the selection together, duplicate it, or delete it from the toolbar.
        </p>
      </div>
    )
  }

  if (selectedNode) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="node-label">Label</Label>
          <Input
            key={selectedNode.id + "-" + selectedNode.text}
            id="node-label"
            defaultValue={selectedNode.text}
            disabled={selectedNode.locked}
            onBlur={(event) => {
              const text = event.target.value.trim() || "Untitled node"
              if (text !== selectedNode.text) updateNode(selectedNode.id, { text })
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="node-type">Shape</Label>
          <Select
            value={selectedNode.type}
            disabled={selectedNode.locked}
            onValueChange={(value) =>
              updateNode(selectedNode.id, { type: value as FlowchartNodeType })
            }
          >
            <SelectTrigger id="node-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(nodeTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ColorField
            id="node-fill"
            label="Fill"
            value={selectedNode.style.fill}
            onChange={(fill) =>
              updateNode(selectedNode.id, { style: { ...selectedNode.style, fill } })
            }
          />
          <ColorField
            id="node-stroke"
            label="Border"
            value={selectedNode.style.stroke}
            onChange={(stroke) =>
              updateNode(selectedNode.id, { style: { ...selectedNode.style, stroke } })
            }
          />
          <ColorField
            id="node-text-color"
            label="Text"
            value={selectedNode.style.textColor}
            onChange={(textColor) =>
              updateNode(selectedNode.id, { style: { ...selectedNode.style, textColor } })
            }
          />
          <NumberField
            id="node-font-size"
            label="Text size"
            min={8}
            max={96}
            value={selectedNode.style.fontSize}
            onCommit={(fontSize) =>
              updateNode(selectedNode.id, { style: { ...selectedNode.style, fontSize } })
            }
          />
          <NumberField
            id="node-radius"
            label="Radius"
            min={0}
            max={100}
            value={selectedNode.style.radius}
            onCommit={(radius) =>
              updateNode(selectedNode.id, { style: { ...selectedNode.style, radius } })
            }
          />
          <NumberField
            id="node-border-width"
            label="Border"
            min={0}
            max={20}
            value={selectedNode.style.strokeWidth}
            onCommit={(strokeWidth) =>
              updateNode(selectedNode.id, { style: { ...selectedNode.style, strokeWidth } })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <Label htmlFor="node-locked">Lock node</Label>
            <p className="text-caption text-muted-foreground">Prevent drag and deletion.</p>
          </div>
          <Switch
            id="node-locked"
            checked={Boolean(selectedNode.locked)}
            onCheckedChange={(locked) => updateNode(selectedNode.id, { locked })}
          />
        </div>
      </div>
    )
  }

  if (selectedEdge) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="edge-label">Label</Label>
          <Input
            key={selectedEdge.id + "-" + selectedEdge.label}
            id="edge-label"
            defaultValue={selectedEdge.label}
            placeholder="Optional label"
            onBlur={(event) => {
              const label = event.target.value.trim() || undefined
              if (label !== selectedEdge.label) updateEdge(selectedEdge.id, { label })
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edge-route">Route</Label>
          <Select
            value={selectedEdge.type}
            onValueChange={(value) =>
              updateEdge(selectedEdge.id, { type: value as FlowchartEdgeType })
            }
          >
            <SelectTrigger id="edge-route" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(edgeTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            id="edge-color"
            label="Color"
            value={selectedEdge.style.color}
            onChange={(color) =>
              updateEdge(selectedEdge.id, { style: { ...selectedEdge.style, color } })
            }
          />
          <NumberField
            id="edge-width"
            label="Width"
            min={0.5}
            max={20}
            value={selectedEdge.style.width}
            onCommit={(width) =>
              updateEdge(selectedEdge.id, { style: { ...selectedEdge.style, width } })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <Label htmlFor="edge-arrow">Arrow ending</Label>
          <Switch
            id="edge-arrow"
            checked={selectedEdge.style.markerEnd === "arrow"}
            onCheckedChange={(checked) =>
              updateEdge(selectedEdge.id, {
                style: {
                  ...selectedEdge.style,
                  markerEnd: checked ? "arrow" : "none",
                },
              })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <Label htmlFor="edge-dashed">Dashed line</Label>
          <Switch
            id="edge-dashed"
            checked={selectedEdge.style.dashed}
            onCheckedChange={(dashed) =>
              updateEdge(selectedEdge.id, {
                style: { ...selectedEdge.style, dashed },
              })
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md bg-muted p-4">
      <p className="text-ui font-medium">Nothing selected</p>
      <p className="mt-1 text-meta text-muted-foreground">
        Select a node or connection on the canvas or in the object list.
      </p>
    </div>
  )
}

type EdgeLabelEditor = {
  id: string
  left: number
  top: number
  text: string
}

function FlowchartCanvas() {
  console.count("render:Canvas")
  const canvasRef = useRef<HTMLDivElement>(null)
  const flowchart = useFlowchartEditorStore((state) => state.document)
  const selectedNodeIds = useFlowchartEditorStore((state) => state.selectedNodeIds)
  const selectedEdgeId = useFlowchartEditorStore((state) => state.selectedEdgeId)
  const selectNodes = useFlowchartEditorStore((state) => state.selectNodes)
  const selectEdge = useFlowchartEditorStore((state) => state.selectEdge)
  const addNode = useFlowchartEditorStore((state) => state.addNode)
  const addEdge = useFlowchartEditorStore((state) => state.addEdge)
  const updateEdge = useFlowchartEditorStore((state) => state.updateEdge)
  const updateViewport = useFlowchartEditorStore((state) => state.updateViewport)
  const duplicateSelection = useFlowchartEditorStore((state) => state.duplicateSelection)
  const deleteSelection = useFlowchartEditorStore((state) => state.deleteSelection)
  const undo = useFlowchartEditorStore((state) => state.undo)
  const redo = useFlowchartEditorStore((state) => state.redo)
  const past = useFlowchartEditorStore((state) => state.past)
  const future = useFlowchartEditorStore((state) => state.future)
  const announcement = useFlowchartEditorStore((state) => state.announcement)
  const { fitView, getViewport } = useReactFlow<FlowchartReactNode, FlowchartReactEdge>()
  const reactFlowStore = useStoreApi<FlowchartReactNode, FlowchartReactEdge>()
  const nodesInitialized = useNodesInitialized()
  const initialFitComplete = useRef(false)
  // Keyed on document structure only: viewport moves preserve array identity
  // in the store, so they never force a canvas rebuild.
  const adapted = useMemo(
    () => documentToReactFlow(flowchart),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowchart.nodes, flowchart.edges, flowchart.page]
  )
  const [canvasState, setCanvasState] = useState<{
    source: typeof adapted
    nodes: FlowchartReactNode[]
    edges: FlowchartReactEdge[]
  }>(() => ({
    source: adapted,
    nodes: adapted.nodes,
    edges: adapted.edges,
  }))
  const nodesRef = useRef(canvasState.nodes)
  const edgesRef = useRef(canvasState.edges)
  const [edgeLabelEditor, setEdgeLabelEditor] = useState<EdgeLabelEditor | null>(null)

  if (canvasState.source !== adapted) {
    // Rebuild for structural changes, carrying selection flags forward so
    // React Flow's internal selection stays consistent with what it reports.
    const selectedBefore = new Set(
      nodesRef.current.filter((node) => node.selected).map((node) => node.id)
    )
    const selectedEdgesBefore = new Set(
      edgesRef.current.filter((edge) => edge.selected).map((edge) => edge.id)
    )
    const nextNodes = adapted.nodes.map((node) =>
      selectedBefore.has(node.id) ? { ...node, selected: true } : node
    )
    const nextEdges = adapted.edges.map((edge) =>
      selectedEdgesBefore.has(edge.id) ? { ...edge, selected: true } : edge
    )
    nodesRef.current = nextNodes
    edgesRef.current = nextEdges
    setCanvasState({ source: adapted, nodes: nextNodes, edges: nextEdges })
  }

  const nodes = canvasState.nodes
  const edges = canvasState.edges

  // External selection (object list, add node, undo) flows through React
  // Flow's own selection API so its change events stay the single channel
  // that writes `selected` flags. Flipping flags directly on the nodes prop
  // makes React Flow emit corrective changes and loop.
  useEffect(() => {
    const currentNodeSelection = nodesRef.current
      .filter((node) => node.selected)
      .map((node) => node.id)
    const currentEdgeSelection =
      edgesRef.current.find((edge) => edge.selected)?.id ?? null
    const sameNodes =
      currentNodeSelection.length === selectedNodeIds.length &&
      currentNodeSelection.every((id) => selectedNodeIds.includes(id))
    if (sameNodes && currentEdgeSelection === selectedEdgeId) return

    console.log("sync:push", JSON.stringify({ refsN: currentNodeSelection, refsE: currentEdgeSelection, storeN: selectedNodeIds, storeE: selectedEdgeId }))
    const api = reactFlowStore.getState()
    if (selectedNodeIds.length > 0) api.addSelectedNodes(selectedNodeIds)
    else if (selectedEdgeId) api.addSelectedEdges([selectedEdgeId])
    else api.unselectNodesAndEdges()
  }, [reactFlowStore, selectedNodeIds, selectedEdgeId, canvasState.source])

  useEffect(() => {
    if (!nodesInitialized || initialFitComplete.current) return
    initialFitComplete.current = true
    const frame = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.18, duration: 0 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [fitView, nodesInitialized])

  const commitCanvas = useCallback(
    (
      message: string,
      nextNodes = nodesRef.current,
      nextEdges = edgesRef.current
    ) => {
      const currentFlowchart = useFlowchartEditorStore.getState().document
      const nextDocument = reactFlowToDocument(
        currentFlowchart,
        nextNodes,
        nextEdges,
        getViewport()
      )
      if (JSON.stringify(nextDocument) !== JSON.stringify(currentFlowchart)) {
        useFlowchartEditorStore.getState().replaceDocument(nextDocument, message)
      }
    },
    [getViewport]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowchartReactNode>[]) => {
      const supportedChanges = changes.filter(
        (change) =>
          change.type === "position" ||
          change.type === "select" ||
          change.type === "dimensions"
      )
      if (supportedChanges.length === 0) return
      console.log("sync:nodesChange", JSON.stringify(supportedChanges.filter((c) => c.type === "select")))
      const nextNodes = applyNodeChanges(supportedChanges, nodesRef.current)
      nodesRef.current = nextNodes
      setCanvasState((current) => ({ ...current, nodes: nextNodes }))
      const positionEnded = supportedChanges.some(
        (change) => change.type === "position" && change.dragging !== true
      )
      if (positionEnded) {
        commitCanvas("Node position updated", nextNodes, edgesRef.current)
      }
    },
    [commitCanvas]
  )

  const onEdgesChange = useCallback((changes: EdgeChange<FlowchartReactEdge>[]) => {
    const selectionChanges = changes.filter((change) => change.type === "select")
    if (selectionChanges.length === 0) return
    console.log("sync:edgesChange", JSON.stringify(selectionChanges))
    const nextEdges = applyEdgeChanges(selectionChanges, edgesRef.current)
    edgesRef.current = nextEdges
    setCanvasState((current) => ({ ...current, edges: nextEdges }))
  }, [])

  const handleKeyboard = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest("[data-flowchart-shortcuts]") ||
        target.matches("input, textarea, select, [contenteditable='true']") ||
        target.closest("[role='dialog']")
      ) {
        return
      }
      const command = event.metaKey || event.ctrlKey
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (command && event.key.toLowerCase() === "d") {
        event.preventDefault()
        duplicateSelection()
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        deleteSelection()
      }
    },
    [deleteSelection, duplicateSelection, redo, undo]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard)
    return () => window.removeEventListener("keydown", handleKeyboard)
  }, [handleKeyboard])

  const saveEdgeLabel = () => {
    if (!edgeLabelEditor) return
    const edge = flowchart.edges.find((item) => item.id === edgeLabelEditor.id)
    const label = edgeLabelEditor.text.trim() || undefined
    if (edge && edge.label !== label) updateEdge(edgeLabelEditor.id, { label })
    setEdgeLabelEditor(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex flex-wrap items-center gap-1 rounded-full border border-border/70 bg-surface/80 p-1"
          role="toolbar"
          aria-label="Flowchart editing"
        >
          <Button size="sm" className="h-8" onClick={() => addNode()}>
            <PlusIcon aria-hidden="true" />
            Add node
          </Button>
          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label="Undo"
            title="Undo"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2Icon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label="Redo"
            title="Redo"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2Icon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label="Duplicate selected nodes"
            title="Duplicate"
            disabled={selectedNodeIds.length === 0}
            onClick={duplicateSelection}
          >
            <CopyIcon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label="Delete selection"
            title="Delete"
            disabled={selectedNodeIds.length === 0 && !selectedEdgeId}
            onClick={deleteSelection}
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label="Fit flowchart in view"
            title="Fit view"
            onClick={() => void fitView({ padding: 0.18, duration: 250 })}
          >
            <Maximize2Icon aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="tabular-nums">
            {flowchart.nodes.length} nodes · {flowchart.edges.length} edges
          </Badge>
          <Badge variant="secondary">Saved on this device</Badge>
        </div>
      </div>

      <div
        ref={canvasRef}
        data-flowchart-shortcuts
        className="continuous-corners surface-outline relative h-[calc(100svh-15rem)] min-h-[32rem] overflow-hidden rounded-2xl bg-surface"
      >
        <ReactFlow<FlowchartReactNode, FlowchartReactEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(connection: Connection) => {
            if (connection.source && connection.target) {
              addEdge(connection.source, connection.target)
            }
          }}
          onReconnect={(oldEdge, connection) => {
            const nextEdges = reconnectEdge(oldEdge, connection, edgesRef.current)
            edgesRef.current = nextEdges
            setCanvasState((current) => ({ ...current, edges: nextEdges }))
            commitCanvas("Connection reconnected", nodesRef.current, nextEdges)
          }}
          onSelectionChange={() => {
            // Callback arguments can describe a superseded selection while
            // external updates are in flight, so derive the current truth
            // from the synchronously maintained refs instead.
            const state = useFlowchartEditorStore.getState()
            const nodeIds = nodesRef.current
              .filter((node) => node.selected)
              .map((node) => node.id)
            const edgeId = edgesRef.current.find((edge) => edge.selected)?.id ?? null
            const nodesUnchanged =
              nodeIds.length === state.selectedNodeIds.length &&
              nodeIds.every((id) => state.selectedNodeIds.includes(id))
            console.log("sync:mirror", JSON.stringify({ nodeIds, edgeId, storeN: state.selectedNodeIds, storeE: state.selectedEdgeId }))
            if (nodesUnchanged && edgeId === state.selectedEdgeId) return
            if (nodeIds.length > 0) selectNodes(nodeIds)
            else if (edgeId) selectEdge(edgeId)
            // Never clear the store from this mirror: empty states are
            // transient while external selection is applied, and clearing
            // here oscillates against the store-to-canvas sync effect.
            // Explicit clearing belongs to onPaneClick.
          }}
          onPaneClick={() => selectEdge(null)}
          onEdgeDoubleClick={(event, edge) => {
            event.preventDefault()
            const bounds = canvasRef.current?.getBoundingClientRect()
            if (!bounds) return
            setEdgeLabelEditor({
              id: edge.id,
              left: event.clientX - bounds.left,
              top: event.clientY - bounds.top,
              text: edge.data?.edge.label ?? "",
            })
          }}
          deleteKeyCode={null}
          multiSelectionKeyCode={multiSelectionKeys}
          selectionOnDrag
          panOnDrag={panOnDragButtons}
          defaultViewport={flowchart.viewport}
          onMoveEnd={(_, viewport) => updateViewport(viewport)}
          minZoom={0.25}
          maxZoom={2}
          proOptions={reactFlowProOptions}
          aria-label="Editable PCR workflow flowchart"
        >
          <Background gap={20} size={1.5} color="var(--border)" />
          <Controls showInteractive={false} />
        </ReactFlow>

        {edgeLabelEditor && (
          <div
            className="absolute z-20 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface-raised p-2 shadow-overlay"
            style={{ left: edgeLabelEditor.left, top: edgeLabelEditor.top }}
          >
            <Label htmlFor="inline-edge-label" className="sr-only">
              Connection label
            </Label>
            <Input
              id="inline-edge-label"
              autoFocus
              className="rounded-md"
              value={edgeLabelEditor.text}
              placeholder="Connection label"
              onChange={(event) =>
                setEdgeLabelEditor({ ...edgeLabelEditor, text: event.target.value })
              }
              onBlur={saveEdgeLabel}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveEdgeLabel()
                if (event.key === "Escape") setEdgeLabelEditor(null)
              }}
            />
          </div>
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        Double-click labels to edit. Use Shift to multi-select, arrow keys to move, and Delete to remove.
      </p>
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  )
}

function FlowchartEditorInner() {
  console.count("render:Inner")
  const [objectsOpen, setObjectsOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Sheet open={objectsOpen} onOpenChange={setObjectsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              Objects
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(20rem,calc(100vw-1rem))] sm:max-w-none">
            <SheetHeader>
              <SheetTitle>Flowchart objects</SheetTitle>
              <SheetDescription>A keyboard-accessible list of every node and connection.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <FlowchartObjectList onObjectFocus={() => setObjectsOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              Inspector
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,calc(100vw-1rem))] sm:max-w-none">
            <SheetHeader>
              <SheetTitle>Inspector</SheetTitle>
              <SheetDescription>Edit the selected object using explicit values.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-128 px-4 pb-4">
              <FlowchartInspector />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_17rem]">
        <aside className="sticky top-[4.75rem] hidden lg:block">
          <EditorPanel title="Objects" description="Every node and connection, in reading order.">
            <FlowchartObjectList />
          </EditorPanel>
        </aside>
        <main className="min-w-0">
          <FlowchartCanvas />
        </main>
        <aside className="sticky top-[4.75rem] hidden lg:block">
          <EditorPanel title="Inspector" description="Edit the selected node or connection.">
            <ScrollArea className="max-h-[calc(100svh-11rem)] pe-1">
              <FlowchartInspector />
            </ScrollArea>
          </EditorPanel>
        </aside>
      </div>
    </div>
  )
}

export function FlowchartEditorWorkbench() {
  return (
    <ReactFlowProvider>
      <FlowchartEditorInner />
    </ReactFlowProvider>
  )
}
