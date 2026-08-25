import type { Metadata } from "next"

import { WorkbenchPageView } from "@/components/product/app-screens"

export const metadata: Metadata = {
  title: "Create a flowchart",
  description: "Describe a scientific process, approve its plan, and create an editable flowchart.",
}

export default function CreatePage() {
  return <WorkbenchPageView />
}
