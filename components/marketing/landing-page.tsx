"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import Link from "next/link"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/align/button"
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  FlowchartIcon,
  Layers3Icon,
  MenuIcon,
  PencilIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons"
import { cn } from "@/lib/align/utils"

const navItems = [
  { href: "#features", label: "Product" },
  { href: "#workflow", label: "How it works" },
  { href: "#use-cases", label: "Use cases" },
  { href: "/api", label: "API" },
]

const features = [
  {
    id: "plan",
    tab: "Plan first",
    eyebrow: "Structured generation",
    title: "Approve the logic before a figure is drawn",
    description:
      "FigureLab turns your description into a reviewable plan, so missing steps and wrong assumptions are caught early.",
    icon: SparklesIcon,
  },
  {
    id: "edit",
    tab: "Edit every part",
    eyebrow: "Real canvas control",
    title: "Keep the result editable, not flattened",
    description:
      "Move nodes, rewrite labels, reconnect steps, group objects, and request revisions without starting over.",
    icon: PencilIcon,
  },
  {
    id: "verify",
    tab: "Verify & export",
    eyebrow: "Publication checks",
    title: "Check the figure before it leaves the workspace",
    description:
      "Run readiness checks, save named versions, then export a clean SVG or high-resolution PNG.",
    icon: CheckCircle2Icon,
  },
] as const

const steps = [
  {
    number: "01",
    label: "Describe the logic",
    body: "Start with a process, pathway, study flow, or supported source text.",
    tone: "text-primary",
  },
  {
    number: "02",
    label: "Approve the plan",
    body: "Review the structure, labels, assumptions, and figure direction before generation.",
    tone: "text-success",
  },
  {
    number: "03",
    label: "Edit and export",
    body: "Refine every object, run checks, save a version, and export SVG or PNG.",
    tone: "text-chart-4",
  },
] as const

const useCases = [
  ["Research workflows", "Turn protocols and study processes into clear, reviewable diagrams."],
  ["Study designs", "Map cohorts, branches, exclusions, and endpoints without losing structure."],
  ["Model architectures", "Explain data flow and system logic with an editable visual hierarchy."],
  ["Methods and pathways", "Translate dense scientific logic into a figure your team can revise."],
] as const

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-regular-xs">
        <FlowchartIcon className="size-5" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="text-heading text-foreground">
          FigureLab<span className="text-primary">.</span>
        </span>
      ) : null}
    </span>
  )
}

