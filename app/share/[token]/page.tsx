import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ShareUnlock } from "@/components/product/share-unlock"
import { Badge } from "@/components/align/badge"
import { renderFlowchartSvg } from "@/lib/flowchart/svg"
import type { ShareRecord } from "@/lib/sharing/contracts"
import { getShareStore } from "@/lib/sharing/runtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type PageProps = { params: Promise<{ token: string }> }

function modeLabel(mode: ShareRecord["mode"]): string {
  if (mode === "flowchart") return "Flowchart"
  if (mode === "plot") return "Plot"
  return "Illustration"
}

function shareDate(createdAt: string): string {
  return createdAt.slice(0, 10)
}

function figureMarkup(record: ShareRecord): { html?: string; dataUrl: string; extension: string } {
  if (record.mode === "flowchart" && record.document) {
    const svg = renderFlowchartSvg(record.document, { background: "document" })
    return {
      html: svg.replace(/^<\?xml[^?]*\?>/, ""),
      dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
      extension: "svg",
    }
  }

  const image = record.image
  const extension = image?.mimeType.includes("svg")
    ? "svg"
    : image?.mimeType.includes("jpeg")
      ? "jpg"
      : "png"
  return { dataUrl: image?.dataUrl ?? "", extension }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const record = await getShareStore().get(token)
  return {
    title: record ? `${record.title} — shared FigureLab figure` : "Shared FigureLab figure",
    robots: { index: false, follow: false },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const record = await getShareStore().get(token)
  if (!record) notFound()

  if (record.passwordProtected) {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
          <header>
            <Link
              href="/"
              className="rounded-lg text-ui font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              FigureLab
            </Link>
          </header>
          <ShareUnlock token={record.token} title={record.title} />
        </div>
      </main>
    )
  }

  const figure = figureMarkup(record)
  const filename = `${record.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) || "figure"}.${figure.extension}`

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-lg text-ui font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            FigureLab
          </Link>
          <Badge variant="secondary">Shared copy</Badge>
        </header>

        <div className="space-y-2">
          <h1 className="text-title text-balance">{record.title}</h1>
          <p className="text-caption text-hollow">
            {modeLabel(record.mode)} · Shared {shareDate(record.createdAt)} · Read-only
          </p>
        </div>

        <figure className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-sidebar">
            {figure.html ? (
              <div
                className="[&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: figure.html }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={figure.dataUrl}
                alt={record.title}
                className="mx-auto max-h-[70svh] w-auto"
              />
            )}
          </div>
          <div className="flex justify-end">
            <a
              href={figure.dataUrl}
              download={filename}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border/70 px-3 text-ui outline-none motion-safe:transition-[background-color] motion-safe:duration-150 hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Download {figure.extension.toUpperCase()}
            </a>
          </div>
        </figure>

        {record.messages.length > 0 ? (
          <section aria-labelledby="share-thread-title" className="space-y-3">
            <h2 id="share-thread-title" className="text-ui font-medium">
              Conversation
            </h2>
            <ol className="space-y-3">
              {record.messages.map((message, index) => (
                <li
                  key={index}
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

        <footer className="border-t border-border/70 pt-4">
          <p className="text-caption text-hollow">
            This is a read-only shared copy.{" "}
            <Link
              href="/"
              className="underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Create your own figure
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  )
}
