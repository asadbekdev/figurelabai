import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: "Editable scientific flowcharts",
  description:
    "Describe the figure, approve the plan, edit every part, and export a result you can publish.",
}

export default function Home() {
  return <LandingPage />
}
