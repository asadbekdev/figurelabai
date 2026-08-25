"use client"

import { useRef, useState } from "react"
import { ImageAddIcon } from "@/components/icons"

import { Button } from "@/components/align/button"
import { cn } from "@/lib/utils"

export function FileUploadArea({
  accept,
  inputLabel = "Upload a file",
  hint = "JPEG, PNG, WEBP, PDF, Word, or CSV, up to 8 MB.",
  disabled,
  onFile,
}: {
  accept: string
  inputLabel?: string
  hint?: string
  disabled?: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function take(file: File | undefined) {
    if (!file || disabled) return
    onFile(file)
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted px-6 py-8 text-center",
        over && "border-primary bg-accent"
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        take(event.dataTransfer.files?.[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={inputLabel}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          take(file)
        }}
      />
      <ImageAddIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-ui">Choose a file or drag and drop it here.</p>
        <p className="text-caption text-hollow">{hint}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Browse file
      </Button>
    </div>
  )
}
