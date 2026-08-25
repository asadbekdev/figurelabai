"use client"

import { useState } from "react"
import { FileTextIcon, Loader2Icon } from "@/components/icons"
import { toast } from "sonner"

import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/align/dialog"
import { createPublicationRecordPdf } from "@/lib/export/certificate"
import { downloadArtifact, exportFilename } from "@/lib/flowchart/export"

export function PublicationRecordDialog({
  title,
  projectId,
  figureKind,
}: {
  title: string
  projectId: string | null
  figureKind: "flowchart" | "illustration"
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const figureTitle = title.trim() || "Untitled figure"
  const localId = projectId || "local-unsaved"

  async function download() {
    setBusy(true)
    try {
      const artifact = await createPublicationRecordPdf({
        title: figureTitle,
        projectId: localId,
        figureKind,
      })
      downloadArtifact(artifact, exportFilename(`${figureTitle}-publication-record`, "pdf"))
      toast.success("Local figure record downloaded", {
        description: "A dated local record — not a legal license or journal approval.",
      })
      setOpen(false)
    } catch (error) {
      toast.error("The record could not be created", {
        description: error instanceof Error ? error.message : "This browser could not write the PDF.",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileTextIcon aria-hidden="true" />
          Record
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Local figure record</DialogTitle>
          <DialogDescription>
            A one-page PDF that states the figure title, date, and local project id. This is not a
            legal license, journal approval, or copyright assignment.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-ui">
          <div>
            <dt className="text-caption text-muted-foreground">Figure title</dt>
            <dd>{figureTitle}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">Local project id</dt>
            <dd className="font-mono text-caption tabular-nums">{localId}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button type="button" disabled={busy} onClick={() => void download()}>
            {busy ? (
              <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FileTextIcon aria-hidden="true" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
