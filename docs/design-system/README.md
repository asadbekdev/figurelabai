# Product design system

Status: approved baseline for the first product build.

This is the source of truth for UI decisions. Product screens may extend it only when the new pattern cannot be composed from an existing one. Reference research and adoption decisions are in [references.md](./references.md).

## Design thesis

The product should feel like a calm scientific workspace with editorial clarity, not an AI generator dashboard.

**Calm precision** means:

- neutral surfaces let the figure dominate;
- every important state is explicit;
- controls appear near the object or decision they affect;
- one action receives primary emphasis at a time;
- density comes from alignment and progressive disclosure, not small unreadable UI;
- AI plans, costs, progress, and changes remain inspectable.

```mermaid
flowchart TD
  I[Intent] --> P[Visible plan]
  P --> A[Artifact-first workspace]
  A --> R[Safe refinement]
  R --> V[Verified export]
  T[Design tokens] --> A
  C[Accessible components] --> A
  S[Explicit system state] --> P
  S --> R
```

## Product personality

The interface is:

- calm, not playful;
- precise, not clinical;
- compact, not cramped;
- capable, not complicated;
- direct, not clever;
- trustworthy, not magical.

The visual baseline is **Energy-style editorial restraint with ChatGPT-style circular controls**: airy technical space, a single blue emphasis color, real product UI as proof, and pill-shaped text buttons. Marketing may feel editorial; the workspace remains compact and utilitarian.

The product does not use gradients, glassmorphism, decorative blobs, glowing AI effects, emoji navigation, or constant animation as brand language.

## AI interaction policy

AI behavior must feel inspectable and interruptible:

- show operational activity such as reading a source, arranging a layout, or checking labels;
- never present private chain-of-thought as a product feature;
- pause for approval only when a choice materially changes content, evidence, cost, or layout;
- keep sources attached to the nodes and claims they support;
- place refinement actions beside the selected artifact object;
- keep cancel, retry, and edit paths available around long-running work;
- announce asynchronous changes through concise live-region text.

Beautiful UI is the reference for these interaction patterns. FigureLab reimplements them with its own semantic tokens and primitives; it does not introduce a second theme, icon set, or animation language.

## Technology decision

The design-system stack is:

- Tailwind CSS v4 for styling;
- shadcn/ui `radix-nova` components with Radix primitives;
- semantic CSS variables authored in OKLCH;
- the ChatGPT-style native system sans stack for the full product and marketing interface;
- Geist Mono through `next/font` for code, dimensions, IDs, and reproducible values;
- Lucide for all interface icons;
- Motion only for purposeful transitions;
- assistant-ui primitives for thread/composer behavior;
- React Flow for the first flowchart canvas.

The repository currently already has Next.js 16.3.1, React 19, Tailwind v4, Geist Mono, Lucide, and Motion. No second styling system, display font, or icon set should be introduced.

## Color system

### Color policy

- Neutral is the brand foundation.
- The filled primary action is neutral black in the product workspace; marketing may use the brand-blue CTA.
- Blue means link, focus, active selection, or interactive emphasis. It is not decorative.
- Green means success or improvement.
- Amber means warning or pending attention.
- Red means destructive action or failure.
- Figure and plot colors belong to the document, not the application chrome.
- Meaning never depends on color alone.

### Light tokens

```css
:root {
  --background: oklch(0.985 0.002 247.839);
  --foreground: oklch(0.205 0.006 285.885);

  --surface: oklch(0.998 0 0);
  --surface-subtle: oklch(0.967 0.003 264.542);
  --surface-raised: oklch(1 0 0);

  --muted: oklch(0.956 0.003 264.542);
  --muted-foreground: oklch(0.43 0.015 285.8);
  --border: oklch(0.912 0.006 264.531);
  --input: oklch(0.922 0.006 264.531);

  --primary: oklch(0.205 0.006 285.885);
  --primary-foreground: oklch(0.985 0.002 247.839);

  --brand: oklch(0.5 0.2 260);
  --brand-foreground: oklch(0.985 0.002 247.839);
  --accent: oklch(0.95 0.03 255);
  --accent-foreground: oklch(0.35 0.12 260);
  --ring: oklch(0.5 0.2 260);

  --success: oklch(0.5 0.13 150);
  --warning: oklch(0.55 0.14 70);
  --destructive: oklch(0.5 0.19 25);
}
```

### Dark tokens

