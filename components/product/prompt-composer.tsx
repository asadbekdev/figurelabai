"use client"

import { useId, useState } from "react"
import {
  ArrowUpIcon,
  FileTextIcon,
  ImageIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type ComposerMode = "illustration" | "flowchart" | "plot"
export type ComposerAspectRatio = "auto" | "square" | "portrait"

type Mode = ComposerMode

const modes: Array<{ value: Mode; label: string }> = [
  { value: "illustration", label: "Illustration" },
  { value: "flowchart", label: "Flowchart" },
  { value: "plot", label: "Plot" },
]

export function PromptComposer({
  className,
  compact = false,
  availableModes = ["illustration", "flowchart", "plot"],
  initialPrompt = "Show a three-step PCR workflow from sample collection to analysis.",
  initialHasFile = true,
  onSubmit,
  showCredits = true,
  showSourceControls = true,
  submissionMessage = "Prompt submitted",
  submitLabel,
  busy = false,
}: {
  className?: string
  compact?: boolean
  availableModes?: Mode[]
  initialPrompt?: string
  initialHasFile?: boolean
  onSubmit?: (input: {
    mode: Mode
    prompt: string
    aspectRatio: ComposerAspectRatio
  }) => void
  showCredits?: boolean
  showSourceControls?: boolean
  submissionMessage?: string
  submitLabel?: string
  busy?: boolean
}) {
  const inputId = useId()
  const modeOptions = modes.filter((item) => availableModes.includes(item.value))
  const [mode, setMode] = useState<Mode>(
    availableModes.includes("flowchart") ? "flowchart" : availableModes[0] ?? "flowchart"
  )
  const [prompt, setPrompt] = useState(initialPrompt)
  const [hasFile, setHasFile] = useState(initialHasFile)
  const [submitted, setSubmitted] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<ComposerAspectRatio>("auto")

  function submit() {
    if (!prompt.trim() || busy) return
    setSubmitted(true)
    onSubmit?.({ mode, prompt: prompt.trim(), aspectRatio })
    window.setTimeout(() => setSubmitted(false), 900)
  }

  return (
    <form
      className={cn(
        "continuous-corners w-full rounded-composer bg-surface-raised p-2 surface-outline",
        compact ? "max-w-2xl" : "max-w-3xl",
        className
      )}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {modeOptions.length > 1 && (
        <fieldset className="px-2 pt-1">
          <legend className="sr-only">Creation mode</legend>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Creation mode">
            {modeOptions.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="xs"
                variant={mode === item.value ? "secondary" : "ghost"}
                aria-pressed={mode === item.value}
                disabled={busy}
                onClick={() => setMode(item.value)}
              >
                {item.value === "illustration" && <ImageIcon aria-hidden="true" />}
                {item.value === "flowchart" && <SparklesIcon aria-hidden="true" />}
                {item.value === "plot" && <FileTextIcon aria-hidden="true" />}
                {item.label}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      <Label htmlFor={inputId} className="sr-only">
        Describe the figure
      </Label>
      <Textarea
        id={inputId}
        name="prompt"
        value={prompt}
        rows={compact ? 2 : 3}
        className="min-h-20 resize-none border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
        placeholder="Show a three-step PCR workflow from sample collection to analysis"
        disabled={busy}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault()
            submit()
          }
        }}
      />

      {showSourceControls && hasFile && (
        <div className="mx-2 mb-2 flex w-fit max-w-full items-center gap-2 rounded-lg bg-muted px-2 py-1.5 text-meta">
          <FileTextIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">methods-notes.pdf</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove methods-notes.pdf"
            onClick={() => setHasFile(false)}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-1">
          {showSourceControls && (
            <Button type="button" variant="ghost" size="icon" aria-label="Add source">
              <PaperclipIcon aria-hidden="true" />
            </Button>
          )}
          <Select
            value={aspectRatio}
            onValueChange={(value) => setAspectRatio(value as ComposerAspectRatio)}
            disabled={busy}
          >
            <SelectTrigger aria-label="Aspect ratio" className="h-9 border-0 bg-transparent px-2 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto · 16:9</SelectItem>
              <SelectItem value="square">Square · 1:1</SelectItem>
              <SelectItem value="portrait">Portrait · 4:5</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="hidden sm:inline-flex">
            Nano · Flat
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {showCredits && (
            <span className="hidden text-meta text-muted-foreground tabular-nums sm:inline">
              50 credits
            </span>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={busy || !prompt.trim()}
            aria-label={submitLabel ?? (compact ? "Request change" : "Review prompt")}
            aria-busy={busy}
          >
            {busy ? (
              <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : submitted ? (
              <span className="size-2 rounded-full bg-current" aria-hidden="true" />
            ) : (
              <ArrowUpIcon aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {busy ? "Working on your request" : submitted ? submissionMessage : ""}
      </div>
    </form>
  )
}
