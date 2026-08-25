"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent, type ReactNode } from "react"

import { Button } from "@/components/align/button"
import {
  ArrowUpRightIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  CheckIcon,
  FlowchartIcon,
  Layers3Icon,
  MenuIcon,
  MessageSquareIcon,
  PencilIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons"
import { cn } from "@/lib/align/utils"

const navItems = [
  { href: "#product", label: "Product" },
  { href: "#workflow", label: "How it works" },
  { href: "#use-cases", label: "Use cases" },
  { href: "/api", label: "API" },
] as const

const capabilities = [
  {
    id: "plan",
    label: "Review the plan",
    eyebrow: "01 · Plan before generation",
    title: "Catch the wrong interpretation before it becomes a figure.",
    description:
      "FigureLab turns a rough request into a structured plan. Check the title, direction, sections, and assumptions before any nodes are drawn.",
    image: "/marketing/figurelab-plan-review.jpg",
    alt: "FigureLab generation plan review with title, goal, orientation, and approval controls",
    icon: MessageSquareIcon,
    points: ["Nothing is generated without approval", "Edit the plan in place", "Keep the reasoning visible"],
  },
  {
    id: "edit",
    label: "Edit every object",
    eyebrow: "02 · Work on a real canvas",
    title: "The first draft is a starting point, not a flattened image.",
    description:
      "Move nodes, rewrite labels, reconnect steps, inspect every object, and request revisions without rebuilding the figure from scratch.",
    image: "/marketing/figurelab-workspace.jpg",
    alt: "FigureLab editor showing an editable PCR workflow, object inspector, and revision composer",
    icon: PencilIcon,
    points: ["Editable nodes and connections", "Object-level inspector", "Revision history stays attached"],
  },
  {
    id: "export",
    label: "Verify and export",
    eyebrow: "03 · Publication readiness",
    title: "Check structure, save a version, and export with confidence.",
    description:
      "Run readiness checks, resolve warnings, save a named revision, then export clean SVG or high-resolution PNG from the same workspace.",
    image: "/marketing/figurelab-workspace.jpg",
    alt: "FigureLab workspace with export, version, and publication controls",
    icon: CheckCircle2Icon,
    points: ["Readiness checks before export", "Named project revisions", "SVG and PNG output"],
  },
] as const

const workflow = [
  ["Input", "Describe the process, pathway, study flow, or source material in plain language."],
  ["Plan", "Review FigureLab’s interpretation and correct the structure before generation."],
  ["Edit", "Move nodes, reconnect steps, rewrite labels, and request targeted revisions."],
  ["Export", "Run readiness checks, save a version, and export clean SVG or PNG."],
] as const

const examplePrompts = [
  "PCR workflow with a QC retry",
  "PRISMA study-selection flow",
  "Clinical trial participant pathway",
  "Model training and evaluation loop",
] as const

const productProof = [
  ["Plan", "Approve the logic first"],
  ["Canvas", "Edit every object"],
  ["Versions", "Keep revision history"],
  ["Export", "SVG and PNG output"],
] as const

const useCases = [
  ["Protocols & methods", "Turn procedural steps into a figure your team can review and revise."],
  ["Study designs", "Map cohorts, exclusions, branches, and endpoints without losing the underlying logic."],
  ["Model architectures", "Explain data flow and system behavior with a clear, editable hierarchy."],
  ["Scientific pathways", "Translate dense mechanisms into structured visuals ready for the next revision."],
] as const

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-regular-xs">
        <FlowchartIcon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-heading text-foreground">
        FigureLab<span className="text-primary">.</span>
      </span>
    </span>
  )
}

