# FigureLab design contract

Read and follow this file before every UI change. The detailed rationale and examples live in [`docs/design-system`](./docs/design-system/README.md); this file is the enforceable contract for humans and coding agents.

FigureLab chrome follows **Align UI 2.0**, with the purchased Figma file `ugwpIV7ePpHMxDrQKafr2i` as the visual source of truth. Tokens, type, radius, elevation, control anatomy, and exact assets come from that file; [alignui.com](https://www.alignui.com/) is supporting documentation only. Product information architecture stays FigureLab: a two-pane, Flowchart-first Release 1 workbench. Illustration, Plot, Vector Canvas, Templates, and their related routes are preview/later surfaces until the Flowchart production gates in `docs/production-build-spec.md` pass.

Do not restore the previous ChatGPT graphite-only clone: no achromatic-only chrome, no hairline-only elevation, no system-font-only UI, and no pill-as-default composer.

## Visual direction

Align UI is a **structured SaaS kit**: Inter, a blue primary (`#335CFF` / `blue-500`), Gray neutrals, soft stroke + layered shadows, and 10px control corners. Surfaces are white (or inverted near-black), not warm paper. Status may use the kit’s semantic colors (success, error, warning, information) as long as color is never the only cue.

The generated figure on the canvas is still the hero. Chrome should look like Align UI — not a marketing landing page, not a generic three-card grid, and not a graphite ChatGPT clone.

## Non-negotiable system

- **Typography:** Inter (`next/font`) for UI and display. System mono (`ui-monospace`, SFMono-Regular, Menlo, Consolas) for IDs, dimensions, code, and reproducible values. Align weights are **400** (paragraph) and **500** (titles, labels). `font-semibold` (600) is allowed for a single page title when Inter 500 is too light; do not use 300 or 700+ in product chrome.
- **Type scale:** map product utilities to Align styles — `text-display` / `text-title` → title-h5 (24 / 32 / 500); `text-heading` → label-lg (18 / 24 / 500) for index page titles; `text-title-sm` → label-md (16 / 24 / 500); `text-body` → paragraph-md (16 / 24 / 400); `text-ui` → label-sm (14 / 20 / 500); `text-caption` / `text-meta` → paragraph-sm (14 / 20 / 400).
- **Spacing:** 4 px base. Prefer 4 / 8 / 12 / 16 / 20 / 24 / 32. Element gap is 8px, section gap is 24px, card padding is 16–20px. Do not add arbitrary `p-[…]` / `gap-[…]` values.
- **Color:** semantic tokens from `app/globals.css`. Never place hex, RGB, HSL, `bg-white`, `text-black`, or raw palette utilities (`bg-blue-500`, `text-gray-600`) inside components. Use `bg-primary`, `text-muted-foreground`, `bg-success-lighter`, `text-destructive`, and the other mapped roles.
- **Shape:** controls, nav rows, and inputs use **10px** (`rounded-lg`). Cards and dialogs use **16–20px** (`rounded-xl` / `rounded-2xl`). Badges use **6px** (`rounded-md`) or full pill only for true status chips. The composer is a **20px** rounded card, not a ChatGPT pill. Nested radii must stay concentric.
- **Icons:** Hugeicons Stroke Rounded (`@/components/icons`) until a dedicated Remix Icon pass is scheduled. Align UI’s Figma kit uses Remix Icon; we keep Hugeicons to avoid a second conflicting icon package. Icons inherit `currentColor`; icon-only controls need an accessible name and tooltip when meaning is unfamiliar. Chrome icons are 16–20px.
- **Elevation:** Align regular + input shadows. Cards, menus, dialogs, and the composer use `shadow-regular-xs`, `shadow-regular-sm`, `shadow-regular-md`, `shadow-input`, or `shadow-overlay`. Do not use raw Tailwind `shadow-sm` / `shadow-lg` / `shadow-2xl` or colored glows.
- **Motion:** transition only named properties. Interactive color response is 150 ms or faster; press scale is exactly `.96`; never use `transition-all`, autoplay decoration, or bouncing springs. Honor reduced motion.
- **State:** every control must define relevant default, hover, focus-visible, active, disabled, loading, error, and selected states.
- **Density:** compact Align density. Chrome is clearer than the old graphite shell, but content still dominates.

## Locked palette

Source: official Align UI kit tokens (primary **Blue** `#335CFF`, neutral **Gray** `#171717` / `#f7f7f7`). Implemented as semantic roles in `app/globals.css`.

| Role | Light | Token |
| --- | --- | --- |
| Canvas / cards | `gray-0` `#ffffff` | `--bg-white-0` → `--background`, `--card` |
| Weak fill / sidebar hover | `gray-50` `#f7f7f7` | `--bg-weak-50` → `--muted`, `--sidebar` |
| Soft fill | `gray-200` `#ebebeb` | `--bg-soft-200` |
| Primary text | `gray-950` `#171717` | `--text-strong-950` → `--foreground` |
| Secondary text | `gray-600` `#5c5c5c` | `--text-sub-600` → `--muted-foreground` |
| Tertiary / disabled | `gray-400` `#a3a3a3` | `--text-soft-400` → `--hollow` |
| Stroke | `gray-200` `#ebebeb` | `--stroke-soft-200` → `--border` |
| Primary | `blue-500` `#335CFF` | `--primary-base` → `--primary` |
| Primary hover | `blue-700` `#2547D0` | `--primary-darker` |
| Primary tint | `blue-alpha-10` | `--primary-alpha-10` → `--accent` |
| Success | `green-500` `#1FC16B` | `--success` |
| Warning | `orange-500` `#FA7319` | `--warning` |
| Error | `red-500` `#FB3748` | `--destructive` |
| Overlay | gray 24–56% | `--overlay` |

Dark mode follows Align’s invert: `--bg-white-0` maps to `gray-950`, text to `gray-0`, strokes to `gray-800`, primary stays blue (`blue-400` in dark). Do not invent a colorful extra theme.

A filled primary control is **blue with white text**. Ghost and stroke (outline) remain the default for secondary chrome. Document node colors in `lib/flowchart/palette.ts` are portable artifact colors — they must not leak into application chrome.

## Web-native quality

- Keep the real information architecture conventional: links navigate, buttons act, tabs switch peer views, and sheets hold secondary tasks.
- Preserve safe-area insets with `safe-area-shell` for full-screen/PWA layouts.
- Desktop controls target 40 px (Align medium); coarse-pointer controls expand to at least 44 px.
- Inputs render at 16 px on small screens so iOS Safari does not zoom unexpectedly.
- Counters, credits, costs, dimensions, timers, and changing metrics use `tabular-nums`.
- The interface must reflow at 320 px, survive 200% zoom, work by keyboard, and preserve visible focus.
- Do not depend on experimental CSS for meaning.

## Product priority

Polish in funnel order:

1. Public homepage, social previews, and product demonstrations.
2. Onboarding, upgrade, and checkout decisions.
3. The first successful prompt-to-figure experience.
4. Core creation, refinement, and export workflow.
5. Settings and low-frequency administration.

Workbench `/` and editor `/project/demo` stay a **two-pane product** (sidebar + inset main pane). They must look like Align UI AI Product: 272px white sidebar, inset 24px-radius canvas, Inter titles, blue primary actions, and a nested composer card (muted well + raised inner). The default empty-state path for Release 1 is Flowchart: describe or attach a source, review the plan, approve generation, edit the structural draft, run readiness, and export. Illustration and Plot generation may remain visible only when clearly labeled Preview and must not displace or imply completion of the R1 path.

## Product layout

Product routes (`/`, `/library`, `/projects`, `/project/*`) share one `AppShell`. Do not rebuild a marketing page with a top header nav, icon rail, template gallery, or stacked hero cards.

Desktop home follows Align UI **AI Product**:

1. **Left sidebar (272px):** white, no trailing stroke. Brand mark, collapse control, weak-50 search field, a **New flowchart** row in primary text (plus on `primary-alpha-10`), then Projects and Library, grouped recents, and a profile footer. Templates and Vector Canvas may appear only as clearly labeled Preview/Later destinations. Collapse to an 80px icon rail on desktop and a sheet on small screens.
2. **Main pane:** inset 6px from the canvas (`bg-muted`), **24px** rounded card (`rounded-3xl`) with a soft stroke. Breadcrumb header inside the pane (parent / current). Empty home: centered greeting + caption, composer pinned to the bottom, one suggestion chip, tiny disclaimer. A thread keeps that same composer at the bottom.

`/project/*` may grow a **third pane** — a full-height right inspector (~320px) for Inspector / Objects / Versions. On mobile that rail becomes a sheet. Do not put the inspector in a floating card.

## Cleanliness

These products feel clean because chrome is systematic, not loud:

- Two panes on home. No template gallery as the first screen, no global top nav, no badge-hero.
- Sections separate by space, one-shade surface shift, or a single soft stroke — not stacked boxed grids.
- One filled primary per group (usually New figure or Send). Everything else is stroke or ghost.
- Status color is allowed; decoration and gradients are not.

## Reference workflow

Before introducing a new pattern:

1. Prefer the exact Align UI 2.0 Figma component anatomy recorded in [`docs/design-system/align-mcp-inventory.md`](./docs/design-system/align-mcp-inventory.md) and mapped in [`docs/design-system/align-kit-map.md`](./docs/design-system/align-kit-map.md). Use button modes filled / stroke / lighter / ghost, input + wrapper, sidebar row, command menu, file upload dropzone, dialog, badge.
2. Review comparable product flows when Align has no equivalent, and record useful behavior in [`references.md`](./docs/design-system/references.md).
3. Extend an existing repository-owned primitive in `components/align/` (filled / stroke / lighter / ghost, input inset ring, segmented weak-50 well) before adding another component or dependency. This is FigureLab's only generic component boundary; do not recreate a legacy parallel primitive folder or install a second component library.
4. Add a semantic token only when a real new role exists.
5. Exercise the result in the real browser, including interaction states.

## Required checks

Run before handing off UI work:

```bash
npm run design:audit
npm run lint
npm run build
```

Also inspect the affected flow in light and dark appearances, keyboard-only, reduced motion, 320 px reflow, and 200% zoom when the surface exists.

## Weekly 20-minute audit

- 4 minutes: Inter, 14/16/24 Align scale, 400/500, wrapping, and tabular changing values.
- 4 minutes: 4/8/12/16/20/24 rhythm, 8px element gaps, 24px section gaps, 16–20px card padding.
- 4 minutes: semantic Align colors, both appearances, contrast, and one-primary-action discipline.
- 4 minutes: 10px controls, 16–20px cards/dialogs, 20px composer, named Align shadows.
- 4 minutes: hover, focus, active, disabled, loading, error, keyboard, and touch-target states.

Fix systemic drift in primitives or tokens first. Do not polish isolated settings screens while a higher-priority funnel surface remains incomplete.
