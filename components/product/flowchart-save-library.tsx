"use client"

import { createFlowchartSvg } from "@/lib/flowchart/export"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import { useProjectSessionStore } from "@/lib/product/project-session"

import { SaveToLibraryButton } from "./save-to-library-button"

export function FlowchartSaveToLibrary() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const document = useFlowchartEditorStore((state) => state.document)
  const svg = createFlowchartSvg(document, { background: "document" })

  return (
    <SaveToLibraryButton
      prompt={document.metadata.title}
      mimeType="image/svg+xml"
      dataUrl={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      projectId={projectId}
    />
  )
}
