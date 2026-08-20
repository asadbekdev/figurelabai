import { SquareStackIcon } from "lucide-react"

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

export default function VectorCanvasPage() {
  return (
    <FigureLabShell
      activeHref="/vector-canvas"
      title="Vector Canvas"
      subtitle="Manage and edit vectorized figures"
    >
      <Empty className="border border-dashed bg-surface/60 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SquareStackIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No vector canvases yet</EmptyTitle>
          <EmptyDescription>
            Vectorized outputs and imported images will live here once the workflow is connected.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Open canvas</Button>
        </EmptyContent>
      </Empty>
    </FigureLabShell>
  )
}
