# FigureLabs.ai — full product notes

Researched 19 Aug 2026 from the public marketing site, help center, legal pages, API docs, HTTP headers, and the logged-in workspace host. The in-app studio (`chat.figurelabs.ai`) was confirmed open in Dia as **FigureLabs Workspace**, but the session could not be inspected from this environment (no Dia JS execution, no screen recording). Studio details below therefore come from docs, API, and public UI — not from a logged-in walkthrough.

**Do not copy** their brand, logo, journal gallery images, or trademark. This file is a product/architecture brief for building an equivalent tool.

---

## 1. What it is

FigureLabs is a research SaaS for publication-ready scientific figures. It is **not** a custom-trained scientific-illustration foundation model. It is an **application layer**: a Next.js workspace in front of third-party image models, plus routing, credits, vectorization, canvas, export, and billing.

Positioning vs BioRender: they do not sell an icon library. They generate a base figure fast, then the user finishes it in their canvas, PowerPoint, Illustrator, or BioRender.

Company signals:

- Oxford alumni; public launch 5 Aug 2025 (PR Newswire)
- ~1–10 employees (LinkedIn)
- Terms governed by Hong Kong law (HKIAC arbitration)
- Support: `support@figurelabs.ai` / `support@figurelabs.com`
- Data stored on servers in the United States
- Domain hosted on AWS us-east (EC2) behind nginx 1.18 Ubuntu

---

## 2. Product map

Four surfaces sold as one “AI agent for scientific illustration”:

| Product | Job | Native output |
|---|---|---|
| AI Scientific Illustrator | Text / sketch / reference → journal-style figure | PNG, then optional SVG/PPTX |
| AI Flowcharts Maker | Methods, PRISMA, pipelines, architectures | **SVG first** (editable nodes) |
| AI Plot Maker | CSV / Excel / paste → Nature-style charts | PNG/SVG/PPT + **Python code** |
| Developer API | Same generation stack for ELNs, agents, writing tools | Async tasks + signed file URLs |

Public sites:

| URL | Role |
|---|---|
| https://figurelabs.ai | Marketing (locale-prefixed internally as `/en`) |
| https://chat.figurelabs.ai | Logged-in workspace (SPA; public HTML is “Loading workspace…”) |
| https://api.figurelabs.ai | Spring Boot API |
| https://files.figurelabs.ai | Presigned result files (7-day signed URLs) |
| https://figurelabs.ai/api | API marketing |
| https://figurelabs.ai/api/docs | Public API documentation |
| https://figurelabs.ai/help-center | Product docs |
| https://figurelabs.ai/pricing | Web-app plans |
| https://figurelabs.ai/api/pricing | API wallet pricing |
| https://figurelabs.ai/publication-authorization | Certificate + journal acknowledgment copy |

Other public pages: `/flowchart`, `/plot`, `/tutorial`, `/blog`, `/about`, `/affiliate`, `/terms`, `/privacy`, `/cookie-policy`.

---

## 3. Real user workflow

1. Pick a mode: Illustration / Flowchart / Plot
2. Start from **text, PDF/Word, sketch, reference image, existing figure, or data**
3. Choose **model, style, palette, aspect ratio, visual-consistency lock**
4. Generate (~15–120s depending on model)
5. Iterate in **chat** (session memory) or with tools: Region Redraw, Text Edit, Recolor, White BG, Aspect Ratio, Upscale
6. Optional: **vectorize** → Built-in Vector Canvas
7. Export PNG / JPG / PDF / SVG / PPTX, plus a **Publication Authorization Certificate** on paid plans
8. Save into **Projects / Library**, or share a password-protected link

Prompt expansion is first-class: paste an abstract, they expand it into an illustrator brief. Hallucinations are expected; the intended fix is Region Redraw, not a full regen.

---

## 4. Features (complete)

### 4.1 Illustration generator

**Inputs**

- **Text-to-Figure** — prompt, or PDF / Word / TXT
- **Image-to-Figure** — whiteboard photo, sketch, lab photo
- **Reference-to-Figure** — match style/layout of a journal figure
- **Enhance Figure** — repair / redesign an existing figure (illustration only)

**Styles:** Flat, 2.5D, 3D, Sketch, Line-Art, Hand-Drawn. Default Flat.

**Palettes:** 20+ presets (Warm Biotech, Pathology Rose, Botany Pastel, …) plus extract-from-image. API accepts 1–8 comma-separated `#RRGGBB` colors.

