"use client"

import { SparklesIcon } from "@/components/icons"

import type { ProjectThread } from "@/lib/product/workspace-types"
import { cn } from "@/lib/utils"

export function ProjectThreadView({
  thread,
}: {
  thread: ProjectThread | null
}) {
  if (!thread || (thread.messages.length === 0 && !thread.prompt)) return null

  const messages =
    thread.messages.length > 0
      ? thread.messages
      : thread.prompt
        ? [
            {
              id: "prompt",
              authorType: "user" as const,
              content: thread.prompt,
              createdAt: thread.updatedAt,
            },
          ]
        : []

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {thread.plan ? (
        <p className="text-caption text-hollow">
          Plan · {thread.plan.title} · {thread.plan.structure.primaryDirection}
        </p>
      ) : null}
      {messages.map((item) => (
        <article
          key={item.id}
          className={cn(
            "max-w-xl text-body",
            item.authorType === "user"
              ? "ms-auto rounded-lg bg-muted px-4 py-3 whitespace-pre-wrap"
              : "me-auto whitespace-pre-wrap text-pretty"
          )}
        >
          {item.authorType !== "user" ? (
            <p className="mb-2 flex items-center gap-1.5 text-caption text-hollow">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              FigureLab
            </p>
          ) : null}
          {item.content}
        </article>
      ))}
    </div>
  )
}
