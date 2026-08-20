import { FolderIcon } from "lucide-react"

import { FigureLabShell } from "@/components/product/app-screens"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"

export default function LibraryPage() {
  return (
    <FigureLabShell activeHref="/library" title="Library" subtitle="Saved single-image assets">
      <Empty className="border border-dashed bg-surface/60 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No assets yet</EmptyTitle>
          <EmptyDescription>
            Save figures from a project to organize them into folders and favorites.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Create folder</Button>
        </EmptyContent>
      </Empty>
    </FigureLabShell>
  )
}
