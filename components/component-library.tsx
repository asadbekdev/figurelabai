"use client"

import { useState } from "react"
import {
  AlertTriangleIcon,
  BellIcon,
  CommandIcon,
  DownloadIcon,
  FileTextIcon,
  FolderIcon,
  InfoIcon,
  Layers3Icon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Share2Icon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  CanvasToolbar,
  ExportOption,
  GenerationActivity,
  GenerationApproval,
  GenerationStatus,
  ProjectCard,
  PromptComposer,
  ReadinessList,
  SelectionActions,
  SourceContextCard,
  VersionItem,
} from "@/components/product"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const sections = [
  ["foundations", "Foundations"],
  ["actions", "Actions"],
  ["forms", "Forms"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["data", "Data display"],
  ["product", "Product patterns"],
] as const

function LibrarySection({ id, title, description, children }: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-6">
      <header className="max-w-2xl space-y-2">
        <h2 id={`${id}-title`} className="text-2xl font-medium tracking-tight text-balance">{title}</h2>
        <p className="text-body text-muted-foreground text-pretty">{description}</p>
      </header>
      {children}
    </section>
  )
}

function Specimen({ title, description, children, className }: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("continuous-corners space-y-4 rounded-2xl bg-surface p-4 surface-outline sm:p-5", className)}>
      <div>
        <h3 className="text-ui font-medium">{title}</h3>
        {description && <p className="mt-1 text-meta text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function ColorToken({ name, value, className }: { name: string; value: string; className: string }) {
  return (
    <div className="min-w-0">
      <div className={cn("h-20 rounded-xl surface-outline", className)} />
      <p className="mt-2 truncate text-ui font-medium">{name}</p>
      <p className="truncate font-mono text-caption text-muted-foreground">{value}</p>
    </div>
  )
}

