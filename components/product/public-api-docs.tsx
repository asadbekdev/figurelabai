"use client"

import { useState, type ReactNode } from "react"
import { CheckIcon, CopyIcon, FileTextIcon } from "@/components/icons"

import { PageIndex, PageIndexHeader } from "@/components/product/page-index"
import { Button } from "@/components/align/button"

const CREATE_EXAMPLE = `curl -sS http://localhost:3000/api/v1/figures \\
  -H 'Content-Type: application/json' \\
  -d '{
    "prompt": "Draw a labeled three-step PCR workflow.",
    "mode": "illustration",
    "offering": "fixture"
  }'`

const POLL_EXAMPLE = `curl -sS http://localhost:3000/api/v1/figures/JOB_ID`

const IMAGE_EXAMPLE = `{
  "prompt": "Turn this sketch into a journal figure.",
  "mode": "illustration",
  "offering": "fixture",
  "image": {
    "mimeType": "image/png",
    "data": "BASE64_BYTES"
  }
}`

function CopyBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle")

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus("copied")
      window.setTimeout(() => setCopyStatus("idle"), 1_600)
    } catch {
      setCopyStatus("failed")
      window.setTimeout(() => setCopyStatus("idle"), 2_400)
    }
  }

  const buttonLabel =
    copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`${buttonLabel} ${label.toLowerCase()} example`}
          onClick={() => void copy()}
        >
          {copyStatus === "copied" ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
          {buttonLabel}
        </Button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {copyStatus === "copied"
          ? `${label} example copied to the clipboard.`
          : copyStatus === "failed"
            ? `Unable to copy the ${label.toLowerCase()} example. Select the code and copy it manually.`
            : ""}
      </p>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-caption">
        {value}
      </pre>
    </div>
  )
}

function Field({
  name,
  children,
}: {
  name: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <dt className="font-mono text-caption">{name}</dt>
      <dd className="text-caption text-muted-foreground">{children}</dd>
    </div>
  )
}

export function PublicApiDocs() {
  return (
    <PageIndex>
      <PageIndexHeader
        icon={<FileTextIcon aria-hidden="true" />}
        title="Local API"
        description="HTTP access to the same JobRunner path the composer uses. No account. No Stripe."
      />

      <section className="space-y-3">
        <h2 className="text-title-sm">Create a figure</h2>
        <p className="text-caption text-muted-foreground">
          POST /api/v1/figures returns a job id and pollUrl. Poll until status
          is succeeded, failed, or canceled.
        </p>
        <CopyBlock label="Create" value={CREATE_EXAMPLE} />
        <CopyBlock label="Poll" value={POLL_EXAMPLE} />
      </section>

      <section className="space-y-3">
        <h2 className="text-title-sm">Body</h2>
        <dl className="space-y-3">
          <Field name="prompt">
            Text description. At least 8 characters unless you send image or
            tabularData.
          </Field>
          <Field name="mode">
            illustration (default), flowchart, or plot. Flowchart plans on the
            server, then drafts nodes. Plot accepts optional tabularData.
          </Field>
          <Field name="image">
            Optional source. Object with mimeType (image/png, image/jpeg,
            image/webp, or image/svg+xml) and base64 data — not a data URL.
          </Field>
          <Field name="offering">
            nano-banana (Gemini 2.5 Flash Image), nano-banana-pro (Gemini 3 Pro
            Image), nano-banana-2 (Gemini 3.1 Flash Image), or fixture. Those
            Nano Banana names are the official Gemini image models.
          </Field>
          <Field name="modelProvider">
            gemini or fixture. Omit to follow offering, then the server
            environment.
          </Field>
        </dl>
        <CopyBlock label="Optional image" value={IMAGE_EXAMPLE} />
      </section>

      <section className="space-y-3">
        <h2 className="text-title-sm">Response</h2>
        <p className="text-caption text-muted-foreground">
          Envelope is ok / data / requestId, same as the rest of the app. data.figure
          includes id, status, pollUrl, provider, and result when finished.
          Illustration and plot results are kind: image with a dataUrl.
          Flowchart results are kind: flowchart with the document.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-title-sm">Not the same as FigureLabs</h2>
        <ul className="list-disc space-y-1.5 ps-5 text-caption text-muted-foreground">
          <li>No hosted API product, billed keys, or vendor routing.</li>
          <li>Image models are Nano Banana / Nano Banana Pro / Nano Banana 2, or fixture.</li>
          <li>No 8K upscale, auth, teams, or Stripe.</li>
        </ul>
      </section>
    </PageIndex>
  )
}
