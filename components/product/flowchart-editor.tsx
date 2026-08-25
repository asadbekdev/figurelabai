"use client"

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
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
  useReactFlow,
  useStoreApi,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react"
import {
  CopyIcon,
  Layers3Icon,
  LockIcon,
  Maximize2Icon,
  MoreHorizontalIcon,
  PaletteIcon,
  PlusIcon,
  Redo2Icon,
  Settings2Icon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
} from "@/components/icons"

import { ProjectVersionsPanel } from "@/components/product/project-versions-panel"
import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { ScrollArea } from "@/components/align/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/align/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/align/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/align/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/align/sheet"
import { Switch } from "@/components/align/switch"
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
import { runFlowchartReadiness } from "@/lib/flowchart/readiness"
import {
  anchoredEditorViewport,
  editorFitViewOptions,
  shouldRefitEditor,
} from "@/lib/flowchart/editor-fit"
import {
  canGroupSelectedNodes,
  nodeDepth,
  nodesInTreeOrder,
} from "@/lib/flowchart/document-edits"
import {
  FLOWCHART_CLIPBOARD_KIND,
  useFlowchartEditorStore,
  type FlowchartClipboard,
} from "@/lib/flowchart/store"
import {
  useProjectSessionStore,
  type ProjectSaveState,
} from "@/lib/product/project-session"
import { isMemoryWorkspace } from "@/lib/product/workspace-runtime"

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
        "--flowchart-font-size": `${node.style.fontSize}px`,
      }
    : {
        background: node.style.fill,
        borderColor: node.style.stroke,
        borderWidth: node.style.strokeWidth,
        borderRadius: node.type === "terminator" ? 999 : node.style.radius,
        color: node.style.textColor,
        fontSize: node.style.fontSize,
        "--flowchart-font-size": `${node.style.fontSize}px`,
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
        className="flowchart-handle size-3 border-2 border-surface-raised bg-foreground"
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
          <span className="flowchart-node-label relative line-clamp-4 font-medium">
            {node.text}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        aria-label={"Connect from " + node.text}
        className="flowchart-handle size-3 border-2 border-surface-raised bg-foreground"
      />
      {!node.locked && (
        <button
          type="button"
          aria-label={"Add a connected node after " + node.text}
          title="Add connected node"
          data-selected={selected ? "true" : undefined}
          className="flowchart-add-connected nodrag absolute top-1/2 -end-9 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-lg border bg-background text-foreground opacity-0 outline-none motion-safe:transition-[opacity,background-color,scale] motion-safe:duration-150 hover:bg-hover-veil focus-visible:opacity-100 active:scale-[0.96] group-hover:opacity-100"
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

function editorSaveLabel(saveState: ProjectSaveState, revision: number) {
  if (saveState === "loading") return "Loading"
  if (saveState === "saving") return "Saving…"
  if (saveState === "dirty") return "Unsaved changes"
  if (saveState === "offline") {
    return isMemoryWorkspace() ? "Storage unavailable · not saved" : "Offline · saved locally"
  }
  if (saveState === "conflict") return "Save conflict"
  if (saveState === "ready") return "Ready to save"
  return revision > 0 ? `Saved · rev ${revision}` : "Saved locally"
}

function reactNodesEquivalent(
  first: FlowchartReactNode[],
  second: FlowchartReactNode[]
) {
  if (first.length !== second.length) return false
  return first.every((node, index) => {
    const other = second[index]
    return (
      other !== undefined &&
      node.id === other.id &&
      node.position.x === other.position.x &&
      node.position.y === other.position.y &&
      node.selected === other.selected &&
      node.parentId === other.parentId &&
      node.style?.width === other.style?.width &&
      node.style?.height === other.style?.height
    )
  })
}

function FlowchartObjectList({ onObjectFocus }: { onObjectFocus?: () => void }) {
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

  const nodesById = useMemo(
    () => new Map(flowchart.nodes.map((node) => [node.id, node])),
    [flowchart.nodes]
  )
  const listedNodes = useMemo(() => nodesInTreeOrder(flowchart.nodes), [flowchart.nodes])

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
    <ScrollArea className="h-full pr-3" data-flowchart-shortcuts>
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
            {listedNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-pressed={selectedNodeIds.includes(node.id)}
                style={{
                  paddingLeft: 12 + nodeDepth(node, nodesById) * 12,
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg py-2 pr-3 text-start outline-none motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]",
                  selectedNodeIds.includes(node.id)
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={(event) => {
                  if (event.shiftKey || event.metaKey || event.ctrlKey) {
                    event.preventDefault()
                    const next = selectedNodeIds.includes(node.id)
                      ? selectedNodeIds.filter((id) => id !== node.id)
                      : [...selectedNodeIds, node.id]
                    selectNodes(next)
                    return
                  }
                  void focusNode(node.id)
                }}
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
    const sourceExcerpt =
      typeof selectedNode.data?.sourceExcerpt === "string"
        ? selectedNode.data.sourceExcerpt.trim()
        : ""
    const sourcePage =
      typeof selectedNode.data?.sourcePage === "string" ||
      typeof selectedNode.data?.sourcePage === "number"
        ? String(selectedNode.data.sourcePage)
        : ""

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

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-ui font-medium">Source context</p>
            {sourcePage ? <Badge variant="outline">Page {sourcePage}</Badge> : null}
          </div>
          <p className="mt-1 text-caption text-muted-foreground">
            {sourceExcerpt
              ? sourceExcerpt
              : flowchart.metadata.sourceAssetIds.length > 0
                ? "This figure has linked sources, but this node has no page-level excerpt yet."
                : "Prompt-derived node. No source excerpt is linked."}
          </p>
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

function FlowchartReadinessPanel() {
  const flowchart = useFlowchartEditorStore((state) => state.document)
  const selectNodes = useFlowchartEditorStore((state) => state.selectNodes)
  const selectEdge = useFlowchartEditorStore((state) => state.selectEdge)
  const report = useMemo(() => runFlowchartReadiness(flowchart), [flowchart])

  return (
    <section aria-labelledby="editor-readiness-title" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="editor-readiness-title" className="text-ui font-medium">
            Publication readiness
          </h3>
          <p className="mt-1 text-caption text-muted-foreground">
            Deterministic checks run on the saved figure, not a screenshot.
          </p>
        </div>
        <Badge variant={report.ready ? "secondary" : "destructive"}>
          {report.ready ? "Ready" : `${report.errors} ${report.errors === 1 ? "blocker" : "blockers"}`}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-title-sm font-semibold tabular-nums">{report.errors}</p>
          <p className="text-caption text-muted-foreground">Errors</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-title-sm font-semibold tabular-nums">{report.warnings}</p>
          <p className="text-caption text-muted-foreground">Warnings</p>
        </div>
      </div>

      {report.issues.length === 0 ? (
        <div className="rounded-lg bg-muted p-3 text-meta text-muted-foreground">
          No publication blockers or warnings were found.
        </div>
      ) : (
        <div className="space-y-1.5">
          {report.issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-start outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => {
                if (issue.nodeIds.length > 0) selectNodes(issue.nodeIds)
                else if (issue.edgeIds[0]) selectEdge(issue.edgeIds[0])
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-ui font-medium">{issue.title}</span>
                <Badge variant={issue.severity === "error" ? "destructive" : "outline"}>
                  {issue.severity}
                </Badge>
              </span>
              <span className="mt-1 block text-caption text-muted-foreground">
                {issue.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

type EdgeLabelEditor = {
  id: string
  left: number
  top: number
  text: string
}

function FlowchartCanvas({ railTrigger }: { railTrigger?: ReactNode }) {
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
  const copySelection = useFlowchartEditorStore((state) => state.copySelection)
  const pasteClipboard = useFlowchartEditorStore((state) => state.pasteClipboard)
  const applyAutoLayout = useFlowchartEditorStore((state) => state.applyAutoLayout)
  const groupSelection = useFlowchartEditorStore((state) => state.groupSelection)
  const ungroupSelection = useFlowchartEditorStore((state) => state.ungroupSelection)
  const applyColorMode = useFlowchartEditorStore((state) => state.applyColorMode)
  const scaleFonts = useFlowchartEditorStore((state) => state.scaleFonts)
  const deleteSelection = useFlowchartEditorStore((state) => state.deleteSelection)
  const undo = useFlowchartEditorStore((state) => state.undo)
  const redo = useFlowchartEditorStore((state) => state.redo)
  const past = useFlowchartEditorStore((state) => state.past)
  const future = useFlowchartEditorStore((state) => state.future)
  const announcement = useFlowchartEditorStore((state) => state.announcement)
  const saveState = useProjectSessionStore((state) => state.saveState)
  const revision = useProjectSessionStore((state) => state.revision)
  const { fitView, getNodesBounds, getViewport, setViewport } = useReactFlow<
    FlowchartReactNode,
    FlowchartReactEdge
  >()
  const reactFlowStore = useStoreApi<FlowchartReactNode, FlowchartReactEdge>()
  const initialFitComplete = useRef(false)
  const canvasSizeRef = useRef<{ width: number; height: number } | null>(null)
  const resizeFitFrameRef = useRef(0)
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
  const canvasSourceRef = useRef(adapted)
  const ignoreProgrammaticPositionsRef = useRef(false)
  const programmaticReleaseFramesRef = useRef<[number, number]>([0, 0])
  const draggingNodeIdsRef = useRef(new Set<string>())
  const positionCommitTimerRef = useRef(0)
  const [edgeLabelEditor, setEdgeLabelEditor] = useState<EdgeLabelEditor | null>(null)

  const fitEditorView = useCallback(
    async (duration: number) => {
      const size = canvasSizeRef.current
      const currentNodes = nodesRef.current
      if (!size || size.width <= 0 || size.height <= 0 || currentNodes.length === 0) return

      try {
        await fitView(editorFitViewOptions<FlowchartReactNode>(size.width, duration))
        const viewport = getViewport()
        const bounds = getNodesBounds(currentNodes)
        const anchored = anchoredEditorViewport({ size, bounds, viewport })
        if (anchored) await setViewport(anchored, { duration: 0 })
      } catch {
        // React Flow can still be measuring handles while a restored document
        // replaces the initial canvas. Fitting is progressive enhancement and
        // must never take down the editor route.
      }
    },
    [fitView, getNodesBounds, getViewport, setViewport]
  )

  useLayoutEffect(() => {
    if (canvasSourceRef.current === adapted) return
    canvasSourceRef.current = adapted

    // Apply a newly loaded or structurally edited document after React commits.
    // Updating controlled React Flow props during render makes StoreUpdater call
    // setNodes recursively and can crash the whole project route on restoration.
    const selection = useFlowchartEditorStore.getState()
    const storeSelection = new Set(selection.selectedNodeIds)
    const selectedEdgesBefore = new Set(
      selection.selectedEdgeId
        ? [selection.selectedEdgeId]
        : edgesRef.current.filter((edge) => edge.selected).map((edge) => edge.id)
    )
    const nextNodes = adapted.nodes.map((node) =>
      storeSelection.has(node.id) ? { ...node, selected: true } : node
    )
    const nextEdges = adapted.edges.map((edge) =>
      selectedEdgesBefore.has(edge.id) ? { ...edge, selected: true } : edge
    )

    nodesRef.current = nextNodes
    edgesRef.current = nextEdges
    ignoreProgrammaticPositionsRef.current = true
    const [previousOuterFrame, previousInnerFrame] = programmaticReleaseFramesRef.current
    window.cancelAnimationFrame(previousOuterFrame)
    window.cancelAnimationFrame(previousInnerFrame)
    const outerFrame = window.requestAnimationFrame(() => {
      const innerFrame = window.requestAnimationFrame(() => {
        ignoreProgrammaticPositionsRef.current = false
        programmaticReleaseFramesRef.current = [0, 0]
      })
      programmaticReleaseFramesRef.current = [outerFrame, innerFrame]
    })
    programmaticReleaseFramesRef.current = [outerFrame, 0]
    setCanvasState({ source: adapted, nodes: nextNodes, edges: nextEdges })

    return () => {
      const [scheduledOuterFrame, scheduledInnerFrame] = programmaticReleaseFramesRef.current
      window.cancelAnimationFrame(scheduledOuterFrame)
      window.cancelAnimationFrame(scheduledInnerFrame)
      programmaticReleaseFramesRef.current = [0, 0]
    }
  }, [adapted])

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

    const api = reactFlowStore.getState()
    if (selectedNodeIds.length > 0) api.addSelectedNodes(selectedNodeIds)
    else if (selectedEdgeId) api.addSelectedEdges([selectedEdgeId])
    else api.unselectNodesAndEdges()
  }, [reactFlowStore, selectedNodeIds, selectedEdgeId, canvasState.source])

  useEffect(() => {
    if (initialFitComplete.current) return
    initialFitComplete.current = true
    const timer = window.setTimeout(() => {
      void fitEditorView(0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [fitEditorView])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }
      const previousSize = canvasSizeRef.current
      canvasSizeRef.current = nextSize
      if (!previousSize) {
        window.cancelAnimationFrame(resizeFitFrameRef.current)
        resizeFitFrameRef.current = window.requestAnimationFrame(() => {
          void fitEditorView(0)
        })
        return
      }

      const contracted =
        nextSize.width < previousSize.width - 32 ||
        nextSize.height < previousSize.height - 32
      if (!contracted) return

      window.cancelAnimationFrame(resizeFitFrameRef.current)
      resizeFitFrameRef.current = window.requestAnimationFrame(() => {
        void fitEditorView(0)
      })
    })

    observer.observe(canvas)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(resizeFitFrameRef.current)
    }
  }, [fitEditorView])

  useEffect(() => {
    if (!shouldRefitEditor(announcement)) return
    const timer = window.setTimeout(() => {
      void fitEditorView(250)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [adapted, announcement, fitEditorView])

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
      for (const change of changes) {
        if (change.type === "position" && change.dragging === true) {
          draggingNodeIdsRef.current.add(change.id)
        }
      }

      const supportedChanges = changes.filter((change) => {
        if (change.type === "select" || change.type === "dimensions") return true
        if (change.type !== "position") return false
        if (change.dragging === true) return true
        if (change.dragging === false) {
          return draggingNodeIdsRef.current.has(change.id)
        }
        return !ignoreProgrammaticPositionsRef.current
      })
      if (supportedChanges.length === 0) return
      const previousNodes = nodesRef.current
      let nextNodes = applyNodeChanges(supportedChanges, previousNodes)
      const movedIds = new Set(
        supportedChanges.flatMap((change) =>
          change.type === "position" && change.position ? [change.id] : []
        )
      )
      for (const change of supportedChanges) {
        if (change.type !== "position" || !change.position) continue
        const before = previousNodes.find((node) => node.id === change.id)
        const after = nextNodes.find((node) => node.id === change.id)
        if (!before || !after || after.data.node.type !== "group") continue
        const dx = after.position.x - before.position.x
        const dy = after.position.y - before.position.y
        if (dx === 0 && dy === 0) continue
        const descendantSet = new Set<string>()
        const collect = (parentId: string) => {
          for (const node of nextNodes) {
            if (node.data.node.parentId === parentId && !descendantSet.has(node.id)) {
              descendantSet.add(node.id)
              collect(node.id)
            }
          }
        }
        collect(change.id)
        nextNodes = nextNodes.map((node) => {
          if (movedIds.has(node.id) || !descendantSet.has(node.id)) {
            return node
          }
          return {
            ...node,
            position: { x: node.position.x + dx, y: node.position.y + dy },
          }
        })
      }
      if (reactNodesEquivalent(nodesRef.current, nextNodes)) {
        nodesRef.current = nextNodes
        return
      }
      nodesRef.current = nextNodes
      setCanvasState((current) => ({ ...current, nodes: nextNodes }))
      const dragEnded = supportedChanges.some(
        (change) =>
          change.type === "position" &&
          change.dragging === false &&
          draggingNodeIdsRef.current.has(change.id)
      )
      const midDrag = supportedChanges.some(
        (change) => change.type === "position" && change.dragging === true
      )
      const keyboardMove =
        !midDrag &&
        !dragEnded &&
        !ignoreProgrammaticPositionsRef.current &&
        supportedChanges.some(
          (change) => change.type === "position" && change.dragging === undefined
        )
      if (dragEnded) {
        for (const change of supportedChanges) {
          if (change.type === "position" && change.dragging === false) {
            draggingNodeIdsRef.current.delete(change.id)
          }
        }
        window.clearTimeout(positionCommitTimerRef.current)
        commitCanvas("Node position updated", nextNodes, edgesRef.current)
      } else if (keyboardMove) {
        window.clearTimeout(positionCommitTimerRef.current)
        positionCommitTimerRef.current = window.setTimeout(() => {
          commitCanvas("Node position updated", nodesRef.current, edgesRef.current)
        }, 200)
      }
    },
    [commitCanvas]
  )

  const onEdgesChange = useCallback((changes: EdgeChange<FlowchartReactEdge>[]) => {
    const selectionChanges = changes.filter((change) => change.type === "select")
    if (selectionChanges.length === 0) return
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
      } else if (command && event.key.toLowerCase() === "c") {
        const payload = copySelection()
        if (payload) {
          event.preventDefault()
          void navigator.clipboard.writeText(JSON.stringify(payload))
        }
      } else if (command && event.key.toLowerCase() === "v") {
        event.preventDefault()
        void navigator.clipboard.readText().then((text) => {
          try {
            const parsed = JSON.parse(text) as FlowchartClipboard
            if (parsed.kind === FLOWCHART_CLIPBOARD_KIND) {
              pasteClipboard(parsed)
            }
          } catch {
            // Ignore non-figure clipboard contents.
          }
        })
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        deleteSelection()
      }
    },
    [copySelection, deleteSelection, duplicateSelection, pasteClipboard, redo, undo]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard)
    return () => {
      window.removeEventListener("keydown", handleKeyboard)
      window.clearTimeout(positionCommitTimerRef.current)
    }
  }, [handleKeyboard])

  const saveEdgeLabel = () => {
    if (!edgeLabelEditor) return
    const edge = flowchart.edges.find((item) => item.id === edgeLabelEditor.id)
    const label = edgeLabelEditor.text.trim() || undefined
    if (edge && edge.label !== label) updateEdge(edgeLabelEditor.id, { label })
    setEdgeLabelEditor(null)
  }

  const canGroup = canGroupSelectedNodes(flowchart, selectedNodeIds)
  const canUngroup = flowchart.nodes.some(
    (node) =>
      selectedNodeIds.includes(node.id) &&
      (node.type === "group" || Boolean(node.parentId))
  )
  const hasSelection = selectedNodeIds.length > 0 || Boolean(selectedEdgeId)
  const selectionLabel = selectedEdgeId
    ? "Connection selected"
    : selectedNodeIds.length === 1
      ? "1 node selected"
      : `${selectedNodeIds.length} nodes selected`
  const documentStatus = `${editorSaveLabel(saveState, revision)} · ${flowchart.nodes.length} nodes · ${flowchart.edges.length} connections`

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
        <div
          className="flex min-w-0 items-center gap-1 rounded-lg bg-muted p-1"
          role="toolbar"
          aria-label="Document editing"
        >
          <Button
            size="icon-xs"
            aria-label="Add node"
            title="Add node"
            onClick={() => addNode()}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Undo"
            title="Undo"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2Icon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Redo"
            title="Redo"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2Icon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Fit flowchart in view"
            title="Fit view"
            onClick={() => void fitEditorView(250)}
          >
            <Maximize2Icon aria-hidden="true" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="More document actions"
                title="More document actions"
              >
                <MoreHorizontalIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Layout</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => applyAutoLayout("left-right")}>
                <Layers3Icon aria-hidden="true" />
                Left to right
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyAutoLayout("top-bottom")}>
                <Layers3Icon aria-hidden="true" />
                Top to bottom
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Appearance</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => applyColorMode("color")}>
                <PaletteIcon aria-hidden="true" />
                Restore color
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyColorMode("grayscale")}>
                <PaletteIcon aria-hidden="true" />
                Convert to grayscale
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => scaleFonts(2)}>
                <TypeIcon aria-hidden="true" />
                Increase text size
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => scaleFonts(-2)}>
                <TypeIcon aria-hidden="true" />
                Decrease text size
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {railTrigger}
        </div>
        <p className="hidden min-w-0 truncate text-caption text-hollow tabular-nums sm:block">
          {documentStatus}
        </p>
      </div>

      <div
        ref={canvasRef}
        data-flowchart-shortcuts
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-background",
          flowchart.page.colorMode === "grayscale" && "grayscale"
        )}
      >
        {hasSelection ? (
          <div
            className="absolute start-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-background p-1 shadow-regular-sm ring-1 ring-border"
            role="toolbar"
            aria-label={`${selectionLabel} actions`}
          >
            <span className="hidden whitespace-nowrap px-2 text-caption text-hollow sm:inline">
              {selectionLabel}
            </span>
            {selectedNodeIds.length > 0 ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Duplicate selected nodes"
                title="Duplicate"
                onClick={duplicateSelection}
              >
                <CopyIcon aria-hidden="true" />
              </Button>
            ) : null}
            {canGroup ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Group selected nodes"
                title="Group"
                onClick={groupSelection}
              >
                <Layers3Icon aria-hidden="true" />
              </Button>
            ) : null}
            {canUngroup ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Ungroup selected nodes"
                title="Ungroup"
                onClick={ungroupSelection}
              >
                <Layers3Icon aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete selection"
              title="Delete"
              onClick={deleteSelection}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
        ) : null}
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
          aria-label={`Editable ${flowchart.metadata.title} flowchart`}
        >
          <Background gap={20} size={1.5} color="var(--border)" />
          <Controls showInteractive={false} />
        </ReactFlow>

        <p
          className="absolute end-3 bottom-3 z-10 max-w-[calc(100%-5.5rem)] whitespace-nowrap rounded-md bg-background/90 px-2 py-1 text-caption text-hollow shadow-regular-xs tabular-nums backdrop-blur-sm sm:hidden"
          aria-live="polite"
          aria-label={documentStatus}
          title={documentStatus}
        >
          {editorSaveLabel(saveState, revision)} · {flowchart.nodes.length} nodes
        </p>

        {edgeLabelEditor && (
          <div
            className="absolute z-20 w-44 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-2"
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
      <p className="sr-only">
        Select a node, then open the inspector to edit its label and appearance. Use the object
        list for keyboard navigation and multi-selection.
      </p>
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  )
}

