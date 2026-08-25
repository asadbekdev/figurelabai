import { FigureLabShell } from "@/components/product/app-screens"
import { LibraryAssets } from "@/components/product/library-assets"

export default function LibraryPage() {
  return (
    <FigureLabShell activeHref="/library" title="Library">
      <LibraryAssets />
    </FigureLabShell>
  )
}
