# FigureLab component library

This directory is the implementation layer for the product design system documented in [`docs/design-system`](../docs/design-system/README.md). The live catalog is available at `/components`.

## Architecture

```text
app/globals.css              Semantic tokens, themes, type roles, utilities
components/align/            Repository-owned Align UI primitives
components/product/          FigureLab workflow patterns
components/component-library.tsx
                             Interactive catalog and acceptance surface
```

The layering rule is strict: product patterns may compose `align` primitives, while primitives never import product components.

## Primitive inventory

- Actions: button, button group, toggle, toggle group, dropdown menu.
- Inputs: field, label, input, textarea, input group, checkbox, radio group, switch, slider, native select, select.
- Navigation and disclosure: accordion, breadcrumb, collapsible, command, tabs.
- Feedback: alert, badge, empty state, progress, skeleton, spinner, toast.
- Overlays: alert dialog, dialog, drawer, hover card, popover, sheet, tooltip.
- Data and structure: avatar, card, item, keyboard key, resizable panels, scroll area, separator, table.

## Product patterns

- `PromptComposer`: creation mode, prompt, attachments, aspect ratio, model summary, cost, and submit status.
- `GenerationStatus`: named steps, elapsed time, progress, and a live status announcement.
- `GenerationActivity`: collapsible operational trace with task states and active tool chips.
- `GenerationApproval`: human-in-the-loop choice when generation needs a consequential decision.
- `SourceContextCard`: source verification, excerpt, and figure-node linkage.
- `SelectionActions`: contextual AI actions beside an active canvas object.
- `ProjectCard`: accessible preview, project metadata, and project actions.
- `CanvasToolbar`: direct manipulation actions and pressed/disabled states.
- `VersionItem`: selectable, compact version history.
- `ExportOption`: export format choice with recommendation and supporting detail.
- `ReadinessList`: publication-readiness summary and individual checks.

## Usage

Import components from their owned file so bundle boundaries remain explicit:

```tsx
import { Button } from "@/components/align/button"
import { PromptComposer } from "@/components/product"
```

Use semantic tokens (`bg-background`, `bg-sidebar`, `text-muted-foreground`) instead of raw colors. Preserve visible labels, focus treatment, live-region feedback, 40 px default controls, logical-direction utilities, reduced-motion behavior, 10px control radius, square badges, and the single account pill when extending a component.

Run `npm run design:audit` after UI work. It enforces the core rules in the repository-level [`DESIGN.md`](../DESIGN.md) before lint and production build verification.

Beautiful UI is an interaction reference, not a second visual system. Rebuild useful AI patterns from our tokens, Hugeicons Stroke Rounded icons, accessible headless behavior, and `.96` press feedback; do not import its custom theme, demo autoplay, inline icon set, or shader effects by default.

## Scope boundary

This library owns interface presentation and behavior. The flowchart canvas engine, conversational runtime, generation jobs, persistence, and export pipeline are application services and intentionally do not live in the component layer.