```css
.dark {
  --background: oklch(0.145 0.004 285.823);
  --foreground: oklch(0.922 0.004 286.32);

  --surface: oklch(0.205 0.006 285.885);
  --surface-subtle: oklch(0.235 0.006 285.9);
  --surface-raised: oklch(0.269 0.006 286.033);

  --muted: oklch(0.269 0.006 286.033);
  --muted-foreground: oklch(0.72 0.01 286);
  --border: oklch(0.3 0.007 286);
  --input: oklch(0.3 0.007 286);

  --primary: oklch(0.922 0.004 286.32);
  --primary-foreground: oklch(0.205 0.006 285.885);

  --brand: oklch(0.72 0.14 255);
  --brand-foreground: oklch(0.145 0.004 285.823);
  --accent: oklch(0.27 0.06 255);
  --accent-foreground: oklch(0.9 0.03 255);
  --ring: oklch(0.72 0.14 255);

  --success: oklch(0.7 0.13 150);
  --warning: oklch(0.78 0.12 80);
  --destructive: oklch(0.7 0.15 25);
}
```

### Verified text contrast

The proposed core pairs were converted to linear sRGB and checked with the WCAG contrast formula:

| Pair | Ratio |
| --- | ---: |
| Light foreground / background | 17.17:1 |
| Light muted foreground / background | 7.79:1 |
| Light brand link / background | 5.98:1 |
| Dark foreground / background | 15.71:1 |
| Dark muted foreground / background | 7.97:1 |
| Dark brand link / background | 7.97:1 |
| Light destructive text / background | 6.35:1 |
| Dark destructive text / background | 6.94:1 |

All exceed WCAG AA for normal text. Component-level contrast still must be checked against the actual rendered background and state.

### Data visualization palette

Charts may use up to five stable series roles:

1. blue — primary observation;
2. coral — comparison or revenue/cost;
3. teal — positive secondary series;
4. violet — categorical secondary series;
5. amber — threshold or attention.

Large fills use low chroma/opacity; lines and marks carry the stronger color. Axes, labels, and values stay neutral. Every series is also distinguished by label, shape, or line style.

## Typography

### Typeface

- Interface, prose, and display: the native system sans stack used by ChatGPT.
- Code, dimensions, task IDs, and reproducible snippets: Geist Mono.
- No secondary brand or editorial font.
- The system stack needs no font download; keep Geist Mono self-hosted as `.woff2` through `next/font` and keep root antialiasing enabled.

### Weights

- 400: body, descriptions, chat, inputs.
- 500: buttons, labels, navigation, table headers, page titles, and section titles.
- Do not use 600+ in the product UI.

### Type scale

| Token | Size / line height | Use |
| --- | --- | --- |
| `text-caption` | 12 / 16 | nonessential timestamps and metadata |
| `text-meta` | 13 / 18 | secondary editor values and hints |
| `text-ui` | 14 / 20 | buttons, menus, tabs, inspector labels |
| `text-body` | 16 / 24 | conversation, descriptions, mobile inputs |
| `text-title-sm` | 18 / 24 | pane and modal titles |
| `text-title` | 24 / 30 | page title and empty-state question |
| `text-display` | 32 / 38 | marketing or onboarding only |

Rules:

- body reading measure is 60–75 characters;
- headings use balanced wrapping;
- short descriptions use pretty wrapping;
- changing credits, costs, time, zoom, dimensions, and progress use tabular numbers;
- long project names truncate only when the full value is available on focus/hover or rename;
- mobile inputs remain at least 16 px to prevent browser zoom.

## Spacing and layout

### Spacing scale

Use a 4 px base:

| Token | Value | Typical use |
| --- | ---: | --- |
| `space-1` | 4 px | icon/text optical correction |
| `space-2` | 8 px | items inside one control group |
| `space-3` | 12 px | adjacent compact controls |
| `space-4` | 16 px | standard component padding |
| `space-6` | 24 px | separation between groups |
| `space-8` | 32 px | page inset or major section gap |
| `space-12` | 48 px | empty-state or onboarding separation |

The gap between groups must be at least twice the gap inside the group. Use whitespace before adding dividers.

