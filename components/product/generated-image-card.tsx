"use client"

import { DownloadIcon, ImageIcon } from "@/components/icons"

import { Button } from "@/components/align/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/align/card"
import type { SessionGeneratedImage } from "@/lib/generation/session-store"

export function GeneratedImageCard({
  image,
  href,
  onOpen,
  openLabel = "Open figure",
  actions,
}: {
  image: SessionGeneratedImage
  href?: string
  onOpen?: () => void
  openLabel?: string
  actions?: React.ReactNode
}) {
  function download() {
    const anchor = document.createElement("a")
    const extension = image.mimeType.includes("svg")
      ? "svg"
      : image.mimeType.includes("jpeg")
        ? "jpg"
        : "png"
    anchor.href = image.dataUrl
    anchor.download = `figurelab-figure.${extension}`
    anchor.click()
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-4" aria-hidden="true" />
          Generated figure
        </CardTitle>
        <CardDescription>{image.prompt}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.dataUrl}
          alt={image.prompt}
          className="image-outline w-full rounded-lg bg-sidebar"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          {href || onOpen ? (
            href && !onOpen ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={href}>{openLabel}</a>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={onOpen}>
                {openLabel}
              </Button>
            )
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <DownloadIcon aria-hidden="true" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