export function ComponentLibrary() {
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <div className="safe-area-shell min-h-svh bg-background">
      <a href="#main" className="fixed start-3 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:translate-y-0">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Layers3Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-ui font-medium">FigureLab components</p>
              <p className="truncate text-caption text-muted-foreground">Calm precision · v0.1</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setCommandOpen(true)}>
              <SearchIcon aria-hidden="true" /> Search <Kbd>⌘K</Kbd>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] border-e px-4 py-8 lg:block">
          <nav aria-label="Component sections">
            <p className="mb-3 px-2 text-caption font-medium text-muted-foreground">Library</p>
            <ul className="space-y-1">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="block rounded-lg px-2 py-2 text-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main id="main" className="min-w-0 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <div className="space-y-20">
            <header className="max-w-3xl space-y-5">
              <Badge variant="secondary">Approved baseline</Badge>
              <div className="space-y-3">
                <h1 className="text-5xl font-medium tracking-[-0.04em] text-balance sm:text-6xl">A complete interface language for <span className="text-brand">scientific creation.</span></h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">Accessible primitives, artifact-first patterns, and explicit system states—built to make complex figure work feel calm.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => document.getElementById("product")?.scrollIntoView()}>View product patterns</Button>
                <Button variant="outline" onClick={() => setCommandOpen(true)}>Open command palette</Button>
              </div>
            </header>

            <LibrarySection id="foundations" title="Foundations" description="Neutral application chrome keeps attention on figures. Blue is reserved for interactive emphasis; status colors keep one meaning.">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ColorToken name="Background" value="--background" className="bg-background" />
                <ColorToken name="Surface" value="--surface" className="bg-surface" />
                <ColorToken name="Primary" value="--primary" className="bg-primary" />
                <ColorToken name="Brand" value="--brand" className="bg-brand" />
                <ColorToken name="Success" value="--success" className="bg-success" />
                <ColorToken name="Warning" value="--warning" className="bg-warning" />
                <ColorToken name="Destructive" value="--destructive" className="bg-destructive" />
                <ColorToken name="Muted" value="--muted" className="bg-muted" />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Specimen title="Typography" description="A ChatGPT-style native system stack with a role-based scale and restrained weights.">
                  <div className="space-y-4">
                    <p className="text-3xl font-medium tracking-tight">Publication-ready figures</p>
                    <p className="text-lg font-medium">Project and pane title</p>
                    <p className="text-body max-w-[65ch]">Body text stays comfortable for instructions, chat, and explanations that need sustained reading.</p>
                    <p className="text-ui font-medium">Interface label · 14/20</p>
                    <p className="text-meta text-muted-foreground">Metadata · 13/18 · Saved just now</p>
                    <p className="font-mono text-caption">560 × 313 · task_4BC93</p>
                  </div>
                </Specimen>
                <Specimen title="Spacing and shape" description="A 4 px spacing base, structural borders, and concentric radii.">
                  <div className="flex items-end gap-3">
                    {[4, 8, 12, 16, 24, 32].map((value) => (
                      <div key={value} className="flex flex-col items-center gap-2"><div className="w-6 rounded-sm bg-brand" style={{ height: value }} /><span className="text-caption tabular-nums">{value}</span></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-caption text-muted-foreground"><div><div className="h-20 rounded-lg bg-muted" /><span className="mt-2 block">Control · 12</span></div><div><div className="continuous-corners h-20 rounded-xl bg-muted" /><span className="mt-2 block">Surface · 16</span></div><div><div className="h-20 rounded-full bg-muted" /><span className="mt-2 block">Pill</span></div></div>
                </Specimen>
              </div>
            </LibrarySection>

            <LibrarySection id="actions" title="Actions" description="One primary action per decision context. Secondary and ghost actions stay neutral until their meaning requires emphasis.">
              <div className="grid gap-4 xl:grid-cols-2">
                <Specimen title="Buttons">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button>Generate figure · 50 credits</Button><Button variant="secondary">Save version</Button><Button variant="outline">Export SVG</Button><Button variant="ghost">Cancel</Button><Button variant="destructive">Delete project</Button><Button disabled><Spinner /> Generate figure</Button>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="xs">Extra small</Button><Button size="sm">Small</Button><Button>Default</Button><Button size="lg">Large</Button>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="outline" aria-label="Notifications"><BellIcon aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
                  </div>
                </Specimen>
                <Specimen title="States and menus">
                  <div className="flex flex-wrap gap-2"><Badge>Current</Badge><Badge variant="secondary">Draft</Badge><Badge variant="outline">No credits</Badge><Badge variant="destructive">Failed</Badge></div>
                  <div className="flex flex-wrap items-center gap-3"><Toggle aria-label="Toggle annotations"><SparklesIcon aria-hidden="true" /> Annotations</Toggle><Toggle aria-label="Toggle grid" variant="outline"><Layers3Icon aria-hidden="true" /> Grid</Toggle></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline"><MoreHorizontalIcon aria-hidden="true" /> Project actions</Button></DropdownMenuTrigger>
                    <DropdownMenuContent><DropdownMenuLabel>Project</DropdownMenuLabel><DropdownMenuItem><Share2Icon aria-hidden="true" /> Share project</DropdownMenuItem><DropdownMenuItem>Duplicate project</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive"><Trash2Icon aria-hidden="true" /> Delete project</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </Specimen>
              </div>
            </LibrarySection>

            <LibrarySection id="forms" title="Forms" description="Labels remain visible, errors explain recovery, and controls stay large enough for touch and zoom.">
              <div className="grid gap-4 xl:grid-cols-2">
                <Specimen title="Fields">
                  <FieldGroup>
                    <Field><FieldLabel htmlFor="figure-title">Figure title</FieldLabel><Input id="figure-title" defaultValue="Three-step PCR workflow" /><FieldDescription>Shown in Projects and exports.</FieldDescription></Field>
                    <Field data-invalid="true"><FieldLabel htmlFor="project-id">Project ID</FieldLabel><Input id="project-id" aria-invalid="true" aria-describedby="project-id-error" defaultValue="PCR workflow 01" /><FieldError id="project-id-error">Use lowercase letters, numbers, and hyphens.</FieldError></Field>
                    <Field><FieldLabel htmlFor="notes">Export note</FieldLabel><Textarea id="notes" placeholder="Example: Prepared for the methods appendix" /></Field>
                  </FieldGroup>
                </Specimen>
                <Specimen title="Selection controls">
                  <FieldGroup>
                    <Field><FieldLabel htmlFor="model">Model</FieldLabel><Select defaultValue="nano"><SelectTrigger id="model" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nano">Nano Banana Pro</SelectItem><SelectItem value="gpt">GPT Image</SelectItem><SelectItem value="seedream">Seedream</SelectItem></SelectContent></Select></Field>
                    <FieldSet><FieldLegend variant="label">Output style</FieldLegend><RadioGroup defaultValue="flat" className="grid sm:grid-cols-3">{["Flat", "Line art", "Sketch"].map((label) => <Label key={label} className="flex items-center gap-2 rounded-lg border p-3"><RadioGroupItem value={label.toLowerCase().replace(" ", "-")} /> {label}</Label>)}</RadioGroup></FieldSet>
                    <Label className="flex items-center justify-between gap-4 rounded-lg border p-3"><span><span className="block text-ui font-medium">Show grid</span><span className="text-meta text-muted-foreground">Align objects while editing.</span></span><Switch defaultChecked /></Label>
                    <Label className="flex items-center gap-3"><Checkbox defaultChecked /> Include a transparent background</Label>
                  </FieldGroup>
                </Specimen>
                <Specimen title="Input group and range">
                  <Field><FieldLabel htmlFor="search-projects">Search projects</FieldLabel><InputGroup><InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon><InputGroupInput id="search-projects" placeholder="Search by title" /><InputGroupAddon align="inline-end"><Kbd>⌘K</Kbd></InputGroupAddon></InputGroup></Field>
                  <Field><div className="flex items-center justify-between"><FieldLabel htmlFor="font-size">Label size</FieldLabel><span className="text-meta tabular-nums">14 px</span></div><Slider id="font-size" defaultValue={[14]} min={10} max={24} step={1} aria-label="Label size" /></Field>
                </Specimen>
                <Specimen title="Empty state">
                  <Empty className="min-h-56"><EmptyHeader><EmptyMedia variant="icon"><FolderIcon aria-hidden="true" /></EmptyMedia><EmptyTitle>No figures yet</EmptyTitle><EmptyDescription>Projects keep your requests, versions, and exports together.</EmptyDescription></EmptyHeader><EmptyContent><Button><PlusIcon aria-hidden="true" /> Create your first figure</Button></EmptyContent></Empty>
                </Specimen>
              </div>
            </LibrarySection>

            <LibrarySection id="feedback" title="Feedback and navigation" description="Progress, validation, save state, tabs, and disclosures are explicit and keyboard predictable.">
              <div className="grid gap-4 xl:grid-cols-2">
                <Specimen title="Alerts and progress">
                  <Alert><InfoIcon aria-hidden="true" /><AlertTitle>Auto selected 16:9</AlertTitle><AlertDescription>The workflow reads horizontally. You can change this before generating.</AlertDescription></Alert>
                  <Alert variant="destructive"><AlertTriangleIcon aria-hidden="true" /><AlertTitle>Unable to render the figure</AlertTitle><AlertDescription>Your 50 credits were returned. Check the source file and try again.</AlertDescription></Alert>
                  <div className="flex items-center gap-3 text-ui"><Spinner /> Rendering the figure</div><Progress value={58} aria-label="Rendering progress: 58 percent" />
                  <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-24 w-full" /></div>
                  <Button variant="outline" onClick={() => toast.success("Version saved", { description: "You can restore it from the versions rail." })}>Show success toast</Button>
                </Specimen>
                <Specimen title="Tabs and disclosure">
                  <Tabs defaultValue="canvas"><TabsList><TabsTrigger value="canvas">Canvas</TabsTrigger><TabsTrigger value="versions">Versions</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger></TabsList><TabsContent value="canvas" className="rounded-lg bg-muted p-4">Direct editing and selection tools.</TabsContent><TabsContent value="versions" className="rounded-lg bg-muted p-4">Restorable generation milestones.</TabsContent><TabsContent value="sources" className="rounded-lg bg-muted p-4">Files and reference images.</TabsContent></Tabs>
                  <Accordion type="single" collapsible defaultValue="credits"><AccordionItem value="credits"><AccordionTrigger>How credits work</AccordionTrigger><AccordionContent>Credits are reserved before generation and settled only when the job succeeds.</AccordionContent></AccordionItem><AccordionItem value="exports"><AccordionTrigger>Available exports</AccordionTrigger><AccordionContent>Export SVG, PDF, PPTX, and high-resolution PNG.</AccordionContent></AccordionItem></Accordion>
                </Specimen>
              </div>
            </LibrarySection>

            <LibrarySection id="overlays" title="Overlays" description="Overlays preserve focus, expose clear titles, and return users to the action that opened them.">
              <Specimen title="Dialogs, popovers, sheets, and drawers">
                <div className="flex flex-wrap gap-3">
                  <Dialog><DialogTrigger asChild><Button variant="outline">Open export dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Choose export format</DialogTitle><DialogDescription>Settings are checked against your selected destination.</DialogDescription></DialogHeader><div className="space-y-2"><ExportOption title="SVG" description="Editable vectors and text" recommended /><ExportOption title="300 DPI PNG" description="Ready for journal upload" /></div><DialogFooter showCloseButton><Button>Export SVG</Button></DialogFooter></DialogContent></Dialog>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Delete project</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>The conversation, versions, and exports will be permanently removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive">Delete project</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  <Popover><PopoverTrigger asChild><Button variant="outline"><Settings2Icon aria-hidden="true" /> Figure settings</Button></PopoverTrigger><PopoverContent><p className="text-ui font-medium">Figure settings</p><p className="text-meta text-muted-foreground">Style, palette, and aspect ratio are resolved before generation.</p></PopoverContent></Popover>
                  <Sheet><SheetTrigger asChild><Button variant="outline">Open inspector</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Figure inspector</SheetTitle><SheetDescription>Edit the selected figure properties.</SheetDescription></SheetHeader><div className="p-4"><ReadinessList /></div></SheetContent></Sheet>
                  <Drawer><DrawerTrigger asChild><Button variant="outline">Open mobile actions</Button></DrawerTrigger><DrawerContent><DrawerHeader><DrawerTitle>Figure actions</DrawerTitle><DrawerDescription>Choose the next step for this figure.</DrawerDescription></DrawerHeader><DrawerFooter><Button>Export figure</Button><DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
                  <HoverCard><HoverCardTrigger asChild><Button variant="link">What is publication readiness?</Button></HoverCardTrigger><HoverCardContent>Checks label fit, contrast, dimensions, resolution, fonts, and vector behavior before export.</HoverCardContent></HoverCard>
                </div>
              </Specimen>
            </LibrarySection>

            <LibrarySection id="data" title="Data display" description="Text aligns to the leading edge, numbers to the trailing edge, and changing values use tabular figures.">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
                <Specimen title="Table" className="overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Export</TableHead><TableHead>Format</TableHead><TableHead>Status</TableHead><TableHead className="text-end">Size</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">Journal manuscript</TableCell><TableCell>SVG</TableCell><TableCell><Badge variant="secondary">Ready</Badge></TableCell><TableCell className="text-end tabular-nums">184 KB</TableCell></TableRow><TableRow><TableCell className="font-medium">Presentation</TableCell><TableCell>PPTX</TableCell><TableCell><Badge variant="outline">Checking</Badge></TableCell><TableCell className="text-end tabular-nums">2.4 MB</TableCell></TableRow><TableRow><TableCell className="font-medium">Web preview</TableCell><TableCell>PNG</TableCell><TableCell><Badge variant="secondary">Ready</Badge></TableCell><TableCell className="text-end tabular-nums">612 KB</TableCell></TableRow></TableBody></Table></div></Specimen>
                <Specimen title="People and metadata"><div className="flex -space-x-2 rtl:space-x-reverse">{["AS", "MK", "JL"].map((initials) => <Avatar key={initials} className="ring-2 ring-background"><AvatarFallback>{initials}</AvatarFallback></Avatar>)}</div><p className="text-ui font-medium">3 collaborators</p><p className="text-meta text-muted-foreground">Comments, approvals, and ownership remain attached to the project.</p></Specimen>
              </div>
            </LibrarySection>

            <LibrarySection id="product" title="Product patterns" description="Compound components turn the visual system into an opinionated scientific creation workflow, including visible AI activity and safe human approval.">
              <div className="space-y-8">
                <Specimen title="Prompt composer" description="Mode, sources, resolved settings, cost, and submit remain in one calm surface."><div className="flex justify-center py-8"><PromptComposer /></div></Specimen>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Specimen title="Generation activity" description="Operational progress is inspectable without exposing private model reasoning."><GenerationActivity /></Specimen>
                  <Specimen title="Approval card" description="The generator pauses when a meaningful choice changes the artifact."><GenerationApproval /></Specimen>
                  <Specimen title="Source context" description="Evidence stays attached to the nodes and claims it supports."><SourceContextCard /></Specimen>
                  <Specimen title="Selection actions" description="AI editing tools appear next to the selected canvas object."><div className="grid min-h-44 place-items-center rounded-xl bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px]"><SelectionActions /></div></Specimen>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Specimen title="Generation status"><GenerationStatus /></Specimen><Specimen title="Project card"><ProjectCard /></Specimen>
                  <Specimen title="Canvas toolbar"><div className="grid min-h-48 place-items-center rounded-xl bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px]"><CanvasToolbar /></div></Specimen>
                  <Specimen title="Versions"><div className="space-y-1"><VersionItem version="v4" title="Increase label contrast" active /><VersionItem version="v3" title="Simplify amplification step" /><VersionItem version="v2" title="Initial generated layout" /></div></Specimen>
                  <Specimen title="Export options"><div className="space-y-2"><ExportOption title="SVG" description="Editable vectors and text" recommended /><ExportOption title="300 DPI PNG" description="Ready for manuscript upload" /></div></Specimen><Specimen title="Readiness checks"><ReadinessList /></Specimen>
                </div>
              </div>
            </LibrarySection>
          </div>
        </main>
      </div>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <Command><CommandInput placeholder="Search components and actions" /><CommandList><CommandEmpty>No matching components.</CommandEmpty><CommandGroup heading="Navigate">{sections.map(([id, label]) => <CommandItem key={id} onSelect={() => { setCommandOpen(false); document.getElementById(id)?.scrollIntoView() }}><FileTextIcon aria-hidden="true" /> {label}</CommandItem>)}</CommandGroup><CommandGroup heading="Actions"><CommandItem onSelect={() => toast.success("New project created")}><PlusIcon aria-hidden="true" /> Create project <CommandShortcut>⌘N</CommandShortcut></CommandItem><CommandItem><DownloadIcon aria-hidden="true" /> Export current figure <CommandShortcut>⌘E</CommandShortcut></CommandItem><CommandItem><CommandIcon aria-hidden="true" /> Open command menu <CommandShortcut>⌘K</CommandShortcut></CommandItem></CommandGroup></CommandList></Command>
      </CommandDialog>
    </div>
  )
}