### App shell

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Project header: name · save state · undo/redo · export   │
│         ├──────────────┬────────────────────────────┬───────────────┤
│ History │ Versions     │ Canvas / artifact          │ Inspector     │
│         │              │                            │               │
│ Account ├──────────────┴────────────────────────────┴───────────────┤
│         │ Composer: request · sources · cost · apply                │
└──────────────────────────────────────────────────────────────────────┘
```

Initial desktop dimensions:

- global sidebar: 248 px expanded, 56 px collapsed;
- project header: 52 px;
- versions rail: 216 px when visible;
- inspector: 296 px default, resizable from 264–360 px;
- conversation/composer reading width: 760 px maximum;
- standard page inset: 24 px compact desktop, 32 px large desktop;
- canvas consumes all remaining space.

These are initial content constraints, not device-class breakpoints. Adjust only when real content proves a boundary is wrong.

### Responsive states

1. **Expanded:** global sidebar, canvas, and inspector fit together.
2. **Compact desktop:** sidebar becomes icon rail; versions merge into a popover/rail; inspector remains resizable.
3. **Tablet:** navigation and inspector become drawers; canvas remains full-width.
4. **Mobile:** creation and review use a single-column flow; canvas tools move into labeled bottom sheets. Do not shrink a desktop editor until it technically fits.

The application must reflow at 320 px and survive 200% zoom without losing critical actions.

## Shape, borders, and elevation

### Radius scale

The system uses one radius family with a small number of roles. This preserves consistent geometry without forcing pills, fields, nested surfaces, and dialogs to share one literal radius.

| Token | Value | Use |
| --- | ---: | --- |
| `radius-xs` | 4 px | small selection markers |
| `radius-sm` | 6 px | compact tags and code fragments |
| `radius-md` | 8 px | menu items and compact fields |
| `radius-lg` | 12 px | controls, inspector groups, and small previews |
| `radius-xl` | 16 px | bounded surfaces, dialogs, and media |
| `radius-composer` | 28 px | main conversational composer only |
| `radius-round` | 999 px | text buttons, icon buttons, avatars, and circular controls |

Nested radii must be concentric: outer radius equals inner radius plus padding. Do not put 12 px children inside a 12 px parent.

Supported browsers may progressively enhance bounded surfaces with `corner-shape: squircle`. Normal `border-radius` remains the production fallback because `corner-shape` is not yet Baseline across major browsers.

### Borders

- 1 px borders communicate structure, focus, or selection.
- Main page sections should not become a grid of outlined cards.
- Canvas pane boundaries may use one neutral structural border.
- Generated images use a 1 px black 10% outline in light mode and white 10% outline in dark mode.

### Shadows

- no shadow on ordinary app panes;
- `shadow-surface` for a bounded raised object;
- `shadow-surface-hover` for its hover elevation;
- `shadow-overlay` for popovers, menus, sheets, and modal dialogs;
- no colored glow.

## Icons

- Lucide only.
- Standard icon size: 16 px inside compact UI, 18 px in normal buttons, 20 px for standalone toolbar controls.
- Default stroke: 1.5 px beside regular text; 2 px beside semibold text.
- Outline is default; fill marks the active tool only where the icon supports it cleanly.
- Icons inherit `currentColor`.
- Icon-only actions require an accessible label and tooltip.
- Prefer visible labels for unfamiliar scientific or export actions.

## Controls

### Button hierarchy

- **Primary:** one per control group; neutral filled surface.
- **Secondary:** neutral outline or subtle surface.
- **Ghost:** low-emphasis toolbar and message actions.
- **Destructive:** red only for genuinely destructive actions.
- **Link:** inline navigation or documentation.

Text buttons use pill silhouettes (`radius-round`); icon-only buttons are true circles. Joined button groups may keep connected inner edges so they read as one control. Fields, cards, menus, and panes do not become pills merely to match the buttons.

Desktop controls target 40 × 40 px when space permits; compact toolbar controls may visually use 32–36 px while preserving at least a 24 × 24 px non-overlapping hit target. Touch targets aim for 44 × 44 px.

On coarse-pointer devices, shared button, toggle, select, menu-item, and command-item primitives expand their interactive target to at least 44 px. Full-screen application shells use `safe-area-shell` so content avoids notches, rounded display corners, and home-indicator regions.

Button copy is verb-first and includes the consequence when it matters:

- `Generate figure · 50 credits`
- `Apply change · 10 credits`
- `Export SVG`
- `Delete project`

### Fields and composer

- Every field has a persistent visible label unless its accessible purpose is unmistakably established by the surrounding composite widget.
- Placeholder text provides an example, never the only label.
- The main composer grows to a defined maximum height, then scrolls internally.
- Attachments appear above the text row as removable items.
- Mode and output settings use compact labeled disclosures, not an always-visible wall of pills.
- Submit remains available until validation; errors appear inline and focus the first invalid input.

### Tabs

- Use tabs only for peer views of the same object.
- Active state uses text weight plus a shape/indicator, not color alone.
- Arrow keys move within the tablist; Tab exits the widget.
- Do not use pills as both filters and navigation in the same surface.

### Menus and command palette

- Menus contain actions; links navigate.
- Destructive items are separated and explicitly labeled.
- Escape closes and focus returns to the trigger.
- Command palette uses `Cmd/Ctrl+K` and exposes navigation plus expert actions, not settings that only exist there.

## Surface patterns

### Empty workbench

- centered question at 24 px / 400;
- composer raised slightly above vertical center;
- at most three realistic examples below;
- no illustration, feature grid, or dashboard before the first task;
- navigation remains available but visually quiet.

### Active project

- artifact is dominant;
- conversation is collapsible or width-limited;
- project title and save state stay visible;
- selection opens contextual inspector content;
- composer remains the language path for scoped changes;
- versions are durable milestones, while undo/redo handles recent direct edits.

### Generation progress

Use named stages and a stable live region:

1. Reading your request
2. Planning the layout
3. Rendering the figure
4. Checking labels and output

Show elapsed time and a range based on comparable jobs. Never use a fake precise countdown. Display the structural preview as soon as it exists.

### Cards

Cards are for bounded objects such as a project preview, export preset, or source file. They are not default layout containers. Never nest cards.

### Tables and data

- quiet horizontal separators only;
- labels align to the start, numbers to the end;
- changing values use tabular numbers;
- column headers use 14 px / 500;
- row actions appear on focus as well as hover;
- narrow layouts switch to a meaningful list instead of shrinking every column.

## Motion

- hover/color response: 80–120 ms;
- standard state transition: 180 ms;
- pane or modal transition: 220 ms;
- easing: `cubic-bezier(0.2, 0, 0, 1)`;
- press feedback: scale to exactly `0.96` when appropriate;
- contextual icon swap: 300 ms spring with zero bounce if Motion is used;
- no `transition: all`;
- no page-load entrance animation for routine app screens;
- no custom animation on repeated canvas operations;
- reduced motion replaces translation/scale with short opacity changes.

Motion always has a static cue such as text, color, icon, or state label.

## Accessibility contract

The core prompt-to-export flow must be keyboard-completable.

- Native elements first; no clickable `div`.
- Visible `:focus-visible` indicator with at least a 2 px perimeter.
- One main landmark and coherent headings.
- Skip-to-content before repeated navigation.
- Escape closes overlays; focus is trapped and restored for modals.
- Selection, save state, progress, completion, and errors are announced without stealing focus.
- The canvas exposes a navigable object list and keyboard movement path.
- Color is paired with icon, text, shape, or line style.
- Toasts with actions or errors remain until dismissed.
- Forced colors, RTL, 200% zoom, 320 px reflow, and reduced motion are required QA states.

## Voice and writing

### Voice

- warm in onboarding and empty states;
- neutral in routine work;
- calm and specific in errors;
- serious around deletion, billing, rights, and data loss.

### Rules

- sentence case everywhere;
- address the reader as `you` only when instruction needs a subject;
- use the same term for the same object: project, figure, version, source, export;
- links name their destination;
- buttons name their action;
- errors explain recovery beside the failing surface;
- no `Oops`, `Magic`, `Let's go`, or vague `Something went wrong`;
- no exclamation marks in errors or billing.

