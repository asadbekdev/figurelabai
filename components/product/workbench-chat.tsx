"use client"

import { useId, useState } from "react"
import { ArrowUpIcon, LoaderCircleIcon, MessageSquareIcon, SparklesIcon } from "@/components/icons"

import { Alert, AlertDescription, AlertTitle } from "@/components/align/alert"
import { Button } from "@/components/align/button"
import { Label } from "@/components/align/label"
import { ScrollArea } from "@/components/align/scroll-area"
import { Textarea } from "@/components/align/textarea"
import { ApiRequestError, postJson } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { useGenerationSessionStore } from "@/lib/generation/session-store"

type ChatResponse = {
  message: { role: "assistant"; content: string }
}

export function WorkbenchChat({ className }: { className?: string }) {
  const inputId = useId()
  const messages = useGenerationSessionStore((state) => state.chatMessages)
  const appendChat = useGenerationSessionStore((state) => state.appendChat)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const content = draft.trim()
    if (!content || busy) return

    const userMessage = {
      id: `user-${Date.now().toString(36)}`,
      role: "user" as const,
      content,
    }
    const history = [...messages, userMessage].map(({ role, content: text }) => ({
      role,
      content: text,
    }))

    appendChat(userMessage)
    setDraft("")
    setBusy(true)
    setError(null)

    try {
      const result = await postJson<ChatResponse>("/api/generation/chat", {
        messages: history,
      })
      appendChat({
        id: `assistant-${Date.now().toString(36)}`,
        role: "assistant",
        content: result.message.content,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The assistant could not reply. Try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-background p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
          <MessageSquareIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-ui font-medium">Ask FigureLab</h2>
          <p className="mt-1 text-meta text-muted-foreground">
            Critique a figure idea, tighten labels, or check whether a flowchart is the right mode.
          </p>
        </div>
      </div>

      <ScrollArea className="mt-4 h-64 rounded-lg bg-sidebar">
        <div className="space-y-3 p-3">
          {messages.length === 0 && (
            <p className="text-meta text-muted-foreground">
              Ask a question without starting generation. Use Generate above when you want an editable
              flowchart or an illustration.
            </p>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "max-w-[36rem] rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "ms-auto bg-muted"
                  : "border border-border bg-background"
              )}
            >
              <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                {message.role === "assistant" ? (
                  <SparklesIcon className="size-3.5" aria-hidden="true" />
                ) : null}
                {message.role === "user" ? "You" : "FigureLab"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-pretty">{message.content}</p>
            </article>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-meta text-muted-foreground">
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Thinking
            </p>
          )}
        </div>
      </ScrollArea>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>Chat did not complete</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor={inputId} className="sr-only">
            Ask a question
          </Label>
          <Textarea
            id={inputId}
            rows={2}
            value={draft}
            disabled={busy}
            placeholder="Should this PCR workflow be left-to-right or grouped by stage?"
            className="min-h-16 resize-none"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                void send()
              }
            }}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={busy || !draft.trim()}
          aria-label="Send question"
          aria-busy={busy}
        >
          {busy ? (
            <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <ArrowUpIcon aria-hidden="true" />
          )}
        </Button>
      </form>
    </section>
  )
}
