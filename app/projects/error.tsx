"use client"

import Link from "next/link"

import { ArrowLeftIcon, AlertTriangleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void error
  return (
    <div className="safe-area-shell min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-4xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <Empty className="border border-dashed bg-surface/60 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangleIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Unable to load projects</EmptyTitle>
            <EmptyDescription>
              The project index could not be prepared. Try again or return to the workbench.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={reset}>Try again</Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  <ArrowLeftIcon aria-hidden="true" />
                  Go home
                </Link>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  )
}
