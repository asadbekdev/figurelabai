import { notFound } from "next/navigation"

import { ProjectEditorPageView } from "@/components/product/app-screens"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  if (projectId !== "demo") {
    notFound()
  }

  return <ProjectEditorPageView projectId={projectId} />
}
