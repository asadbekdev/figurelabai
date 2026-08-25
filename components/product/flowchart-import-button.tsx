"use client"

import { useRef, useState } from "react"
import { FileTextIcon, Loader2Icon } from "@/components/icons"
import { toast } from "sonner"

import { Button } from "@/components/align/button"
import { parseImportedFlowchartJson } from "@/lib/flowchart/import"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import { useProjectSessionStore } from "@/lib/product/project-session"

export function FlowchartImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const replaceDocument = useFlowchartEditorStore((state) => state.replaceDocument)
  const setSession = useProjectSessionStore((state) => state.setSession)

  async function onFile(file: File) {
    setImporting(true)
    try {
      const document = parseImportedFlowchartJson(await file.text())
      replaceDocument(document, "Imported flowchart loaded")
      setSession({ title: document.metadata.title })
      toast.success("Flowchart imported", {
        description: `${document.nodes.length} nodes and ${document.edges.length} connections are now on the canvas.`,
      })
    } catch (error) {
      toast.error("Import failed", {
        description:
          error instanceof Error ? error.message : "That file could not be loaded as a flowchart.",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Import flowchart JSON"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) void onFile(file)
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={importing}
        onClick={() => inputRef.current?.click()}
      >
        {importing ? (
          <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <FileTextIcon aria-hidden="true" />
        )}
        Import
      </Button>
    </>
  )
}
