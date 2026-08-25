"use client"

import { useId, useRef, useState } from "react"
import {
  ArrowUpIcon,
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
  FileTextIcon,
  FlowchartIcon,
  ImageIcon,
  LoaderCircleIcon,
  LockIcon,
  MessageSquareIcon,
  PaletteIcon,
  PlusIcon,
  Settings2Icon,
  XIcon,
} from "@/components/icons"

import { FileUploadArea } from "@/components/product/file-upload-area"
import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from "@/components/align/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/align/dropdown-menu"
import { Label } from "@/components/align/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/align/popover"
import { Textarea } from "@/components/align/textarea"
import {
  ATTACH_DOC_ACCEPT,
  ATTACH_IMAGE_ACCEPT,
  defaultPromptForAttachment,
  parseAttachment,
  type ParsedAttachment,
} from "@/lib/product/attachments"
import {
  IMAGE_OUTPUT_SIZES,
  UPSCALE_8K_LIMIT,
  type ImageOutputSize,
} from "@/lib/generation/image-size"
import {
  composeIllustrationPrompt,
  extractPaletteFromDataUrl,
  illustrationNeedsSourceImage,
  ILLUSTRATION_STYLE_PRESETS,
  illustrationInputModes,
  JOURNAL_PALETTE_PRESETS,
  type IllustrationInputMode,
  type JournalPaletteId,
} from "@/lib/product/illustration-input"
import {
  COMPOSER_MODEL_OPTIONS,
  DEFAULT_IMAGE_OFFERING,
  clampOfferingImageSize,
  supportedImageSizes,
  type ComposerModelChoice,
} from "@/lib/generation/offerings"
import { cn } from "@/lib/utils"

export type ComposerMode = "ask" | "illustration" | "flowchart" | "plot"
export type ComposerAspectRatio = "auto" | "square" | "portrait" | "landscape" | "wide"
export type ComposerStyle = keyof typeof ILLUSTRATION_STYLE_PRESETS
export type ComposerModel = ComposerModelChoice
export type ComposerVariants = 1 | 2 | 3
export type ComposerInputMode = IllustrationInputMode
export type ComposerImageSize = ImageOutputSize

type Mode = ComposerMode

const modes: Array<{
  value: Mode
  label: string
  icon: typeof FlowchartIcon
  status?: "Preview"
}> = [
  { value: "flowchart", label: "Flowchart", icon: FlowchartIcon },
  { value: "illustration", label: "Illustration", icon: ImageIcon, status: "Preview" },
  { value: "plot", label: "Plot", icon: ChartIcon, status: "Preview" },
  { value: "ask", label: "Ask", icon: MessageSquareIcon },
]

const aspectRatios: Array<{ value: ComposerAspectRatio; label: string; hint?: string }> = [
  { value: "auto", label: "Auto" },
  { value: "square", label: "Square", hint: "1:1" },
  { value: "portrait", label: "Portrait", hint: "3:4" },
  { value: "landscape", label: "Landscape", hint: "4:3" },
  { value: "wide", label: "Wide", hint: "16:9" },
]

const styles: Array<{ value: ComposerStyle; label: string; hint: string }> = (
  Object.entries(ILLUSTRATION_STYLE_PRESETS) as Array<
    [ComposerStyle, (typeof ILLUSTRATION_STYLE_PRESETS)[ComposerStyle]]
  >
).map(([value, preset]) => ({
  value,
  label: preset.label,
  hint: preset.hint,
}))

const models = COMPOSER_MODEL_OPTIONS

const variantOptions: Array<{ value: ComposerVariants; label: string; hint?: string }> = [
  { value: 1, label: "Single" },
  { value: 2, label: "2 variants", hint: "Pick the better one" },
  { value: 3, label: "3 variants", hint: "Pick the best one" },
]

const placeholders: Record<Mode, string> = {
  ask: "Ask anything",
  flowchart: "Describe a process, pathway, or logic",
  illustration: "Describe the scientific figure to generate",
  plot: "Describe the chart, then add data",
}

export type ComposerSubmitInput = {
  mode: Mode
  prompt: string
  aspectRatio: ComposerAspectRatio
  style: ComposerStyle
  model: ComposerModel
  variants: ComposerVariants
  attachments: ParsedAttachment[]
  plotData: string
  inputMode: ComposerInputMode
  visualConsistency: boolean
  paletteColors: string[]
  imageSize: ComposerImageSize
  generateAsImage: boolean
}

