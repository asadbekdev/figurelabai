"use client"

import { useState } from "react"
import { Loader2Icon, LockIcon } from "@/components/icons"

import { Button } from "@/components/align/button"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { ApiRequestError, postJson } from "@/lib/api/client"
import { renderFlowchartSvg } from "@/lib/flowchart/svg"
import type { ShareRecord } from "@/lib/sharing/contracts"

function downloadFilename(title: string, extension: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return `${slug || "figure"}.${extension}`
}

export function ShareUnlock({
  token,
  title,
}: {
  token: string
  title: string
}) {
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<Pick<
    ShareRecord,
    "title" | "mode" | "image" | "document" | "messages" | "createdAt"
  > | null>(null)

  async function unlock() {
    const submittedPassword = password.trim()
    if (!submittedPassword) {
      setError("Enter the share password.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await postJson<NonNullable<typeof record>>(`/api/share/${token}/unlock`, {
        password: submittedPassword,
      })
      setRecord(next)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "That password could not be checked."
      )
    } finally {
      setBusy(false)
    }
  }

  if (record) {
    const svg =
      record.mode === "flowchart" && record.document
        ? renderFlowchartSvg(record.document, { background: "document" })
        : null
    const dataUrl =
      svg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        : record.image?.dataUrl ?? ""
    const extension = svg || record.image?.mimeType.includes("svg") ? "svg" : record.image?.mimeType.includes("jpeg") ? "jpg" : "png"
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-title text-balance">{record.title}</h1>
          <p className="text-caption text-hollow">Unlocked · Read-only</p>
        </div>
        {svg ? (
          <figure className="overflow-x-auto rounded-lg border border-border/70 bg-sidebar">
            <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          </figure>
        ) : dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={record.title} className="mx-auto max-h-[70svh] w-auto rounded-lg bg-sidebar" />
        ) : (
          <p className="text-meta text-muted-foreground">This share has no figure image.</p>
        )}
        {dataUrl ? (
          <div className="flex justify-end">
            <a
              href={dataUrl}
              download={downloadFilename(record.title, extension)}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border/70 px-3 text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Download {extension.toUpperCase()}
            </a>
          </div>
        ) : null}
        {record.messages.length > 0 ? (
          <section aria-labelledby="unlocked-share-thread-title" className="space-y-3">
            <h2 id="unlocked-share-thread-title" className="text-ui font-medium">
              Conversation
            </h2>
            <ol className="space-y-3">
              {record.messages.map((message, index) => (
                <li
                  key={`${message.createdAt}-${index}`}
                  className={
                    message.authorType === "user"
                      ? "ms-auto max-w-xl rounded-lg bg-muted px-4 py-3 text-body whitespace-pre-wrap"
                      : "me-auto max-w-xl text-body whitespace-pre-wrap"
                  }
                >
                  <span className="mb-1 block text-caption text-hollow">
                    {message.authorType === "user" ? "User" : "FigureLab"}
                  </span>
                  {message.content}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    )
  }

  return (
    <form
      className="mx-auto max-w-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void unlock()
      }}
    >
      <div className="space-y-2">
        <h1 className="text-title text-balance">{title}</h1>
        <p className="text-meta text-muted-foreground">This shared figure is password protected.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="share-unlock-password">Password</Label>
        <Input
          id="share-unlock-password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "share-unlock-error" : undefined}
          onChange={(event) => {
            setPassword(event.target.value)
            if (error) setError(null)
          }}
        />
      </div>
      {error ? (
        <p id="share-unlock-error" className="text-meta text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? (
          <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <LockIcon aria-hidden="true" />
        )}
        Unlock
      </Button>
    </form>
  )
}
