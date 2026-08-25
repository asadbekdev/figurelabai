import { FigureLabShell } from "@/components/product/app-screens"
import { PublicApiDocs } from "@/components/product/public-api-docs"

export default function LocalApiPage() {
  return (
    <FigureLabShell activeHref="/api" title="Local API">
      <PublicApiDocs />
    </FigureLabShell>
  )
}