function EditorRightRail() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs defaultValue="inspector" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="px-3 pt-3">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="inspector">Inspector</TabsTrigger>
            <TabsTrigger value="objects">Objects</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="inspector" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <FlowchartInspector />
        </TabsContent>
        <TabsContent value="objects" className="min-h-0 flex-1 overflow-hidden px-3 py-4">
          <FlowchartObjectList />
        </TabsContent>
        <TabsContent value="verify" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <FlowchartReadinessPanel />
        </TabsContent>
        <TabsContent value="versions" className="flex flex-col gap-1 px-3 py-4">
          <ProjectVersionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FlowchartEditorInner() {
  const [railOpen, setRailOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 px-3 pt-2 md:px-4 md:pt-3">
          <Sheet open={railOpen} onOpenChange={setRailOpen}>
            <FlowchartCanvas
              railTrigger={
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="lg:hidden"
                    aria-label="Open inspector"
                    title="Inspector"
                  >
                    <Settings2Icon aria-hidden="true" />
                  </Button>
                </SheetTrigger>
              }
            />
            <SheetContent
              side="bottom"
              className="max-h-[85svh] w-full rounded-t-2xl bg-sidebar p-0"
            >
              <SheetHeader>
                <SheetTitle>Figure details</SheetTitle>
                <SheetDescription>Inspector, objects, and versions.</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1">
                <EditorRightRail />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <aside className="hidden h-full w-80 shrink-0 border-s border-sidebar-border bg-sidebar lg:block">
        <EditorRightRail />
      </aside>
    </div>
  )
}

export function FlowchartEditorWorkbench() {
  return (
    <div className="flex min-h-0 flex-1">
      <ReactFlowProvider>
        <div className="flex min-h-0 min-w-0 flex-1">
          <FlowchartEditorInner />
        </div>
      </ReactFlowProvider>
    </div>
  )
}