**Visual consistency:** upload one figure to lock icons, arrows, fonts, and overall style across a paper.

**Conversation**

- Generation unfolds as a chat
- View “thinking”
- Compare multiple versions of the same prompt
- Add new requirements to iterate on the current image
- `sessionId` continues a conversation; `quoteMessageId` targets a specific message

### 4.2 AI image editing (infinite canvas)

- Upload external images; add annotations, text, shapes, lines, pencil
- Frames; manual or automatic layouts
- **Region Redraw** — lasso an area, new prompt, rest stays intact (needs a mask)
- **Text Edit** — OCR labels, click to fix, no full regen (web-app only; 60 credits)
- **Upscale** — 2K / 4K / 8K without (claimed) loss of clarity; ~1200 DPI at 8K
- **White BG / BG remove** — one-click white/transparent canvas
- **Aspect Ratio** — fit journal or slide formats
- **Recolor** — new scheme, optional import from a reference image

### 4.3 Flowchart maker

Separate from bitmap illustration. Closer to “LLM → graph JSON → SVG canvas” than “image model → PNG”.

- From text, sketches, reference figures, or templates
- Templates: flowcharts, model architectures, cycle diagrams, timelines, PRISMA, CONSORT, fishbone
- Auto-layout of nodes and spacing
- Node editing: drag nodes, connectors, modify text
- Color mode / theme switcher (grayscale for print, tech blue for ML, …)
- Multi-select
- Direct text edit without regenerating
- Export PNG/JPG plus editable PPTX, SVG, and source formats
- Flowchart SVG is available even on the Free plan

### 4.4 Plot maker

Separate pipeline. Closer to “LLM writes plotting code → render” than an image model.

- Upload CSV / Excel or paste text
- Preview dataset
- Pick plot type, journal style, color palette
- Multi-panel assembly (auto-align, arrange, label)
- Refine via AI chat (labels, colors, chart type, layout, style)
- Export PNG, JPG, SVG, PDF, PPT — **or download Python code**
- Use cases they pitch: omics, stats (box/scatter/bar/heatmap), assays/dose-response, clinical (survival, biomarkers)
- **Not in public API v1**

### 4.5 Vectorization + Vector Canvas

Claimed wedge vs raw Nano Banana / GPT Image. Top journals often reject flattened AI PNGs.

- Direct-upload raster → high-precision editable SVG
- Or `format=vector` on generation (generate + vectorize in one task)
- Vector Canvas (paid):
  - Text, lines, geometric shapes
  - Import local images onto the canvas
  - Fill HEX, stroke color/width/dash, opacity
- Vector export: SVG and editable PPTX
- Built-in Canvas is paid-only for illustration vectors

### 4.6 Export

- Raster: PNG, JPG, PDF; upscale to 8K
- Vector: SVG, editable PPTX
- Plots also: Python source
- **Publication Authorization Certificate** — paid plans; PDF tied to a specific asset + export version
  - Confirms the figure was made/refined on FigureLabs under an eligible plan
  - Not a copyright registration, not a government document, not a scientific-accuracy guarantee
  - Does not cover third-party material embedded in the figure
  - New certificate needed after material changes / regen / new export
- Suggested journal acknowledgments live at `/publication-authorization#acknowledgment-guidance`

### 4.7 Asset management, sharing, teams

- **Projects** — past generation sessions; full conversation + images
- **Library** — saved single figures, folders
- **Vector Canvas** list — manage vectorized figures; drag-drop local images to vectorize
- **Share** — password-protected link; recipients can view conversation + image, cannot edit
- **Team workspace** — personal vs team; shared assets, members, pooled credits
- Account: billing, invoices, delete account, dissolve team (admin only)
- Affiliate program (Rewardful)
- Terms mention **desktop software**; no public download found

---

## 5. Models

They did not train these. They route to providers. Same credit cost across models on the web app; **access** is gated by plan.

| API `model` id | UI name | Provider | ~time | Notes |
|---|---|---|---|---|
| `gemini-3-pro-image-preview` | Nano Banana Pro | Google Gemini 3 Pro Image | ~30s | Reasoning + structured diagrams |
| `nano-banana-2` | Nano Banana 2 | Google Gemini 3.1 Flash Image | ~30s | Fast generalist, 4K, multi-ref |
| `nano-banana` | Nano Banana | Google Gemini 2.5 Flash Image | ~15s | Legacy / quick drafts |
| `gpt-image-2` | GPT Image 2 | OpenAI | ~90s | Labels, structured layouts |
| `gpt-image-1` | GPT Image 1.5 | OpenAI | ~90s | General diagrams |
| `seedream-5-0-260128` | Seedream 5.0 Lite | ByteDance | ~120s | Cover/poster aesthetics |
| `seedream-4-5-251128` | Seedream 4.5 | ByteDance | ~30s | Faster Seedream |
| `flux-kontext-max` | Flux.2 Max | Black Forest Labs | ~15s | Prompt adherence / realism |
| `sora-image` | Sora | OpenAI | ~90s | Spatial / process scenes |

