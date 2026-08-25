"use client"

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  AspectIcon,
  Maximize2Icon,
  PaletteIcon,
  SelectRegionIcon,
  TypeIcon,
  WandSparklesIcon,
} from "@/components/icons"

import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from "@/components/align/dialog"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/align/popover"
import { Textarea } from "@/components/align/textarea"
import {
  ASPECT_EDIT_OPTIONS,
  RECOLOR_PALETTES,
  UPSCALE_8K_LIMIT,
  UPSCALE_LIMIT,
  WHITE_BG_PROMPT,
  aspectEditPrompt,
  recolorPrompt,
  regionRedrawPrompt,
  textEditPrompt,
  upscalePrompt,
  type AspectEditValue,
  type EditRegion,
  type UpscaleSize,
} from "@/lib/product/image-edit"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/align/tooltip"

export type ImageEditRequest = {
  prompt: string
  aspectRatio?: "auto" | AspectEditValue
  imageSize?: UpscaleSize
}

type ImageEditBarProps = {
  busy: boolean
  disabled?: boolean
  imageLabel: string
  onRunEdit: (request: ImageEditRequest) => void
  children?: React.ReactNode
}

function fractionRegion(
  event: ReactPointerEvent<HTMLDivElement>,
  bounds: DOMRect
): { x: number; y: number } {
  return {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  }
}

