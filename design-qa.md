# FigureLab landing page design QA

## Comparison target

- Current source visual truth: `https://figurelabs.ai/` captured on 2026-08-25 at `/private/tmp/figurelab-figurelabs-refresh/01-reference-1280.png`
- Current implementation desktop: `/private/tmp/figurelab-figurelabs-refresh/02-implementation-1280.png`
- Current implementation mobile: `/private/tmp/figurelab-figurelabs-refresh/03-implementation-390.png`
- Earlier composition reference: `/private/tmp/figurelab-rankveo-audit/01-rankveo-desktop-top.png`
- Align UI references: file `ugwpIV7ePpHMxDrQKafr2i`, header `193270:121692`, features `191569:27587`, CTA `192516:10014`, footer `191875:89409`
- Initial FigureLab baseline: `/private/tmp/figurelab-rankveo-audit/02-figurelab-desktop-top.png`
- Final implementation desktop: `/private/tmp/figurelab-rankveo-audit/16-figurelab-production-desktop-final.png`
- Final implementation mobile: `/private/tmp/figurelab-rankveo-audit/17-figurelab-production-mobile-final.png`
- Final side-by-side comparison: `/private/tmp/figurelab-rankveo-audit/15-final-reference-vs-implementation.png`
- Focused product evidence: `/private/tmp/figurelab-rankveo-audit/08-figurelab-redesign-product.png`
- Focused interaction evidence: `/private/tmp/figurelab-rankveo-audit/09-figurelab-redesign-edit-tab.png`

## Viewport and normalization

- Desktop source and implementation: 1280 x 720 CSS pixels, device scale factor 1.
- Mobile implementation: 390 x 844 CSS pixels, device scale factor 1.
- The source and implementation desktop captures use the same crop and dimensions. The source announcement banner is comparator-specific and was intentionally not copied.
- State: public landing page, light theme, first capability selected. Mobile evidence uses the closed navigation state.

## Full-view comparison

The implementation now matches the refreshed FigureLabs reference's important composition: a compact announcement and navigation area, a centered product-specific headline, a large prompt composer as the primary action, selectable prompt examples, and immediate capability proof. FigureLab keeps its own Align UI tokens, Flowchart Release 1 scope, and review-first positioning rather than copying the source's illustration/plot claims, institution logos, publications, pricing, or testimonials.

## Focused-region comparison

- Product proof uses current FigureLab editor and plan-review captures rather than a generic kit dashboard.
- The hero composer is functional: examples populate the textarea and submission carries the prompt into the real `/create` composer.
- The capability selector exposes one detailed state at a time, avoiding the repeated equal-weight card grid from the baseline.
- Section rhythm alternates white, muted, and inverted Align UI surfaces without introducing a new palette.
- Mobile reflows to a single column at 390 px with no horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: Inter, 400/500 weights, tighter display tracking, readable mobile wrapping, and Align label/body scales are preserved.
- Spacing and layout rhythm: 4 px spacing scale, 10 px controls, 16-20 px cards, 40 px product stage, and a shorter 4,259 px desktop page replace the baseline's large dead zones.
- Colors and tokens: Align gray neutrals and `#335CFF` semantic primary are used through project tokens. The marketing surface remains light even when the saved product theme is dark.
- Image quality and assets: two real 1280 x 800 FigureLab captures are served as optimized local images; no placeholder dashboard or handcrafted illustration remains.
- Copy and content: claims are limited to implemented Release 1 behavior: plan review, editable objects, revisions, readiness checks, SVG, and PNG.

## Comparison history

### Initial findings

- P1: The dark landing page contradicted the supplied Align UI light landing references and made the product feel like a generic dashboard theme.
- P1: The hero and feature grid used code-native mockups instead of authentic product proof.
- P2: Three repeated equal-weight feature cards and evenly spaced sections made the page feel assembled from a kit.
- P2: The hero product preview initially waited for too much viewport intersection and appeared blank above the fold.
- P2: shared button typography utilities removed the primary foreground color during class merging, producing dark text on blue controls.

### Fixes made

- Scoped the public landing page to the Align UI light token set.
- Rebuilt the hero and product story around real FigureLab captures.
- Replaced the repeated card composition with a controlled capability switcher, compact workflow, inverted use-case block, and direct CTA.
- Lowered the hero preview reveal threshold so the product enters the first viewport.
- Corrected the shared button size typography classes so semantic foreground colors are retained.
- Replaced the passive screenshot-first hero with a functional prompt-first conversion path based on the refreshed FigureLabs composition.
- Added a truthful four-part capability strip and expanded the workflow to Input, Plan, Edit, and Export.
- Added URL prompt seeding so the landing page action arrives in the real workspace ready to submit.

### Post-fix evidence

- Desktop: no horizontal overflow at 1280 x 720.
- Mobile: no horizontal overflow at 390 x 844.
- Product capability switching works and updates `aria-pressed` state.
- Mobile navigation opens and exposes all primary routes.
- Primary button computed colors are blue `rgb(51, 92, 255)` with white `rgb(255, 255, 255)` text.
- Production browser console: zero error-level entries.
- Landing prompt example selection and `/create?prompt=...` handoff are verified in the production build.

## Findings

No actionable P0, P1, or P2 visual differences remain in the normalized source/implementation comparison. The implementation intentionally uses FigureLab's real product scope and evidence instead of copying FigureLabs' institution logos, publication claims, illustration/plot availability, sale banner, or testimonials.

## Follow-up polish

- P3: Replace the current QA product captures after the next major editor visual revision so the landing always depicts the latest shipped chrome.

final result: passed
