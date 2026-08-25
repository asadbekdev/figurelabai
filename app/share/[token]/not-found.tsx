import Link from "next/link"
import { ArrowLeftIcon, FileTextIcon } from "@/components/icons"

import { Button } from "@/components/align/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/align/empty"

export default function ShareNotFound() {
  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-4 py-12 sm:px-6">
        <Empty className="border border-dashed border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Shared figure not found</EmptyTitle>
            <EmptyDescription>
              This link may be incomplete, expired, or removed by its owner.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">
                <ArrowLeftIcon aria-hidden="true" />
                Go to FigureLab
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  )
}
