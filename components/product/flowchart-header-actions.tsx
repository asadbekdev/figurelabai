"use client"

import { MoreHorizontalIcon } from "@/components/icons"

import { Button } from "@/components/align/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/align/sheet"
import { FlowchartExportDialog } from "@/components/product/flowchart-export-dialog"
import { FlowchartFigureImageDialog } from "@/components/product/flowchart-figure-image-dialog"
import { FlowchartImportButton } from "@/components/product/flowchart-import-button"
import { FlowchartSaveToLibrary } from "@/components/product/flowchart-save-library"
import { ProjectSaveStatus } from "@/components/product/project-save-status"
import { FlowchartShareDialog } from "@/components/product/share-dialog"

export function FlowchartHeaderActions() {
  return (
    <>
      <div className="flex max-w-20 items-center sm:max-w-none">
        <ProjectSaveStatus />
      </div>

      <div className="hidden 2xl:contents">
        <FlowchartSaveToLibrary />
        <FlowchartShareDialog />
        <FlowchartFigureImageDialog />
        <FlowchartImportButton />
      </div>

      <div className="2xl:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="More figure actions"
            >
              <MoreHorizontalIcon aria-hidden="true" />
              <span className="hidden sm:inline">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-sm p-0 sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Figure actions</SheetTitle>
              <SheetDescription>
                Save, share, import, or create an image from this flowchart.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2 px-4 pb-4 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:justify-start">
              <FlowchartSaveToLibrary />
              <FlowchartShareDialog />
              <FlowchartFigureImageDialog />
              <FlowchartImportButton />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <FlowchartExportDialog />
    </>
  )
}
