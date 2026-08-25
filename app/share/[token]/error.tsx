"use client"

import Link from "next/link"
import { AlertTriangleIcon, ArrowLeftIcon } from "@/components/icons"

import { Button } from "@/components/align/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/align/empty"

export default function ShareError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-4 py-12 sm:px-6">
        <Empty className="border border-dashed border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangleIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Unable to open this share</EmptyTitle>
            <EmptyDescription>
              The shared figure could not be loaded. Try again before requesting a new link.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  <ArrowLeftIcon aria-hidden="true" />
                  Go to FigureLab
                </Link>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  )
}
