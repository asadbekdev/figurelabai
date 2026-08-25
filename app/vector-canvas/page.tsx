import { FigureLabShell } from "@/components/product/app-screens"
import { VectorCanvasList } from "@/components/product/vector-canvas-list"

export default function VectorCanvasPage() {
  return (
    <FigureLabShell
      activeHref="/vector-canvas"
      title="Vector canvas"
      subtitle="Manage and edit vectorized figures"
    >
      <VectorCanvasList />
    </FigureLabShell>
  )
}