function Reveal({
  children,
  delay = 0,
  amount = 0.18,
  className,
}: {
  children: ReactNode
  delay?: number
  amount?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [landingPrompt, setLandingPrompt] = useState("")
  const [activeCapability, setActiveCapability] = useState<(typeof capabilities)[number]["id"]>("plan")
  const reduceMotion = useReducedMotion()
  const active = capabilities.find((item) => item.id === activeCapability) ?? capabilities[0]

  function startFromLanding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = landingPrompt.trim()
    if (!prompt) return
    router.push(`/create?prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="marketing-light min-h-svh overflow-x-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-background px-3 py-2 text-ui shadow-overlay focus:translate-y-0"
      >
        Skip to content
      </a>

      <div className="flex min-h-9 items-center justify-center bg-foreground px-5 py-2 text-center text-caption text-background/80">
        <span className="text-background">Flowchart Release 1 is live.</span>
        <Link className="ml-2 inline-flex items-center gap-1 text-background underline-offset-4 hover:underline" href="/create">
          Start a local draft
          <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <header className="sticky top-0 z-50 border-b border-transparent bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="FigureLab home">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="text-ui text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">Projects</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/create">
                Create a figure
                <ArrowUpRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <Button
            className="md:hidden"
            variant="ghost"
            size="icon-sm"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {mobileMenuOpen ? (
            <motion.nav
              id="mobile-navigation"
              aria-label="Mobile navigation"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute inset-x-0 top-full border-y bg-background p-4 shadow-regular-sm md:hidden"
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    className="rounded-lg px-3 py-2.5 text-ui text-muted-foreground hover:bg-muted hover:text-foreground"
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-border" />
                <Button asChild>
                  <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
                    Create a figure
                  </Link>
                </Button>
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>

      <main id="main-content">
        <section className="relative isolate overflow-hidden px-5 pb-24 pt-16 text-center sm:pt-24 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[760px] max-w-7xl bg-[radial-gradient(circle_at_center,var(--accent),transparent_58%)]"
          />
          <Reveal>
            <div className="mx-auto inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-caption text-muted-foreground">
              <span className="rounded-md bg-background px-1.5 py-0.5 text-subheading text-primary shadow-regular-xs">R1</span>
              Review-first scientific figure generation
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-[2.75rem] font-medium leading-[1.06] tracking-[-0.04em] sm:text-6xl sm:leading-[1.04] lg:text-[4.5rem]">
              Scientific flowcharts,
              <span className="block text-muted-foreground">made editable.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-body text-muted-foreground sm:text-lg sm:leading-7">
              Turn a protocol, study design, or research workflow into a reviewable plan and an editable figure.
            </p>
          </Reveal>

          <Reveal delay={0.08} amount={0.03} className="mx-auto mt-10 max-w-3xl">
            <form
              className="rounded-2xl bg-background p-2 text-left shadow-regular-md ring-1 ring-border"
              aria-label="Create a scientific flowchart"
              onSubmit={startFromLanding}
            >
              <label className="sr-only" htmlFor="landing-prompt">Describe the scientific flowchart you want to create</label>
              <textarea
                id="landing-prompt"
                name="prompt"
                value={landingPrompt}
                onChange={(event) => setLandingPrompt(event.target.value)}
                placeholder="Describe a process, pathway, or study flow…"
                className="min-h-32 w-full resize-none bg-transparent px-4 py-3 text-body text-foreground outline-none placeholder:text-hollow sm:min-h-36 sm:px-5 sm:py-4 sm:text-lg"
              />
              <div className="flex items-center justify-between gap-3 border-t px-2 py-2 sm:px-3">
                <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-caption text-muted-foreground">
                  <FlowchartIcon className="size-4 text-primary" aria-hidden="true" />
                  Flowchart
                </span>
                <Button type="submit" size="icon" disabled={!landingPrompt.trim()} aria-label="Create flowchart from prompt">
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Example flowchart prompts">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setLandingPrompt(prompt)}
                  className="rounded-full bg-background px-3 py-2 text-caption text-muted-foreground shadow-regular-xs ring-1 ring-border transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <p className="mt-4 text-caption text-hollow">No account required for a local first draft.</p>
          </Reveal>
        </section>

        <section aria-label="FigureLab product capabilities" className="border-y bg-background px-5 lg:px-8">
          <div className="mx-auto grid max-w-7xl divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {productProof.map(([label, value]) => (
              <div key={label} className="px-5 py-6 text-left first:pl-0 last:pr-0 sm:text-center">
                <p className="text-subheading text-primary">{label}</p>
                <p className="mt-1 text-ui text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="product" className="scroll-mt-20 bg-muted px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 text-caption text-muted-foreground shadow-regular-xs">
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    Built for revision
                  </span>
                  <h2 className="mt-5 max-w-xl text-4xl font-medium leading-tight tracking-[-0.035em] sm:text-5xl">
                    The work between the prompt and the export matters.
                  </h2>
                </div>
                <p className="max-w-xl text-body text-muted-foreground lg:justify-self-end">
                  Most generators hide their assumptions and flatten the result. FigureLab makes the plan reviewable, the canvas editable, and the final checks explicit.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="flex flex-col gap-2" role="group" aria-label="FigureLab capabilities">
                {capabilities.map((item) => {
                  const Icon = item.icon
                  const selected = item.id === active.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setActiveCapability(item.id)}
                      className={cn(
                        "group flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 text-left shadow-regular-xs ring-1 motion-safe:transition-[background-color,color,box-shadow,transform] motion-safe:duration-150",
                        selected
                          ? "bg-foreground text-background ring-foreground"
                          : "bg-background text-muted-foreground ring-border hover:-translate-y-0.5 hover:text-foreground hover:shadow-regular-sm"
                      )}
                    >
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", selected ? "bg-background/10 text-background" : "bg-accent text-primary")}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-ui">{item.label}</span>
                      <ArrowUpRightIcon className="ml-auto size-4 opacity-60" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>

              <div id="capability-panel" aria-live="polite" className="overflow-hidden rounded-2xl bg-background shadow-regular-sm ring-1 ring-border">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
                      <div>
                        <p className="text-subheading text-primary">{active.eyebrow}</p>
                        <h3 className="mt-3 text-2xl font-medium leading-8 tracking-[-0.025em]">{active.title}</h3>
                        <p className="mt-4 text-caption text-muted-foreground">{active.description}</p>
                        <div className="mt-6 flex flex-col gap-3">
                          {active.points.map((point) => (
                            <span key={point} className="flex items-center gap-2 text-ui">
                              <CheckIcon className="size-4 text-success" aria-hidden="true" />
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl bg-muted shadow-regular-xs ring-1 ring-border">
                        <Image
                          src={active.image}
                          alt={active.alt}
                          width={1280}
                          height={800}
                          loading="eager"
                          className="h-auto w-full"
                          sizes="(max-width: 1024px) 100vw, 720px"
                        />
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="text-center">
              <span className="inline-flex rounded-lg bg-muted px-2.5 py-1.5 text-caption text-muted-foreground">A visible workflow</span>
              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.035em] sm:text-5xl">
                From research input to export in four visible steps.
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {workflow.map(([title, description], index) => (
                <Reveal key={title} delay={index * 0.05}>
                  <article className="min-h-56 rounded-2xl bg-muted p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-lg bg-background text-ui text-primary shadow-regular-xs ring-1 ring-border">0{index + 1}</span>
                      <span className="text-caption text-hollow">{index < workflow.length - 1 ? "Next" : "Ready"}</span>
                    </div>
                    <h3 className="mt-8 text-xl font-medium tracking-[-0.02em]">{title}</h3>
                    <p className="mt-3 text-caption text-muted-foreground">{description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="scroll-mt-20 px-5 pb-24 lg:px-8">
          <Reveal>
            <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[40px] bg-foreground text-background lg:grid-cols-[0.78fr_1.22fr]">
              <div className="p-8 sm:p-12 lg:p-16">
                <span className="inline-flex items-center gap-2 text-caption text-primary">
                  <SparklesIcon className="size-4" aria-hidden="true" />
                  Scientific communication
                </span>
                <h2 className="mt-5 max-w-md text-4xl font-medium leading-tight tracking-[-0.035em]">Make complex logic easier to inspect.</h2>
                <p className="mt-4 max-w-md text-body text-background/60">
                  FigureLab is for work where structure, labels, and revisions matter as much as the first draft.
                </p>
                <Button className="mt-8" size="lg" asChild>
                  <Link href="/create">
                    Start a figure
                    <ArrowUpRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="border-t border-background/10 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                <div className="divide-y divide-background/10">
                  {useCases.map(([title, description], index) => (
                    <div key={title} className="grid gap-3 py-5 sm:grid-cols-[44px_180px_1fr] sm:items-start sm:gap-5">
                      <span className="text-caption text-background/40">0{index + 1}</span>
                      <h3 className="text-title-sm text-background">{title}</h3>
                      <p className="text-caption text-background/60">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="border-y bg-muted px-5 py-20 lg:px-8">
          <Reveal>
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex items-start gap-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-regular-xs ring-1 ring-border">
                  <Layers3Icon className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-caption text-muted-foreground">Your next figure can stay editable.</p>
                  <h2 className="mt-2 max-w-2xl text-3xl font-medium leading-10 tracking-[-0.03em] sm:text-4xl">Stop rebuilding diagrams every time the science changes.</h2>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="outline" asChild>
                  <Link href="/projects">View projects</Link>
                </Button>
                <Button size="lg" asChild>
                  <Link href="/create">
                    Create a flowchart
                    <ArrowUpRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="px-5 py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b pb-12 lg:grid-cols-[1.4fr_0.65fr_0.65fr]">
            <div>
              <Link href="/" aria-label="FigureLab home"><Brand /></Link>
              <p className="mt-5 max-w-sm text-caption text-muted-foreground">A review-first workspace for editable scientific flowcharts.</p>
              <p className="mt-6 inline-flex items-center gap-2 text-caption text-muted-foreground">
                <CheckCircle2Icon className="size-4 text-success" aria-hidden="true" />
                Flowchart Release 1
              </p>
            </div>
            <div>
              <p className="text-caption text-hollow">Product</p>
              <nav className="mt-4 flex flex-col gap-3" aria-label="Product links">
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="/create">Create</Link>
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="/projects">Projects</Link>
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="/library">Library</Link>
              </nav>
            </div>
            <div>
              <p className="text-caption text-hollow">Explore</p>
              <nav className="mt-4 flex flex-col gap-3" aria-label="Explore links">
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="#product">Product</Link>
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="#workflow">How it works</Link>
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="/api">Local API</Link>
              </nav>
            </div>
          </div>
          <div className="flex flex-col gap-3 py-6 text-caption text-hollow sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} FigureLab. All rights reserved.</p>
            <p>Built for clear scientific communication.</p>
          </div>
          <p aria-hidden="true" className="overflow-hidden text-[clamp(4rem,15vw,12rem)] font-medium leading-none tracking-[-0.06em] text-muted">FigureLab.</p>
        </div>
      </footer>
    </div>
  )
}