**Plan model access (help center):**

- Basic (Free): Nano Banana Pro
- Standard (Starter): Nano Banana, Nano Banana 2, Nano Banana Pro, GPT Image 1.5
- Full (Plus / Pro / Team): all of the above plus GPT Image 2, SeeDream 4.5, Sora, Flux.2 Max

If `model` is omitted, FigureLabs picks a recommended model allowed by the key and compatible with workflow + ratio.

`403 MODEL_NOT_ALLOWED` = key/plan cannot use that model.  
`422 MODEL_MODE_NOT_SUPPORTED` = selected model cannot perform that workflow.

### Aspect ratios

Image generation uses `targetRatio`; flowcharts use `ratio`. Colon notation (`16:9`), not pixels.

Common: `16:9`, `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `21:9`.  
Flux also: `5:1`, `3:7`, `7:3`.  
GPT Image 1.5 / Sora: mainly `3:2`, `1:1`, `2:3`.

If omitted, they choose a ratio from prompt + source files + task type.

---

## 6. Credits, plans, billing

Credits power generation, editing, and vector export. Charged per action, not per token.

### Web-app credit costs

| Action | Credits |
|---|---|
| Image 1K / Region Redraw / Regenerate / White BG | 50 |
| Text Edit | 60 |
| Upscale 2K | 10 |
| Upscale 4K | 20 |
| Upscale 8K | 40 |
| SVG or PPTX vector export | 150 |

### How credits are granted

- Signup: **150** one-time (homepage marketing also says “200 free credits”)
- Daily refresh on login: **50** Free / **100** paid (expire end of day; Pro table shows 0 daily refresh)
- Referral: both sides **300**
- Plan credits at start of billing cycle
- Individual plans: unused credits **reset** monthly
- Team / Business: roll over up to **20%** of unused monthly credits
- Top-ups valid 12 months: 1,000 / $15, 3,000 / $30, 6,000 / $50, 12,000 / $90
- FAQ also mentions 1,500 credits for $15 in one place — treat live pricing as source of truth

### Web plans

| | Free | Starter | Plus | Pro | Team |
|---|---|---|---|---|---|
| Price (monthly / annual) | $0 | $12 / $10 | $35 / $20 | $99 / $54 | $35 / $20 per seat |
| Plan credits | 150 one-time | 1,000/mo | 5,000/mo | 20,000/mo | 5,000/seat/mo |
| Daily refresh | 50 | 100 | 100 | 0 | 100 |
| Credit rollover | no | no | no | no | up to 20% |
| Storage | 1 GB | 10 GB | 50 GB | 300 GB | 60 GB |
| Max image res | 1K | 4K | 8K | 8K | 8K |
| Flowchart SVG | yes | yes | yes | yes | yes |
| Plot | yes | yes | yes | yes | yes |
| Vector SVG & PPTX | no | yes | yes | yes | yes |
| Built-in Canvas | no | yes | yes | yes | yes |
| Publication auth | no | yes | yes | yes | yes |
| Models | Basic | Standard | Full | Full | Full |

Team min 2 seats; Business min 5. Annual billed as “save ~45%”. First-month discounts on individual monthly plans.

Free output = personal / internal / non-commercial / non-publishing. Paid = commercial, academic, publishing. Rights for paid output survive cancellation for work exported while paid was active.

Payments: **Stripe** (and app-store billing). Generally non-refundable because of compute cost. Cancel anytime; access lasts until period end. Invoices under avatar → Manage account → Billing → Payment history.

Upgrade behavior: tier upgrades apply immediately and grant the credit difference; billing-cycle-only changes keep current-month credits.

---

## 7. Auth, legal, privacy

**Web login modal (“Join FigureLabs”)**

- Google Sign-In (Google Identity Services iframe)
- Email continue (`name@example.com` + “Continue with email”)
- Privacy policy also mentions **Apple** login
- Agree to Terms + Privacy

**Eligibility:** 13+; under 18 needs guardian.

**Content rights**

- User keeps Input (prompts, uploads, data)
- FigureLabs does not claim ownership of raw AI output
- Paid plan: non-exclusive worldwide perpetual license to use output commercially / in journals
- Free plan: evaluation only
- User is solely responsible for scientific accuracy and journal AI-disclosure policy
- They claim they do **not** train public models on private uploads

**Certificate vs ownership:** certificate documents platform authorization, not copyright title.

**Data:** encrypted in transit and at rest (claimed). Processors: payments, hosting, analytics, marketing. GDPR-style rights listed. Account self-delete exists.

---

## 8. How it is built

```
Browser
  marketing  figurelabs.ai          Next.js App Router + i18n [locale]
  workspace  chat.figurelabs.ai     Next.js SPA (“Loading workspace…”)
        │
        ▼
