"use client"

import { useState } from "react"
import { ImageIcon, Loader2Icon } from "@/components/icons"
import { toast } from "sonner"

import { Button } from "@/components/align/button"
import { useWorkspaceStore } from "@/lib/product/workspace-store"

export function SaveToLibraryButton({
  prompt,
  mimeType,
  dataUrl,
  projectId,
}: {
  prompt: string
  mimeType: string
  dataUrl: string
  projectId?: string | null
}) {
  const addGeneratedImage = useWorkspaceStore((state) => state.addGeneratedImage)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await addGeneratedImage({
        prompt,
        mimeType,
        dataUrl,
        projectId: projectId ?? null,
      })
      toast.success("Saved to library")
    } catch {
      toast.error("The figure could not be saved to the library.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void save()}>
      {saving ? (
        <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <ImageIcon aria-hidden="true" />
      )}
      Save to library
    </Button>
  )
}