export function ImageEditBar({
  busy,
  disabled,
  imageLabel,
  onRunEdit,
  children,
}: ImageEditBarProps) {
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [regionMode, setRegionMode] = useState(false)
  const [region, setRegion] = useState<EditRegion | null>(null)
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [regionInstruction, setRegionInstruction] = useState("")
  const [textInstruction, setTextInstruction] = useState("")
  const [textOpen, setTextOpen] = useState(false)

  const controlsDisabled = busy || disabled

  function runEdit(
    prompt: string,
    aspectRatio?: ImageEditRequest["aspectRatio"],
    imageSize?: ImageEditRequest["imageSize"]
  ) {
    onRunEdit({ prompt, aspectRatio, imageSize })
  }

  function onRegionPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!regionMode || controlsDisabled) return
    const bounds = event.currentTarget.getBoundingClientRect()
    dragStart.current = fractionRegion(event, bounds)
    setRegion(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onRegionPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!regionMode || !dragStart.current) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const current = fractionRegion(event, bounds)
    const start = dragStart.current
    setRegion({
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    })
  }

  function onRegionPointerUp() {
    if (!regionMode) return
    dragStart.current = null
    if (region && region.width > 0.02 && region.height > 0.02) {
      setRegionDialogOpen(true)
    } else {
      setRegion(null)
    }
  }

  function cancelRegionMode() {
    setRegionMode(false)
    setRegion(null)
    dragStart.current = null
  }

  function submitRegion() {
    if (!region || !regionInstruction.trim()) return
    runEdit(regionRedrawPrompt(region, regionInstruction))
    setRegionDialogOpen(false)
    setRegionInstruction("")
    cancelRegionMode()
  }

  return (
    <div className="space-y-3">
      {children ? (
      <div className="relative">
        {children}
        {regionMode ? (
          <div
            role="presentation"
            aria-label="Region selection layer. Drag across the area to redraw."
            className="absolute inset-0 cursor-crosshair touch-none rounded-lg"
            onPointerDown={onRegionPointerDown}
            onPointerMove={onRegionPointerMove}
            onPointerUp={onRegionPointerUp}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelRegionMode()
            }}
          >
            {region ? (
              <div
                aria-hidden="true"
                className="absolute border-2 border-foreground bg-foreground/10"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`,
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
        <p className="ms-1 me-1 text-caption text-hollow">Edit with AI</p>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="xs" disabled={controlsDisabled}>
              <PaletteIcon aria-hidden="true" />
              Recolor
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="flex flex-col gap-1">
              <p className="px-1.5 pb-1 text-caption text-hollow">Palette</p>
              {RECOLOR_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => runEdit(recolorPrompt(palette))}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span>
                    {palette.label}
                    <span className="text-hollow"> · {palette.hint}</span>
                  </span>
                  <span className="flex gap-1" aria-hidden="true">
                    {palette.colors.map((color) => (
                      <span
                        key={color}
                        className="size-3.5 rounded-full border border-border/70"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={controlsDisabled}
          onClick={() => runEdit(WHITE_BG_PROMPT)}
        >
          <WandSparklesIcon aria-hidden="true" />
          White BG
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="xs" disabled={controlsDisabled}>
              <AspectIcon aria-hidden="true" />
              Aspect
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52">
            <div className="flex flex-col gap-1">
              <p className="px-1.5 pb-1 text-caption text-hollow">Aspect ratio</p>
              {ASPECT_EDIT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => runEdit(aspectEditPrompt(option.value), option.value)}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {option.label}
                  <span className="text-hollow">{option.hint}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={textOpen} onOpenChange={setTextOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="xs" disabled={controlsDisabled}>
              <TypeIcon aria-hidden="true" />
              Text
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="space-y-2">
              <Label htmlFor="image-text-edit" className="text-ui">
                Text change
              </Label>
              <Input
                id="image-text-edit"
                value={textInstruction}
                onChange={(event) => setTextInstruction(event.target.value)}
                placeholder='e.g. Rename "PCR" to "qPCR"'
                onKeyDown={(event) => {
                  if (event.key === "Enter" && textInstruction.trim()) {
                    runEdit(textEditPrompt(textInstruction))
                    setTextInstruction("")
                    setTextOpen(false)
                  }
                }}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={!textInstruction.trim()}
                  onClick={() => {
                    runEdit(textEditPrompt(textInstruction))
                    setTextInstruction("")
                    setTextOpen(false)
                  }}
                >
                  Apply text edit
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={controlsDisabled}
              title={UPSCALE_LIMIT}
            >
              <Maximize2Icon aria-hidden="true" />
              Upscale
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="flex flex-col gap-1">
              <p className="px-1.5 pb-1 text-caption text-hollow">{UPSCALE_LIMIT}</p>
              {(["2k", "4k"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => runEdit(upscalePrompt(size), undefined, size)}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {size.toUpperCase()}
                  <span className="text-hollow tabular-nums">
                    {size === "4k" ? "4096 px" : "2048 px"}
                  </span>
                </button>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-ui text-hollow"
                  >
                    8K
                    <span>Not available</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{UPSCALE_8K_LIMIT}</TooltipContent>
              </Tooltip>
            </div>
          </PopoverContent>
        </Popover>

        {children ? (
          <Button
            type="button"
            variant={regionMode ? "secondary" : "ghost"}
            size="xs"
            disabled={controlsDisabled}
            aria-pressed={regionMode}
            onClick={() => (regionMode ? cancelRegionMode() : setRegionMode(true))}
          >
            <SelectRegionIcon aria-hidden="true" />
            {regionMode ? "Cancel region" : "Region"}
          </Button>
        ) : null}

        {regionMode ? (
          <span className="text-caption text-muted-foreground">
            Drag across the area to redraw. Esc cancels.
          </span>
        ) : null}
      </div>

      <Dialog
        open={regionDialogOpen}
        onOpenChange={(next) => {
          setRegionDialogOpen(next)
          if (!next) setRegion(null)
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogIcon>
              <SelectRegionIcon aria-hidden="true" />
            </DialogIcon>
            <DialogTitle>Redraw this region</DialogTitle>
            <DialogDescription>
              Describe what should change inside the marked area of {imageLabel}. The rest of
              the figure stays as is.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="region-instruction" className="sr-only">
              Region instruction
            </Label>
            <Textarea
              id="region-instruction"
              rows={3}
              value={regionInstruction}
              onChange={(event) => setRegionInstruction(event.target.value)}
              placeholder="e.g. Replace the icon with a microscope, keep the label"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={!regionInstruction.trim()}
              onClick={submitRegion}
            >
              Redraw region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