nginx 1.18.0 (Ubuntu)  on AWS us-east EC2
        │
        ├─ Auth          Google Identity Services + email (+ Apple in policy)
        ├─ api.figurelabs.ai     Spring Boot
        │     POST → 202 task_id → poll GET /v1/tasks/{id}
        │     Model router → Google / OpenAI / ByteDance / BFL
        │     Proprietary raster→SVG vectorizer
        │     Safety filter (theirs + upstream); rejected = not billed
        ├─ files.figurelabs.ai   7-day signed URLs (S3-style)
        ├─ Stripe                subscriptions + API wallet ($10 min top-up)
        └─ Ops                   Rewardful, Brevo, GTM, Clarity, TikTok,
                                 Facebook, Bing, Naver
```

**Frontend evidence**

- Next.js App Router: `app/[locale]/(main)`, `(docs)`
- Headers: `x-powered-by: Next.js`, `NEXT_LOCALE=en`, `x-middleware-rewrite: /en`
- Prerendered marketing pages (`x-nextjs-prerender: 1`)
- Font: Inter
- Colors: navy `rgb(0, 33, 77)` / `#00214D`; blue `rgb(0, 119, 222)` / `#0077DE`; ink `rgb(2, 8, 23)`
- Workspace public HTML title: `FigureLabs Workspace`

**Backend evidence**

- `/actuator/health` → `application/vnd.spring-boot.actuator.v3+json` `{"status":"UP"}`
- Error envelope: `{ "code": 401000, "errorCode": "INVALID_API_KEY", "message": "...", "requestId": "..." }`
- Internal numeric codes like `1001011051` (Java/Spring style)
- `x-accel-buffering: no` (nginx in front of long jobs)
- `trace-id`, `x-request-id`
- IDs: `fl_live_…` keys, `tsk_…` tasks, `ses_…` sessions, `file_…` uploads

**The “agent” is:** prompt expansion + auto-routing (text vs sketch vs reference vs enhance vs recolor vs ratio) + session memory + mask inpaint + plan-gated models. Not a single custom image model.

---

## 9. Public API (engine spec)

Base: `https://api.figurelabs.ai`  
Docs: `https://figurelabs.ai/api/docs`  
Auth: `Authorization: Bearer fl_live_…`  
Keys shown once; first key after Stripe wallet top-up ≥ $10.  
Optional headers: `Idempotency-Key` (24h, per customer), `X-Request-Id`, `X-Trace-Id`.

**Pattern:** submit → `202 Accepted` + `task_id` → poll `GET /v1/tasks/{id}` every 2–5s → download `output_url` (7 days). Failed / rejected / canceled = **not billed**.

Money fields are **integer USD cents** (`80` = $0.80).

### Endpoints

| Method | Path | Price | Output |
|---|---|---|---|
| POST | `/v1/images/generations` | $0.80; $1.30 if `format=vector` | PNG or SVG |
| POST | `/v1/images/generations` `mode=region_redraw` | $0.80 | needs image + **one mask** |
| POST | `/v1/images/generations` `mode=white_background` | $0.80 | image or sessionId; prompt optional |
| POST | `/v1/images/upscale` | $0.02 / $0.04 / $0.08 | 2K / 4K / 8K PNG |
| POST | `/v1/images/vectorize` | $0.50 | one raster → SVG |
| POST | `/v1/flowcharts` | $0.80 | SVG |
| POST | `/v1/files` | — | multipart; 201 Created |
| GET | `/v1/tasks/{task_id}` | — | shared status |

Plot generation, click-to-edit text, and the vector canvas editor are **web-app only**, not in public API v1.

