import { notFound } from "next/navigation"

import { ProjectEditorPageView } from "@/components/product/app-screens"
import { isProjectId } from "@/lib/product/workspace-types"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  if (!isProjectId(projectId)) {
    notFound()
  }

  return <ProjectEditorPageView projectId={projectId} />
}
