"use client"

import { DownloadIcon, ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SessionGeneratedImage } from "@/lib/generation/session-store"

export function GeneratedImageCard({
  image,
}: {
  image: SessionGeneratedImage
}) {
  function download() {
    const anchor = document.createElement("a")
    const extension = image.mimeType.includes("jpeg") ? "jpg" : "png"
    anchor.href = image.dataUrl
    anchor.download = `figurelab-illustration.${extension}`
    anchor.click()
  }

  return (
    <Card className="surface-outline overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-4" aria-hidden="true" />
          Generated illustration
        </CardTitle>
        <CardDescription>{image.prompt}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.dataUrl}
          alt={image.prompt}
          className="image-outline w-full rounded-xl bg-surface-subtle"
        />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <DownloadIcon aria-hidden="true" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
