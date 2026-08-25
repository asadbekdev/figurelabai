import { AppShell } from "@/components/product/app-shell"
import { VectorCanvasEditor } from "@/components/product/vector-canvas-editor"

type PageProps = { params: Promise<{ documentId: string }> }

export default async function VectorCanvasDocumentPage({ params }: PageProps) {
  const { documentId } = await params
  return (
    <AppShell headerLabel="Vector canvas">
      <VectorCanvasEditor documentId={documentId} />
    </AppShell>
  )
}