function Reveal({
  children,
  delay = 0,
  amount = 0.2,
}: {
  children: ReactNode
  delay?: number
  amount?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function ProductPreview() {
  return (
    <div className="mx-auto mt-16 w-full max-w-[1264px] rounded-[40px] bg-muted p-2.5 ring-1 ring-border">
      <div className="overflow-hidden rounded-[30px] bg-background shadow-regular-md ring-1 ring-border">
        <div className="flex h-14 items-center justify-between border-b px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Brand compact />
            <span className="hidden h-5 w-px bg-border sm:block" />
            <p className="truncate text-ui text-muted-foreground">
              PCR extraction workflow <span className="text-hollow">/ Draft 01</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-caption text-muted-foreground sm:inline-flex">
              <CheckIcon className="size-4 text-success" aria-hidden="true" />
              Saved
            </span>
            <Button size="xs" asChild>
              <Link href="/create">Open workspace</Link>
            </Button>
          </div>
        </div>

        <div className="grid min-h-[460px] lg:grid-cols-[184px_minmax(0,1fr)_240px]">
          <aside className="hidden border-r bg-muted/50 p-3 lg:block" aria-label="Preview navigation">
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-background px-2.5 py-2 text-ui shadow-regular-xs ring-1 ring-border">
              <FlowchartIcon className="size-4 text-primary" aria-hidden="true" />
              Flowchart
            </div>
            <p className="px-2 text-subheading text-hollow">Objects</p>
            <div className="mt-2 flex flex-col gap-1">
              {["Start", "Prepare sample", "Run PCR", "Review result"].map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-caption",
                    index === 2 ? "bg-accent text-primary" : "text-muted-foreground"
                  )}
                >
                  <span className="size-2 rounded-sm bg-border" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 border-t pt-4">
              <p className="px-2 text-subheading text-hollow">Versions</p>
              <p className="mt-2 rounded-lg px-2 py-1.5 text-caption text-muted-foreground">
                Draft 01
              </p>
            </div>
          </aside>

          <div className="relative min-h-[380px] overflow-hidden bg-muted/35 sm:min-h-[460px]">
            <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--stroke-soft-200)_1px,transparent_1px)] [background-size:20px_20px]" />
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full text-text-soft-400"
              viewBox="0 0 760 460"
              preserveAspectRatio="none"
            >
              <path d="M150 230 H255" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M370 230 H475" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M585 230 H650" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-5">
              <div className="grid w-full max-w-[680px] grid-cols-[auto_1fr_1fr] items-center gap-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:gap-6">
                <div className="grid size-16 place-items-center rounded-full bg-primary text-ui text-primary-foreground shadow-regular-sm ring-4 ring-background">
                  Start
                </div>
                <div className="rounded-xl bg-background p-4 shadow-regular-sm ring-1 ring-border">
                  <p className="text-subheading text-hollow">Step 01</p>
                  <p className="mt-2 text-title-sm">Prepare sample</p>
                  <p className="mt-1 hidden text-caption text-muted-foreground sm:block">
                    Extract and barcode
                  </p>
                </div>
                <div className="rounded-xl bg-background p-4 shadow-regular-sm ring-2 ring-primary">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-subheading text-primary">Selected</p>
                    <PencilIcon className="size-4 text-primary" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-title-sm">Run PCR</p>
                  <p className="mt-1 hidden text-caption text-muted-foreground sm:block">
                    Amplify target region
                  </p>
                </div>
                <div className="hidden size-16 place-items-center rounded-full bg-background text-center text-ui shadow-regular-sm ring-1 ring-border sm:grid">
                  Review
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-background p-1 shadow-regular-sm ring-1 ring-border">
              <span className="rounded-lg bg-accent px-2.5 py-1.5 text-caption text-primary">100%</span>
              <span className="px-2.5 py-1.5 text-caption text-muted-foreground">4 nodes</span>
            </div>
          </div>

          <aside className="hidden border-l p-4 xl:block" aria-label="Preview inspector">
            <div className="flex items-center justify-between">
              <p className="text-ui">Properties</p>
              <Layers3Icon className="size-4 text-hollow" aria-hidden="true" />
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <label className="text-caption text-muted-foreground">
                Label
                <span className="mt-1.5 block rounded-lg bg-muted px-3 py-2 text-ui text-foreground ring-1 ring-border">
                  Run PCR
                </span>
              </label>
              <label className="text-caption text-muted-foreground">
                Shape
                <span className="mt-1.5 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-ui text-foreground ring-1 ring-border">
                  Process
                  <ChevronRightIcon className="size-4 text-hollow" aria-hidden="true" />
                </span>
              </label>
              <div className="border-t pt-4">
                <p className="text-caption text-muted-foreground">Readiness</p>
                <p className="mt-2 flex items-center gap-2 text-ui">
                  <CheckCircle2Icon className="size-5 text-success" aria-hidden="true" />
                  No blockers found
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function FeaturePreview({ id }: { id: (typeof features)[number]["id"] }) {
  if (id === "plan") {
    return (
      <div className="mt-8 rounded-2xl bg-background p-4 shadow-regular-xs ring-1 ring-border">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-ui">Generation plan</span>
          <span className="rounded-md bg-success-lighter px-2 py-1 text-caption text-success">Ready</span>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {["Prepare the sample", "Amplify the target", "Review the result"].map((item, index) => (
            <div key={item} className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-lg bg-muted text-caption text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-caption text-foreground">{item}</span>
              <CheckIcon className="ml-auto size-4 text-success" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (id === "edit") {
    return (
      <div className="relative mt-8 h-[210px] overflow-hidden rounded-2xl bg-background shadow-regular-xs ring-1 ring-border">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--stroke-soft-200)_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute left-5 top-16 rounded-xl bg-background px-4 py-3 text-ui shadow-regular-xs ring-1 ring-border">
          Prepare
        </div>
        <div className="absolute right-5 top-16 rounded-xl bg-background px-4 py-3 text-ui shadow-regular-xs ring-2 ring-primary">
          Analyze
        </div>
        <div className="absolute left-1/2 top-[84px] h-px w-16 -translate-x-1/2 bg-border" />
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-xl bg-background p-1 shadow-regular-sm ring-1 ring-border">
          <span className="rounded-lg bg-accent px-2.5 py-1.5 text-caption text-primary">Move</span>
          <span className="px-2.5 py-1.5 text-caption text-muted-foreground">Connect</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl bg-background p-4 shadow-regular-xs ring-1 ring-border">
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="grid size-9 place-items-center rounded-lg bg-success-lighter text-success">
          <CheckCircle2Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-ui">Publication check passed</p>
          <p className="text-caption text-muted-foreground">No blockers or warnings</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/create">
            <DownloadIcon aria-hidden="true" /> SVG
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/create">
            <DownloadIcon aria-hidden="true" /> PNG
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function LandingPage() {
  const [announcementOpen, setAnnouncementOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState<(typeof features)[number]["id"]>("plan")
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-svh overflow-x-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-background px-3 py-2 text-ui shadow-overlay focus:translate-y-0"
      >
        Skip to content
      </a>

      <AnimatePresence initial={false}>
        {announcementOpen ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { display: "none" } : { height: 0, opacity: 0 }}
            className="overflow-hidden bg-muted"
          >
            <div className="relative mx-auto flex min-h-10 max-w-7xl items-center justify-center px-12 py-2 text-center text-caption text-muted-foreground">
              <span>Flowchart Release 1 is live</span>
              <Link className="ml-2 inline-flex items-center gap-1 text-primary hover:underline" href="/create">
                Create an editable figure
                <ArrowUpRightIcon className="size-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setAnnouncementOpen(false)}
                className="absolute right-4 grid size-7 place-items-center rounded-lg text-hollow hover:bg-background hover:text-foreground"
                aria-label="Dismiss announcement"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header className="relative z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="FigureLab home">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="text-ui text-muted-foreground hover:text-foreground"
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
              <Link href="/create">Create a flowchart</Link>
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
              className="absolute inset-x-0 top-full border-b bg-background p-4 shadow-regular-sm md:hidden"
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
                    Create a flowchart
                  </Link>
                </Button>
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>

      <main id="main-content">
        <section className="px-5 pb-20 pt-16 text-center sm:pt-20 lg:px-8">
          <Reveal>
            <Link
              href="#workflow"
              className="mx-auto inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-caption text-muted-foreground hover:text-foreground"
            >
              <span className="rounded-md bg-accent px-1.5 py-0.5 text-subheading text-primary">New</span>
              Flowchart Release 1
              <ArrowUpRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <h1 className="mx-auto mt-5 max-w-4xl text-[2.625rem] font-medium leading-[1.08] tracking-[-0.035em] sm:text-6xl sm:leading-[1.05]">
              From research logic to an editable figure
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-body text-muted-foreground sm:text-lg sm:leading-7">
              Describe the figure, approve the plan, edit every part, and export a result you can publish.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/create">
                  Create a flowchart
                  <ArrowUpRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="#workflow">See how it works</Link>
              </Button>
            </div>
            <div className="mx-auto mt-14 flex max-w-4xl flex-col items-center justify-center gap-3 text-caption text-muted-foreground sm:flex-row sm:gap-8">
              {["Plan before generation", "Every object stays editable", "SVG and PNG export"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-primary" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1} amount={0.05}>
            <ProductPreview />
          </Reveal>
        </section>

        <section id="features" className="scroll-mt-20 px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-caption text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Built for revision
                </span>
                <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.03em] sm:text-5xl">
                  Control the figure from first draft to final export
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-body text-muted-foreground">
                  A generation workflow that makes the important decisions visible instead of hiding them behind one prompt.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Product capabilities">
              {features.map((feature) => {
                const Icon = feature.icon
                const active = activeFeature === feature.id
                return (
                  <button
                    key={feature.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveFeature(feature.id)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-ui shadow-regular-xs ring-1 motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-150",
                      active
                        ? "bg-accent text-primary ring-transparent"
                        : "bg-background text-muted-foreground ring-border hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {feature.tab}
                  </button>
                )
              })}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                const active = activeFeature === feature.id
                return (
                  <motion.article
                    key={feature.id}
                    id={`feature-${feature.id}`}
                    aria-label={feature.tab}
                    animate={reduceMotion ? undefined : { y: active ? -4 : 0 }}
                    className={cn(
                      "rounded-3xl bg-muted p-6 ring-1 motion-safe:transition-[box-shadow,background-color] motion-safe:duration-200",
                      active ? "shadow-regular-sm ring-primary/20" : "ring-transparent"
                    )}
                  >
                    <span className="grid size-12 place-items-center rounded-xl bg-background text-primary shadow-regular-xs ring-1 ring-border">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <p className="mt-6 text-subheading text-primary">{feature.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-medium leading-7 tracking-[-0.02em]">{feature.title}</h3>
                    <p className="mt-3 text-body text-muted-foreground">{feature.description}</p>
                    <FeaturePreview id={feature.id} />
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
                <div>
                  <span className="inline-flex rounded-lg bg-muted px-2.5 py-1.5 text-caption text-muted-foreground">
                    Clear, reviewable, editable
                  </span>
                  <h2 className="mt-4 max-w-xl text-4xl font-medium leading-tight tracking-[-0.03em]">
                    Build a publishable flowchart in 3 steps
                  </h2>
                </div>
                <div className="lg:pb-1">
                  <p className="max-w-md text-body text-muted-foreground">
                    Move from a rough process description to a structured figure while keeping the reasoning visible.
                  </p>
                  <Link href="/create" className="mt-5 inline-flex items-center gap-1 text-ui hover:text-primary">
                    Start a figure
                    <ArrowUpRightIcon className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-3 lg:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal key={step.number} delay={index * 0.06}>
                  <article className="relative min-h-[220px] rounded-3xl bg-muted p-7 sm:grid sm:grid-cols-[52px_1fr] sm:gap-6">
                    <span className={cn("text-xl font-medium", step.tone)}>{step.number}</span>
                    <div className="mt-5 border-t pt-5 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                      <p className="text-ui text-muted-foreground">{step.label}</p>
                      <p className="mt-4 text-xl font-medium leading-7 tracking-[-0.02em]">{step.body}</p>
                    </div>
                    {index < steps.length - 1 ? (
                      <span className="absolute -right-5 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-background text-muted-foreground shadow-regular-sm ring-1 ring-border lg:grid">
                        <ChevronRightIcon className="size-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </article>
                </Reveal>
              ))}
            </div>
            <p className="mt-8 text-center text-caption text-hollow">From prompt to editable figure, with a review gate in between.</p>
          </div>
        </section>

        <section id="use-cases" className="scroll-mt-20 px-5 py-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 rounded-[40px] bg-muted p-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:p-16">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-caption text-primary">
                <FlowchartIcon className="size-4" aria-hidden="true" />
                Scientific communication
              </span>
              <h2 className="mt-4 max-w-md text-4xl font-medium leading-tight tracking-[-0.03em]">
                Make complex logic easier to inspect
              </h2>
              <p className="mt-4 max-w-md text-body text-muted-foreground">
                FigureLab is designed for work where structure, labels, and revisions matter as much as the first draft.
              </p>
            </Reveal>
            <div className="divide-y divide-border border-y">
              {useCases.map(([title, body], index) => (
                <Reveal key={title} delay={index * 0.05}>
                  <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-8">
                    <h3 className="text-title-sm">{title}</h3>
                    <p className="text-caption text-muted-foreground">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8">
          <Reveal>
            <div className="mx-auto flex max-w-7xl flex-col gap-8 border-y py-10 lg:flex-row lg:items-center">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-regular-sm">
                <FlowchartIcon className="size-8" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h2 className="text-3xl font-medium leading-10 tracking-[-0.025em]">
                  Ready to turn research logic into a figure?
                </h2>
                <p className="mt-2 text-body text-muted-foreground">
                  Start with an editable flowchart and keep control of every step.
                </p>
              </div>
              <Button size="lg" asChild>
                <Link href="/create">
                  Create a flowchart
                  <ArrowUpRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="px-5 pb-8 pt-10 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[40px] bg-muted p-8 sm:p-12">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <Link href="/" aria-label="FigureLab home">
                <Brand />
              </Link>
              <p className="mt-5 max-w-sm text-caption text-muted-foreground">
                An editable, review-first workspace for scientific flowcharts.
              </p>
              <p className="mt-1 text-caption text-muted-foreground">Built for clear scientific communication.</p>
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
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="#features">Features</Link>
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="#workflow">How it works</Link>
                <Link className="text-ui text-muted-foreground hover:text-foreground" href="/api">Local API</Link>
              </nav>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-caption text-hollow sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} FigureLab. All rights reserved.</p>
            <p>Flowchart Release 1 · Local-first beta</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
