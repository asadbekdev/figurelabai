import { FigureLabShell } from "@/components/product/app-screens"
import { TemplateGallery } from "@/components/product/template-gallery"

export default function TemplatesPage() {
  return (
    <FigureLabShell activeHref="/templates" title="Templates">
      <TemplateGallery />
    </FigureLabShell>
  )
}
