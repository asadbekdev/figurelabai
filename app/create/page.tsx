import type { Metadata } from "next"

import { WorkbenchPageView } from "@/components/product/app-screens"

export const metadata: Metadata = {
  title: "Create a flowchart",
  description: "Describe a scientific process, approve its plan, and create an editable flowchart.",
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string | string[] }>
}) {
  const rawPrompt = (await searchParams).prompt
  const initialPrompt = (Array.isArray(rawPrompt) ? rawPrompt[0] : rawPrompt)?.slice(0, 1200) ?? ""

  return <WorkbenchPageView initialPrompt={initialPrompt} />
}