Examples:

| Context | Copy |
| --- | --- |
| Empty projects | `No figures yet` / `Create your first figure` |
| Auto ratio | `Auto · 16:9 for this layout` |
| Save | `Saved just now` |
| Offline | `Offline — changes are stored on this device` |
| Refunded failure | `Unable to render the figure. Your 50 credits were returned. Try again.` |
| Export warning | `Two labels may be too small at the selected journal width.` |

## Component inventory

### P0 — before the first workflow

- Button and icon button
- Link
- Tooltip
- Field, label, input, textarea, file attachment
- Select/combobox
- Tabs
- Dropdown and context menu
- Dialog and alert dialog
- Drawer/sheet
- Toast/status region
- Progress and skeleton
- Empty state
- Sidebar and navigation item
- Resizable panes
- Command palette
- Project header
- Composer
- Message and message action bar
- Generation status
- Credit/cost disclosure
- Canvas toolbar
- Inspector section
- Version item
- Export preset and readiness issue

### P1

- Data table
- Search and filter bar
- Before/after comparison
- Comments and mentions
- Share dialog
- Color and style controls
- Object tree

No component is complete until default, hover, focus, active, disabled, loading, error, empty, and dark states are defined where applicable.

## Governance

1. Use an existing primitive before creating a new one.
2. Add semantic tokens for new roles; never borrow a color because it looks similar.
3. Keep variants small and meaningful.
4. Document new patterns beside the component.
5. Test at 320 px, normal desktop, 200% zoom, keyboard-only, light, dark, and reduced motion.
6. Review motion at slowed playback when adding animation.
7. Reject one-off radius, font size, shadow, or raw color values unless the exception is documented.
8. Run `npm run design:audit` to reject hard-coded colors, raw palette utilities, extra font weights, raw shadow scales, arbitrary spacing, and `transition-all`.

## Implementation order

1. Initialize shadcn with the approved preset choices.
2. Replace the starter global colors with these semantic tokens.
3. Map the type, spacing, radius, and motion tokens into Tailwind v4.
4. Build and visually test primitive states in isolation.
5. Build the application shell and empty workbench.
6. Add assistant-ui thread/composer behavior with our styling.
7. Add the React Flow canvas inside the stable editor shell.
8. Verify the real prompt → preflight → preview → refine → export flow.

Do not build marketing pages, billing dashboards, or template marketplaces before this foundation has been exercised in the real editor.
