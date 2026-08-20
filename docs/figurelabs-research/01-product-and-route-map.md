# Product and route map

## Global authenticated shell — verified

Every inspected signed-in route uses the same lightweight shell:

- FigureLabs logo/back-home link at top left.
- Credit/upgrade pill at top right. The inspected account displayed `Upgrade` and `200` credits.
- Notifications popover trigger.
- Avatar/account popover trigger.
- Compact left rail with Home, Projects, Library, Vector Canvas, and Refer & Earn.
- Main content on a pale blue-gray background with dark navy primary actions.

The rail is icon-first visually but exposes descriptive links to assistive technology. The active item is a filled navy circle.

## Authenticated routes — verified

| Route | Purpose | Verified empty/default state |
|---|---|---|
| `/` | Three-mode workbench and template discovery | Flowchart selected, empty prompt, four recommended templates, no recent projects |
| `/projects` | Resume conversation-based projects | Date range, grid/list toggle, sort control, `No projects yet.` |
| `/library` | Organize saved single-image assets | Folder search, `New folder`, Favorites count, Recently updated |
| `/vector-canvas` | Manage vectorized figures/canvases | Search, grid/list toggle, sort control |
| `/invitation` | Referral invite link and email invite | `Give 300, Get 300`, copy-link action, email field, rules/history links |
| `/invitation/rules` | Referral program terms | Long-form terms with reward, anti-abuse, limit, and contact sections |
| `/invitation/history` | Referral activity ledger | Linked from the referral page; not yet deeply exercised |

## Home workbench — verified

The default signed-in page is a centered creation surface with three segmented tabs:

1. **Illustration**
2. **Flowchart**
3. **Plot** with a `Beta` badge

Observed Flowchart state:

- Heading: `Flowchart, made effortless.`
- Supporting copy: turns text, complex logic, and research steps into editable, publication-ready diagrams.
- Large prompt textarea with rotating example text.
- File attachment control and separate upload action.
- Aspect-ratio picker whose default is `Auto`.
- Circular/arrow Generate action; disabled while the prompt/input is empty.
- Templates section with `All`, `Recommended`, `Flowchart`, `Model Architecture`, `Cycle Diagram`, and `Timeline` filters.
- Four recommended cards: `Flowchart-040`, `Model Architecture-021`, `Cycle Diagram-012`, and `Timeline-009`.
- Each card exposes Preview, Use, and Open in canvas actions.
- Recent Projects section with an explicit empty state.

After the live generation, Recent Projects updated on a fresh Home load without another generation. It displayed a `See All` link and the same thumbnail/title/rename/last-active/overflow card used on the Projects index.

Observed Illustration state after switching modes:

- Heading: `Scientific figures, made effortless.`
- Supporting copy covers text, sketches, and reference images.
- Input-mode toggles: Enhance Figure, Sketch to Figure, and Add Ref Figure.
- Source upload plus a separate file input used with palette/consistency features.
- Color palette picker.
- Visual Consistency picker.
- Model picker; inspected default was Nano Banana Pro.
- Style picker; inspected default was Flat.
- Ratio picker; inspected default was Auto.
- Create from Templates action.

Submitting a valid prompt with `Ctrl+Enter` is supported and creates a durable `/project/{projectId}` route.

## Projects — verified

Purpose: automatically persisted conversation sessions that can be reopened.

Controls:

- Start Date and End Date filters.
- Grid View and List View.
- Sort toggle; observed label `Oldest first`.
- Empty state: `No projects yet.`

Published docs add that a project stores the complete conversation history and corresponding generated images.

The live Illustration test proved that a project route is created as soon as generation begins. After the Projects index recovered from an intermittent `Loading workspace...` state, the populated card showed:

- generated-image thumbnail;
- prompt-derived project title;
- direct open action;
- Rename project action;
- `Last active` date;
- unlabeled overflow menu trigger.

The visible credit pill on the populated Projects page had already updated to 150.

## Library — verified

Purpose: curated asset management for saved individual scientific figures, separate from full projects.

Controls/state:

- Folder search placeholder: `Search folder...`.
- `New folder` action.
- Favorites system with image count; inspected state was zero.
- `Recently updated` ordering/grouping.

Published docs say users can create folders and store favorite single images for quick access.

## Vector Canvas index — verified

Purpose: manage and re-open vectorized figures.

Controls/state:

- Search placeholder: `Search vector canvases...`.
- `Oldest first` sort control.
- Grid View and List View.

Published docs say local images can also be dragged onto the vector canvas for conversion.

## Refer & Earn — verified

The page contains:

- Hero: `Give 300, Get 300`.
- One personal invite link with a Copy Link action.
- Email invitation field and disabled Send Invite until a valid email is supplied.
- Activity Rules and View Full History links.

Never store or commit a real user's referral code in this repository.

The linked rules page currently conflicts with the referral hero; see the contradictions document.

## Public product surface — published

Public routes relevant to the authenticated product:

- `/` — illustration product overview.
- `/flowchart` — flowchart workflow and feature overview.
- `/plot` — plot workflow and feature overview.
- `/pricing` — plan cards and pricing FAQ.
- `/help-center` — consolidated product documentation.
- `/tutorial` — four tutorials: generate, tweak, export, edit on canvas.
- `/api` — asynchronous scientific figure API overview.
- `/api/pricing`, `/api/docs`, and per-capability API pages are linked from the API product.

## Authentication entry — verified on public site

`Start for Free` opens an in-page `Join FigureLabs` modal rather than navigating immediately. The modal includes:

- Continue with Google;
- email address input and Continue with email;
- Terms and Privacy links;
- close action.

The Google control is hosted in an embedded Google Identity frame and advertises that it opens a new tab. The email verification/passwordless steps were not submitted.
