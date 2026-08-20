# FigureLab design contract

Read and follow this file before every UI change. The detailed rationale and examples live in [`docs/design-system`](./docs/design-system/README.md); this file is the enforceable contract for humans and coding agents.

## Visual direction

FigureLab is a calm, artifact-first scientific workspace: Energy-style editorial clarity, ChatGPT-style pill controls, DataFast precision, Beautiful UI interaction grammar, and owned shadcn/Radix primitives.

Do not use purple-blue gradients, glowing borders, default dashboard card grids, decorative AI effects, emoji navigation, or generic three-card marketing layouts.

## Non-negotiable system

- **Typography:** use the ChatGPT-style native system stack everywhere: `-apple-system-body`, `ui-sans-serif`, `-apple-system`, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, then platform emoji fallbacks. Use only 400 and 500 in product UI. Geist Mono is reserved for IDs, dimensions, code, and reproducible values. Do not introduce a second display family.
- **Spacing:** use the 4 px Tailwind spacing scale. Do not add arbitrary padding, margin, or gap values.
- **Color:** use semantic OKLCH tokens from `app/globals.css`. Never place hex, RGB, HSL, `bg-white`, `text-black`, or raw palette utilities inside components.
- **Shape:** use one radius family, not one literal radius. Controls use 12 px, bounded surfaces 16 px, the composer 28 px, and buttons/avatars use the pill or circle role. Nested radii must remain concentric. Continuous/squircle corners are progressive enhancement only.
- **Icons:** Lucide only. Icons inherit `currentColor`; icon-only controls need an accessible name and tooltip when their meaning is unfamiliar.
- **Elevation:** use only `shadow-surface`, `shadow-surface-hover`, or `shadow-overlay`. Borders communicate structure; shadows communicate elevation. Never add colored glows.
- **Motion:** transition only named properties. Interactive color response is 150 ms or faster; press scale is exactly `.96`; never use `transition-all`, autoplay decoration, or bouncing springs. Honor reduced motion.
- **State:** every control must define relevant default, hover, focus-visible, active, disabled, loading, error, and selected states. Do not ship dead-looking actions.

## Web-native quality

- Keep the real information architecture conventional: links navigate, buttons act, tabs switch peer views, and sheets hold secondary tasks.
- Preserve safe-area insets with `safe-area-shell` for full-screen/PWA layouts.
- Desktop controls target 40 px; coarse-pointer controls expand to at least 44 px.
- Inputs render at 16 px on small screens so iOS Safari does not zoom unexpectedly.
- Counters, credits, costs, dimensions, timers, and changing metrics use `tabular-nums`.
- The interface must reflow at 320 px, survive 200% zoom, work by keyboard, and preserve visible focus.
- Do not depend on experimental CSS for meaning. `corner-shape: squircle` may enhance supported browsers while normal radius remains the fallback.
- Do not simulate native haptics in this web app. Use visual, textual, and accessible state feedback.

## Product priority

Polish in funnel order:

1. Public homepage, social previews, and product demonstrations.
2. Onboarding, upgrade, and checkout decisions.
3. The first successful prompt-to-figure experience.
4. Core creation, refinement, and export workflow.
5. Settings and low-frequency administration.

Every first-run surface should communicate one clear outcome. Do not spend equal polish on low-leverage screens while the primary creation path is incomplete.

## Reference workflow

Before introducing a new pattern:

1. Review at least five current comparable flows, using Mobbin or direct product inspection when relevant, and record the useful behavior in [`references.md`](./docs/design-system/references.md).
2. Explain the useful behavior, then adapt it to FigureLab instead of cloning visual branding.
3. Extend an existing primitive before adding another component or dependency.
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

- 4 minutes: font families, weights, type roles, wrapping, and tabular changing values.
- 4 minutes: spacing rhythm, shared alignment edges, and arbitrary-value drift.
- 4 minutes: semantic colors, both appearances, contrast, and one-primary-action discipline.
- 4 minutes: radius roles, concentric nesting, icon consistency, and elevation tokens.
- 4 minutes: hover, focus, active, disabled, loading, error, keyboard, and touch-target states.

Fix systemic drift in primitives or tokens first. Do not polish isolated settings screens while a higher-priority funnel surface remains incomplete.