### Generations auto-routing (`mode=generations`, default)

Inferred from prompt + files + palette + ratio:

- Text to Figure — prompt only
- Sketch to Figure — prompt + rough sketch
- Reference to Figure — prompt + visual/layout reference
- Enhance — existing image + enhance instruction
- Recolor — existing image + recolor instruction + optional `colorPalette`
- Aspect Ratio — existing image + optional `targetRatio`

Fixed modes: `region_redraw`, `white_background`.

### Generation request fields

Request body is **camelCase** (`targetRatio`, `sessionId`, `colorPalette`). Responses are **snake_case**.

| Field | Required | Notes |
|---|---|---|
| prompt | conditional | max 2,000 chars |
| mode | no | default `generations` |
| model | no | omit for auto-select |
| targetRatio | no | e.g. `16:9` |
| style | no | `Flat`, `3D`, `2.5D`, `hand_drawn`, `line_art` |
| format | no | `png` (default) or `vector` |
| quality | no | V1 only `high`; no price change |
| sessionId | no | continue conversation |
| colorPalette | no | 1–8 `#RRGGBB` comma-separated |
| files / imageUrl | no | URL, data URI, file object, file ID, or array |
| mask | for region_redraw | one image |
| quoteMessageId | no | requires sessionId |
| safetyIdentifier | no | non-PII end-user ref |

Example:

```bash
curl -X POST https://api.figurelabs.ai/v1/images/generations \
  -H "Authorization: Bearer $FIGURELABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a clean scientific figure of the PI3K-AKT signaling pathway",
    "mode": "generations"
  }'
```

`202`:

```json
{
  "task_id": "tsk_01JZ9F7KQ2",
  "status": "processing",
  "estimated_price": 80,
  "currency": "USD"
}
```

Success poll:

```json
{
  "task_id": "tsk_01JZ9F7KQ2",
  "status": "succeeded",
  "output_url": "https://files.figurelabs.ai/presigned/...",
  "output_type": "image/png",
  "actual_price": 80
}
```

### Files

- `POST /v1/files` multipart: `file` + optional `purpose` (`general`, `image_generation`, `flowchart`, `mask`)
- Images ≤ 16 MiB; documents ≤ 32 MiB; no video/audio
- Expire in 7 days; deletion drops storage immediately
- Self-serve storage tied to **lifetime wallet top-up**, not remaining balance:

| Wallet total after top-up | File storage |
|---|---|
| $0 before first top-up | 0 GB |
| > $0 up to $10 | 1 GB |
| > $10 up to $50 | 2 GB |
| > $50 below $200 | 5 GB |
| $200+ | 20 GB |
| Enterprise default | 50 GB (or contract) |

### Task statuses

| Status | Terminal | Charged |
|---|---|---|
| pending | no | no |
| processing | no | no |
| succeeded | yes | yes |
| failed (`UPSTREAM_FAILED`) | yes | no |
| rejected (`UPSTREAM_SAFETY_REJECTED`) | yes | no |
| canceled | yes | no |

Poll slower for `gpt-image-2` and `seedream-5-0-260128`. Copy `output_url` to your own storage; it expires in 7 days.

### Errors (selected)

HTTP envelope:

```json
{
  "code": 401000,
  "errorCode": "INVALID_API_KEY",
  "message": "Invalid API key.",
  "requestId": "req_abc123"
}
```

| HTTP | errorCode | Meaning |
|---|---|---|
| 401 | INVALID_API_KEY / API_KEY_REVOKED | bad or revoked key |
| 403 | API_KEY_DISABLED / CUSTOMER_DISABLED / MODEL_NOT_ALLOWED | permission |
| 402 | INSUFFICIENT_BALANCE / BILLING_FAILED | wallet |
| 409 | IDEMPOTENCY_KEY_CONFLICT | same key, different body |
| 429 | RATE_LIMITED / CONCURRENT_TASK_LIMIT_EXCEEDED | backoff |
| 422 | INVALID_PROMPT / MODEL_MODE_NOT_SUPPORTED | validation |
| 413 | STORAGE_QUOTA_EXCEEDED | file storage |
| 500 | INTERNAL_ERROR | retry |

File-related numeric codes: `1001011051` missing file ID, `1001011052` other account’s file, `1001011053` unsupported type, `1001011054` >5 input files, `1001011055` decoded size too large, `1001011019` task missing/wrong account.

Rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

### API commercial pricing

No subscription required. Per successful output. Failed/rejected not billed.