function OptionSection<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string
  options: Array<{ value: T; label: string; hint?: string }>
  value: T
  onPick: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1.5 text-caption text-hollow">{label}</p>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onPick(option.value)}
          aria-pressed={value === option.value}
          className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span>
            {option.label}
            {option.hint ? <span className="text-hollow"> · {option.hint}</span> : null}
          </span>
          {value === option.value ? (
            <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function PromptComposer({
  className,
  compact = false,
  availableModes = ["flowchart", "illustration", "plot", "ask"],
  initialPrompt = "",
  initialMode,
  placeholder,
  onSubmit,
  onCancel,
  showCredits = false,
  showSourceControls = true,
  submissionMessage = "Prompt submitted",
  submitLabel,
  busy = false,
}: {
  className?: string
  compact?: boolean
  availableModes?: Mode[]
  initialPrompt?: string
  initialMode?: Mode
  placeholder?: string
  onSubmit?: (input: ComposerSubmitInput) => void
  onCancel?: () => void
  showCredits?: boolean
  showSourceControls?: boolean
  submissionMessage?: string
  submitLabel?: string
  busy?: boolean
}) {
  const inputId = useId()
  const dataInputId = useId()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const modeOptions = modes.filter((item) => availableModes.includes(item.value))
  const [mode, setMode] = useState<Mode>(
    initialMode ??
      (availableModes.includes("flowchart")
        ? "flowchart"
        : availableModes[0] ?? "ask")
  )
  const [prompt, setPrompt] = useState(initialPrompt)
  const [attachments, setAttachments] = useState<ParsedAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<ComposerAspectRatio>("auto")
  const [style, setStyle] = useState<ComposerStyle>("flat")
  const [model, setModel] = useState<ComposerModel>(DEFAULT_IMAGE_OFFERING)
  const [variants, setVariants] = useState<ComposerVariants>(1)
  const [plotData, setPlotData] = useState("")
  const [inputMode, setInputMode] = useState<ComposerInputMode>("text")
  const [visualConsistency, setVisualConsistency] = useState(false)
  const [paletteColors, setPaletteColors] = useState<string[]>([])
  const [paletteBusy, setPaletteBusy] = useState(false)
  const [imageSize, setImageSize] = useState<ComposerImageSize>("1k")
  const [generateAsImage, setGenerateAsImage] = useState(false)
  const [journalPalette, setJournalPalette] = useState<JournalPaletteId | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)

  const resolvedImageSize = clampOfferingImageSize(model, imageSize)
  const imageAttachment = attachments.find((item) => item.kind === "image") ?? null
  const docAttachment = attachments.find((item) => item.kind !== "image") ?? null

  const showModeControl = modeOptions.length > 1
  const showAspect = mode === "illustration" || mode === "plot"
  const showStyle = mode === "illustration"
  const showVariants = mode === "illustration"
  const showIllustrationModes = mode === "illustration"
  const showJournalPalette = mode === "illustration" || mode === "plot"
  const showData = mode === "plot"
  const showModelControl =
    mode === "illustration" || mode === "plot" || (mode === "flowchart" && generateAsImage)
  const plotRows = plotData.trim() ? plotData.trim().split(/\r?\n/).length : 0

  const needsImage =
    showIllustrationModes && illustrationNeedsSourceImage(inputMode, visualConsistency)
  const canSubmit =
    !busy &&
    (!needsImage || Boolean(imageAttachment)) &&
    Boolean(prompt.trim() || attachments.length > 0 || (showData && plotData.trim()))

  const modelLabel = models.find((item) => item.value === model)?.label ?? "Nano Banana"
  const modeOption = modes.find((item) => item.value === mode) ?? modes[0]
  const sizeOptions = IMAGE_OUTPUT_SIZES.filter((item) =>
    supportedImageSizes(model).includes(item.value)
  )
  const resolvedPlaceholder =
    placeholder ?? (compact ? "Request a change" : placeholders[mode])

  function submit() {
    if (!canSubmit) return
    const nextPrompt =
      prompt.trim() ||
      (attachments[0] ? defaultPromptForAttachment(mode, attachments[0]) : "") ||
      (showData && plotData.trim() ? "Create a publication-style chart from this table." : "")
    if (!nextPrompt) return
    const composed =
      mode === "illustration" || (mode === "flowchart" && generateAsImage)
        ? composeIllustrationPrompt({
            prompt: nextPrompt,
            inputMode: mode === "flowchart" ? "text" : inputMode,
            visualConsistency: inputMode === "reference" || visualConsistency,
            paletteColors,
            generateAsImage: mode === "flowchart" && generateAsImage,
          })
        : nextPrompt
    setSubmitted(true)
    onSubmit?.({
      mode,
      prompt: composed,
      aspectRatio,
      style,
      model,
      variants,
      attachments,
      plotData: plotData.trim(),
      inputMode,
      visualConsistency: inputMode === "reference" || visualConsistency,
      paletteColors,
      imageSize: resolvedImageSize,
      generateAsImage: mode === "flowchart" && generateAsImage,
    })
    setPrompt("")
    setAttachments([])
    setPlotData("")
    setPaletteColors([])
    setAttachError(null)
    window.setTimeout(() => setSubmitted(false), 900)
  }

  async function onFileChosen(file: File | undefined) {
    if (!file) return
    setAttachError(null)
    const parsed = await parseAttachment(file)
    if (!parsed.ok) {
      setAttachError(parsed.error.message)
      return
    }
    const isImage = parsed.attachment.kind === "image"
    setAttachments((previous) => [
      ...previous.filter((item) => (item.kind === "image") !== isImage),
      parsed.attachment,
    ])
  }

  function removeAttachment(name: string) {
    setAttachments((previous) => previous.filter((item) => item.name !== name))
    if (imageAttachment?.name === name) setPaletteColors([])
  }

  async function extractPalette() {
    if (!imageAttachment?.dataUrl) {
      setAttachError("Attach a reference image first, then extract its palette.")
      return
    }
    setPaletteBusy(true)
    setAttachError(null)
    try {
      const colors = await extractPaletteFromDataUrl(imageAttachment.dataUrl)
      if (colors.length === 0) {
        setAttachError("No usable colors were found in that image.")
        return
      }
      setPaletteColors(colors)
    } catch {
      setAttachError("The palette could not be read from that image.")
    } finally {
      setPaletteBusy(false)
    }
  }

  const triggerClass =
    "h-7 rounded-lg bg-muted px-2 font-medium text-muted-foreground hover:bg-hover-veil hover:text-foreground"
  const iconChipClass =
    "size-7 rounded-lg bg-muted text-muted-foreground hover:bg-hover-veil hover:text-foreground"

  const dataEditor = (
    <div className="flex flex-col gap-2">
      <Label htmlFor={dataInputId} className="text-ui">
        Table data
      </Label>
      <Textarea
        id={dataInputId}
        rows={5}
        value={plotData}
        onChange={(event) => setPlotData(event.target.value)}
        placeholder={"Paste a table — CSV or tab-separated.\nstep,yield\nA,12"}
        className="max-h-48 min-h-24 overflow-y-auto text-caption"
        disabled={busy}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-hollow tabular-nums">
          {plotRows > 0 ? `${plotRows} lines` : "Or attach a CSV with +"}
        </p>
        {plotData ? (
          <Button type="button" variant="ghost" size="xs" onClick={() => setPlotData("")}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  )

  return (
    <form
      className={cn("w-full max-w-[700px]", className)}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="rounded-[20px] bg-muted p-px">
        <div className="overflow-hidden rounded-[19px] bg-card px-3 pb-3 pt-3.5 shadow-regular-xs motion-safe:transition-[box-shadow] motion-safe:duration-150 focus-within:shadow-button-important-focus">
      {showSourceControls ? (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept={ATTACH_IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Attach an image source"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void onFileChosen(file)
            }}
          />
          <input
            ref={docInputRef}
            type="file"
            accept={ATTACH_DOC_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Attach a document source"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void onFileChosen(file)
            }}
          />
        </>
      ) : null}

      {showSourceControls && attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-2 pb-2">
          {attachments.map((attachment) => (
            <span
              key={attachment.name}
              className="flex max-w-full items-center gap-1.5 rounded-lg bg-hover-veil py-1 pe-1 ps-2.5 text-meta"
            >
              {attachment.kind === "image" ? (
                <ImageIcon className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <FileTextIcon className="size-4 shrink-0" aria-hidden="true" />
              )}
              {attachment.kind === "image" ? (
                <span className="text-hollow">Reference</span>
              ) : null}
              <span className="max-w-40 truncate">{attachment.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6 rounded-lg"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => removeAttachment(attachment.name)}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </span>
          ))}
        </div>
      ) : null}

      {showSourceControls && paletteColors.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
          <span className="text-caption text-hollow">Extracted palette</span>
          {paletteColors.map((color) => (
            <span
              key={color}
              className="size-3.5 rounded-full border border-border/70"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setPaletteColors([])
              setJournalPalette(null)
            }}
          >
            Clear
          </Button>
        </div>
      ) : null}

      {showSourceControls && attachError ? (
        <p className="mx-2 mb-2 text-caption text-muted-foreground" role="alert">
          {attachError}
        </p>
      ) : null}

      {showIllustrationModes && needsImage && !imageAttachment ? (
        <p className="mx-2 mb-2 text-caption text-muted-foreground">
          {inputMode === "enhance"
            ? "Attach the figure to enhance."
            : inputMode === "sketch"
              ? "Attach a sketch or whiteboard photo."
              : inputMode === "image"
                ? "Attach a photo, scan, or existing figure."
                : "Attach a reference image to lock visual consistency."}
        </p>
      ) : null}

      <Label htmlFor={inputId} className="sr-only">
        {resolvedPlaceholder}
      </Label>
      <textarea
        id={inputId}
        data-slot="prompt-input"
        name="prompt"
        value={prompt}
        rows={1}
        className="field-sizing-content max-h-42 min-h-6 w-full resize-none overflow-y-auto border-0 bg-transparent px-1 py-0 text-base font-normal leading-6 text-foreground outline-none placeholder:text-hollow disabled:cursor-not-allowed disabled:text-hollow sm:text-[15px]"
        placeholder={resolvedPlaceholder}
        disabled={busy}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            submit()
          }
          if (event.key === "Escape") {
            event.currentTarget.blur()
          }
        }}
      />

      {showSourceControls ? (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={iconChipClass}
            aria-label="Attach a source"
            disabled={busy}
            onClick={() => setAttachOpen(true)}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
          {showModeControl ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={triggerClass}
                  disabled={busy}
                  aria-label={`Figure type: ${modeOption.label}${modeOption.status ? `, ${modeOption.status.toLowerCase()}` : ""}`}
                >
                  <modeOption.icon aria-hidden="true" />
                  {modeOption.label}
                  <ChevronDownIcon className="text-hollow" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuRadioGroup
                  value={mode}
                  onValueChange={(value) => setMode(value as Mode)}
                >
                  {modeOptions.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.status ? (
                        <span className="ms-auto text-caption text-hollow">{item.status}</span>
                      ) : null}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={triggerClass}
                disabled={busy}
                aria-label="Figure settings"
              >
                <Settings2Icon aria-hidden="true" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[min(70vh,36rem)] w-80 overflow-y-auto">
              <div className="flex flex-col gap-4">
                {showAspect ? (
                  <OptionSection
                    label="Aspect ratio"
                    options={aspectRatios}
                    value={aspectRatio}
                    onPick={setAspectRatio}
                  />
                ) : null}
                {showIllustrationModes ? (
                  <OptionSection
                    label="Input"
                    options={illustrationInputModes}
                    value={inputMode}
                    onPick={(value) => {
                      setInputMode(value)
                      if (value === "reference") setVisualConsistency(true)
                    }}
                  />
                ) : null}
                {showIllustrationModes ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={visualConsistency}
                    onClick={() => setVisualConsistency((value) => !value)}
                  >
                    <LockIcon aria-hidden="true" />
                    {visualConsistency || inputMode === "reference"
                      ? "Visual consistency on"
                      : "Keep visual consistency"}
                  </Button>
                ) : null}
                {mode === "flowchart" ? (
                  <OptionSection
                    label="Output"
                    options={[
                      { value: "nodes", label: "Editable diagram", hint: "Nodes and edges" },
                      { value: "image", label: "Figure image", hint: "Journal-style raster" },
                    ]}
                    value={generateAsImage ? "image" : "nodes"}
                    onPick={(value) => setGenerateAsImage(value === "image")}
                  />
                ) : null}
                {showJournalPalette ? (
                  <OptionSection
                    label="Journal palette"
                    options={[
                      { value: "none", label: "None", hint: "Model default" },
                      ...JOURNAL_PALETTE_PRESETS.map((preset) => ({
                        value: preset.id,
                        label: preset.label,
                        hint: preset.hint,
                      })),
                    ]}
                    value={journalPalette ?? "none"}
                    onPick={(value) => {
                      if (value === "none") {
                        setJournalPalette(null)
                        setPaletteColors([])
                        return
                      }
                      const preset = JOURNAL_PALETTE_PRESETS.find((item) => item.id === value)
                      if (!preset) return
                      setJournalPalette(preset.id)
                      setPaletteColors([...preset.colors])
                    }}
                  />
                ) : null}
                {showIllustrationModes && imageAttachment ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paletteBusy}
                    onClick={() => void extractPalette()}
                  >
                    {paletteBusy ? (
                      <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <PaletteIcon aria-hidden="true" />
                    )}
                    Extract palette from source
                  </Button>
                ) : null}
                {showIllustrationModes ? (
                  <OptionSection
                    label="Output size"
                    options={sizeOptions.map((item) => ({
                      value: item.value,
                      label: item.label,
                      hint: item.hint,
                    }))}
                    value={resolvedImageSize}
                    onPick={setImageSize}
                  />
                ) : null}
                {showStyle ? (
                  <OptionSection label="Style" options={styles} value={style} onPick={setStyle} />
                ) : null}
                {showVariants ? (
                  <OptionSection
                    label="Variants"
                    options={variantOptions.map((item) => ({
                      value: String(item.value),
                      label: item.label,
                      hint: item.hint,
                    }))}
                    value={String(variants)}
                    onPick={(value) => setVariants(Number(value) as ComposerVariants)}
                  />
                ) : null}
                <div className={cn("sm:hidden", !showModelControl && "hidden")}>
                  <OptionSection
                    label="Model"
                    options={models}
                    value={model}
                    onPick={(value) => {
                      setModel(value)
                      setImageSize((current) => clampOfferingImageSize(value, current))
                    }}
                  />
                </div>
                {showData ? dataEditor : null}
                {showIllustrationModes ? (
                  <p className="text-caption text-hollow">{UPSCALE_8K_LIMIT}</p>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          <div className="ms-auto flex items-center gap-2">
            {showCredits ? (
              <span className="hidden text-caption text-hollow tabular-nums sm:inline">50</span>
            ) : null}
            {showModelControl ? <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={cn(triggerClass, "hidden sm:inline-flex")}
                  disabled={busy}
                  aria-label={`Model: ${modelLabel}`}
                >
                  {modelLabel}
                  <ChevronDownIcon className="text-hollow" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuRadioGroup
                  value={model}
                  onValueChange={(value) => {
                    const next = value as ComposerModel
                    setModel(next)
                    setImageSize((current) => clampOfferingImageSize(next, current))
                  }}
                >
                  {models.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      <span className="flex flex-col">
                        <span>{item.label}</span>
                        <span className="text-caption text-hollow">{item.hint}</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu> : null}

            {busy && onCancel ? (
              <Button
                type="button"
                size="icon-xs"
                className="size-7 rounded-lg"
                onClick={onCancel}
                aria-label="Stop generating"
              >
                <span className="size-2.5 rounded-xs bg-current" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-xs"
                className={cn(
                  "size-7 rounded-lg",
                  canSubmit
                    ? "bg-primary text-primary-foreground hover:bg-primary-darker"
                    : "bg-muted text-hollow hover:bg-muted"
                )}
                disabled={!canSubmit}
                aria-label={submitLabel ?? (compact ? "Request change" : "Send")}
                aria-busy={busy}
              >
                {busy ? (
                  <LoaderCircleIcon
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : submitted ? (
                  <span className="size-2 rounded-full bg-current" aria-hidden="true" />
                ) : (
                  <ArrowUpIcon aria-hidden="true" />
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end">
          {busy && onCancel ? (
            <Button
              type="button"
              size="icon-xs"
              className="size-7 rounded-lg"
              onClick={onCancel}
              aria-label="Stop generating"
            >
              <span className="size-2.5 rounded-xs bg-current" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-xs"
              className="size-7 rounded-lg"
              disabled={!canSubmit}
              aria-label={submitLabel ?? "Send"}
              aria-busy={busy}
            >
              {busy ? (
                <LoaderCircleIcon
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <ArrowUpIcon aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      )}
        </div>
      </div>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogIcon>
              <ImageIcon aria-hidden="true" />
            </DialogIcon>
            <DialogTitle>Attach a source</DialogTitle>
            <DialogDescription>
              Drop a reference image, notes, PDF, Word, or CSV. One image and one document at a time.
              {imageAttachment || docAttachment
                ? ` Current: ${[imageAttachment?.name, docAttachment?.name].filter(Boolean).join(" · ")}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <FileUploadArea
            accept={`${ATTACH_IMAGE_ACCEPT},${ATTACH_DOC_ACCEPT}`}
            disabled={busy}
            onFile={(file) => {
              void onFileChosen(file)
              setAttachOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="sr-only" role="status" aria-live="polite">
        {busy ? "Working on your request" : submitted ? submissionMessage : attachError ?? ""}
      </div>
    </form>
  )
}