- Generate / edit / flowchart: **$0.80**
- Vectorize add-on: **$0.50** (generation+vector = $1.30)
- Upscale 2K / 4K / 8K: **$0.02 / $0.04 / $0.08**
- Volume discounts / invoicing via enterprise

---

## 10. Marketing site UX (logged-out)

**Nav:** logo · Products (Illustrator, Flowcharts, Plot) · Pricing · Resources (docs, affiliate, tutorials, blog) · API · “Start for free”

**Hero:** “Create Scientific Figures from **Text / Sketch / Reference**” (rotating word). CTA Start for Free. Subcopy: generate, edit, export — PPTX & SVG, high-res PNG/JPG. Trust: “200 free credits \| No credit card required.” Hero mock shows chat+sketch on the left and canvas+toolbar on the right (Region Redraw, Text Edit, Upscale, White BG, Export).

**Sections:** university logo marquee (“Trusted by 600K+ researchers”) · Generate / Edit / Vectorize feature rows · “Published with FigureLabs” journal cards · “Made with FigureLabs” gallery · footer CTA “Stop Drawing. Start Publishing.”

**Login:** modal, not `/login`. Google + email.

---

## 11. Workspace (logged-in) — partial

Confirmed:

- Host: `https://chat.figurelabs.ai/`
- Title: `FigureLabs Workspace`
- Opened in Dia after Google signup
- Public HTML is a Next.js shell that only shows “Loading workspace…” until auth

From help center + reviews (not visually verified in-session):

- Home modes: Illustration, Flowchart, Data Chart / Plot
- Controls: enhance, sketch convert, reference figure, colors, visual consistency, model, style, aspect ratio
- Inside a project: chat history, refs + generated images, regenerate/save/copy/feedback
- Upscale, recolor, aspect ratio, text edit, image analysis
- Canvas: text, shapes, lines, drawing, frames, image placement
- Entry point to Vector Canvas

**Not captured in this research:** exact logged-in layout, left-nav labels, credit chip, model picker UI, canvas tool order, flowchart node inspector, plot data preview, billing screens.

---

## 12. What an equivalent product must implement

Same product shape — not a pixel clone.

1. **Web app** — landing, pricing, studio, flowchart, plot
2. **Auth / billing** — Google + email, Stripe subscriptions + credit ledger
3. **Job runner** — async tasks, never block HTTP on 90s image gen
4. **Model gateway** — start with Gemini image (Nano Banana family) + OpenAI GPT Image; add Flux/Seedream later
5. **Scientific prompt layer** — expand abstracts; force white bg, labels, BioRender-like flat style
6. **Edits** — mask inpaint, OCR text edit, white-bg/rembg, upscaler
7. **Flowcharts** — LLM → structured graph → SVG canvas, not a bitmap
8. **Plots** — LLM → Python (matplotlib) in a sandbox → PNG/SVG + downloadable `.py`
9. **Vectorize** — raster→SVG + simple vector editor
10. **Storage** — S3-compatible signed URLs; 7-day temps for API; longer for user library
11. **Teams, share links, publication certificate** — later

Suggested first slice: **Studio v1** — text/sketch/reference generate → chat iterate → region redraw / text edit / white BG / upscale → PNG export + credits.

---

## 13. Open questions / gaps

- Exact logged-in studio chrome (needs screenshots from `chat.figurelabs.ai`)
- How the proprietary vectorizer actually traces layers (public API only exposes “raster in, SVG out”)
- Whether flowchart SVG is LLM-structured or image-then-trace
- Plot Python stack (matplotlib vs plotly vs ggplot-style)
- Desktop app (mentioned in Terms only)
- Text-edit OCR pipeline (web-only)
- Internal chat/workspace API (not public; do not scrape)

---

## 14. Sources

- https://figurelabs.ai and `/pricing`, `/flowchart`, `/plot`, `/api`, `/api/docs`, `/api/pricing`
- https://figurelabs.ai/help-center
- https://figurelabs.ai/terms, `/privacy`, `/publication-authorization`, `/about`, `/tutorial`, `/blog`, `/affiliate`
- https://chat.figurelabs.ai (host + public shell only)
- https://api.figurelabs.ai (`/actuator/health`, `/v1/images/generations` unauthenticated error)
- PR Newswire launch (5 Aug 2025)
- Help-center glossary: prompt expansion, hallucination, enhancer vs upscale
- Google “Nano Banana” = Gemini native image models (public Google docs)
