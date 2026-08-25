# Align UI 2.0 Figma MCP inventory

Verified 2026-08-24 against the open Figma Desktop file **Align UI ✦ Design System [2.0] (Copy)**.

- File key: `ugwpIV7ePpHMxDrQKafr2i`
- Visual authority: this Figma file
- Behavioral/code authority: FigureLab product contracts plus accessible headless behavior
- Implementation rule: call `get_design_context` on the exact node below before coding it, then validate with `get_screenshot`. The MCP code is reference output, not code to paste.

Release boundary: this inventory maps visual anatomy, not product release status. Release 1 is Flowchart-first. Illustration, Plot, Vector Canvas, Templates, and their related route frames remain preview/later until the ordered gates in `docs/production-build-spec.md` pass. Repository implementations use `components/align/` as the single generic component boundary.

## Source status and limitation

The file is complete and accessible. A read-only Figma Plugin API inventory returned all Core Elements, Base Components, Sector Products, Product Components, AI Product, and Landing pages. The ordinary root `get_metadata` response previously exposed only a subset of those pages, so it must not be used to conclude that pages are missing.

For this inventory:

1. `use_figma` was used read-only to enumerate exact page and node IDs and variant axes.
2. `get_design_context` was called on the representative implementation nodes listed below.
3. `get_screenshot` validated the primary AI shell, navigation sidebar, button, text input, modal, and empty-state representatives.

No Figma nodes and no application code were changed.

## Core elements

| Foundation | Page | Primary spec node | Supporting node | FigureLab mapping |
| --- | --- | --- | --- | --- |
| Color | `553:14956` | Color Palette overview `2623:2287` | Token System overview `2645:344`; guidelines `2675:1856` | Semantic roles in `app/globals.css`; never use raw palette utilities in product components |
| Typography | `553:14957` | Typography overview `2697:307` | Guidelines `2708:673` | Inter 400/500; FigureLab type aliases map to Align paragraph/label/title styles |
| Icons | `41:136` | Icons overview `2716:25504` | Guidelines `2743:251` | Align uses Remix glyphs. Use exact Figma-exported assets when the code glyph is not demonstrably identical |
| Shadows | `553:14959` | Shadow overview `2767:1801` | Guidelines `2767:3102` | Named regular/input/overlay elevations only |
| Motion | `553:14960` | Motion & Animation overview `2814:1329` | — | Named-property transitions, short feedback, reduced-motion support |
| Radius | `553:14961` | Corner Radius overview `2839:908` | — | 10px controls, 16–20px cards/dialogs, 20px composer, 24px inset product pane |

These overview frames are very tall. Use their page-specific child layers for implementation work if `get_design_context` returns sparse metadata.

## Base component inventory

`Representative` is the exact small node already proven to return implementation context. Variant-set IDs remain the canonical source for the complete state matrix.

| Family | Page / overview | Canonical set(s) and verified axes | Representative | FigureLab use |
| --- | --- | --- | --- | --- |
| Button | page `129:605`; overview `2955:34374` | `Buttons [1.1]` `129:1422`: type Primary/Error/Neutral; style Filled/Stroke/Lighter/Ghost; state Default/Disabled/Hover/Focus; size 40/36/32/28; icon-only on/off. Also Compact `189:3646`, Fancy `181:5291`, Link `168:4889`, Social `180:4264` | primary filled medium default `129:1421`; hover `130:476`; focus `130:556`; disabled `130:716` | All primary/secondary/icon actions; preserve one filled primary per action group |
| Button Group | page `225:2363`; overview `3016:38391` | group `493:8644`: quantities 2–6, sizes 36/32/24. Item `226:4669`: Default/Hover/Active/Disabled; icon combinations | item default `226:4668`; active `226:4678` | Editor grouped tools and bounded mode choices |
| Text Input | page `266:5230`; overview `3643:41796` | `266:5251`: 12 types; Placeholder/Hover/Focus/Filled/Disabled/Error; 40/36/32. Tag `428:4860`, Counter `428:5656`, Digit `429:5172`, Inline `429:5195` | basic 40 placeholder `266:5245`; focus `267:1063`; error `267:1279` | Search, names, numeric/export fields; keep 16px text on small screens |
| Text Area | page `434:6100`; overview `3631:1360` | `435:5725`: Default/Hover/Focus/Filled/Disabled/Error. Counter `435:5712`: Default/Error/Disabled | default `435:5726`; focus `435:7066`; error `435:7195` | Prompt composer, plan editing, revision requests |
| Modal | page `466:4630`; overview `3319:16461` | Header `466:4778`: Basic/Left Icon/Error/Warning/Success/Information × 80/56. Footer `472:566`: seven compositions. Status modal `480:1372`: four statuses × horizontal/vertical. Overlay `480:2474` | status horizontal error `480:1366`; basic header `466:4777`; basic footer `472:567` | Share, export, rename, destructive confirmation; compose header/body/footer rather than copying sector content |
| Drawer | page `486:7366`; overview `4096:39882` | Header `3187:2897`: Basic/Left Icon × Small/Large. Footer `4096:21416`: six compositions | small basic header `3187:5673`; footer stretch `4096:21448` | Mobile sidebar, inspector, versions, and secondary workflows |
| Dropdown | page `166999:140904`; overview `166999:144440` | Items `379:6629`: six content types; Default/Hover/Selected/Selected Hover/Disabled; 36/56. Misc `414:8031` | basic 36 default `379:6626`; selected `401:3360`; disabled `401:3474` | Overflow menus and action lists |
| Select | page `270:1084`; overview `3211:6627` | `270:1085`: six content types; Default/Filled/Hover/Focus/Disabled/Error; 40/36/32. Compact `377:5083`; input-compact `307:16883`; inline `332:4537` | basic 40 default `270:1086`; focus `272:809`; error `277:261` | Figure mode, model, export, inspector property selections |
| Command Menu | page `4152:24764`; overview `4212:7592` | Search `4187:559`: Default/Hover/Active. Items `4171:15653`: six content types; Default/Hover; 48/64. Footer `4172:16590` | item small default `4171:15651`; search default `4172:15911` | Global/project search and keyboard command palette |
| Tooltip | page `553:14954`; overview `3715:41752` | `2604:269`: eight placements; sizes 24/34/Large; light/dark | top-left 24 light `2604:268` | Unfamiliar icon-only tools only; never hide required labels behind a tooltip |
| Tab Menu | page `553:734`; overview `3516:12126` | Horizontal group `3511:9958` quantities 2–6; item `3511:9832` Default/Hover + Active. Vertical group `3516:10411`; item `3515:10326` | horizontal item `3511:9830`; active is a property on the same set | Inspector/Objects/Versions peers and route-local peer views |
| Segmented Control | page `553:14953`; overview `3688:26806` | group `2604:114`: text/left-icon/icon-only. Item `2603:2062`: Default/Hover/Active/Disabled | item default `2603:2061`; active `2604:35` | Compact mutually exclusive modes and list/grid controls, not primary navigation |
| Alert / Notification / Toast | page `169:2358`; overview `2880:5429` | `169:2399`: Error/Warning/Success/Information/Feature × Filled/Light/Lighter/Stroke × 32/36/Large | filled error 32 `169:2580` | Inline operational feedback and toast presentation; preserve semantic text/icon cues |
| File Upload | page `450:9364`; overview `3280:20889` | Area `450:9413`: Default/Hover. Card `451:409`: In Progress/Success/Error. Format icon `450:17234`; Image Upload `452:653` | area default `450:9410`; hover `450:9429`; progress card `451:408` | Prompt attachments, import, and vector-canvas dropzone with truthful progress/error states |
| Table | page `553:14955`; overview `3525:7648` | Row cell `553:22175`: Default/Hover/Active; priority roles; nine misc contents; 64/48. Header `587:5793`; sort `581:2327` | leading default 64 `553:22169`; header default `587:5792` | Projects/library data surfaces only when a table is materially better than cards |

## Product components

### Navigation

- Page: `3789:4743`
- Sidebar section: `3802:24565`
- Sidebar set: `3802:11759`
  - expanded 272px, HR, no feature card: `3802:11758`
  - collapsed 80px, HR: `3802:11757`
  - expanded with feature card: `3802:11755`
- Sidebar item set: `3741:45019` — Default/Hover/Active × expanded/collapsed
- Sidebar header: `3789:3886`
- User profile card: `3802:11038`
- Sidebar footer: `3789:5341`
- Topbar set: `3814:25274`

FigureLab mapping: use the expanded/collapsed geometry and state anatomy, but replace HR/Finance labels and sector feature cards with FigureLab IA. Mobile uses a drawer; it does not squeeze the desktop rail.

### Page headers

- Page: `3829:27858`
- Page Header set: `3829:27898`
  - basic: `3829:27890`
  - axes: Basic, Avatar, Left Icon, Brand, Company
- Section Header set: `3880:63403`
  - basic: `3880:63404`

The basic page-header context resolves to a white 1168px container with 32px horizontal / 20px vertical padding and a 12px main gap. FigureLab should retain its breadcrumb/editor hierarchy rather than copy sector-specific actions.

### Empty states

- Page: `3860:4301`
- HR set: `3860:4495` (18 types); first representative `3860:4496`
- Finance set: `3860:5822` (16 types); first representative `3860:5823`

There is no generic FigureLab empty-state variant in this page. Reuse the Align anatomy—compact illustration/icon, title, supporting text, and one clear action—while supplying FigureLab content and exact product icons. Do not ship HR/Finance illustrations or copy.

## AI Product source

- Page: `191042:2378`
- Canonical desktop shell/home: `191042:2379` (`Overview [AI]`, 1440×900)
  - embedded 272px sidebar: `191050:3250`
  - shell root: white, clipped, 28px radius in MCP context
- Alternate desktop overview: `191062:3000` (1440×900)
- Desktop Projects examples include `191222:3525`, `191229:23174`, `191575:53165`, and `191575:53329`. Pull context for the exact desired state before implementation.
- Mobile overview examples are 390px frames; the first verified top-level examples include `192681:62487` (390×844), `192671:16432` (390×876), and `192671:18158` (390×844).
- AI Sidebar set: `191050:3105`; expanded default `191050:3104`
- Navigation item set: `191042:9326`; default desktop `191042:9325`
- Search set: `191042:2724`; default medium `191042:2723`
- Prompt Area set: `191226:4236`
  - axes: Default/Hover/Active × desktop/mobile × add-file on/off × add-image on/off
  - desktop default with no attachments: `191226:4235`
  - hover `191226:4234`; active `191226:4233`
- Model select: `191226:4167`; default `191226:4166`
- Mobile navigation set: `192681:59134`; default `192680:16238`

FigureLab mapping: the `191042:2379` composition is the primary shell reference—272px sidebar and dominant inset main pane. Keep FigureLab’s workbench/editor routes, plan approval, generation stages, and canvas behavior. The Align AI Product frames define visual anatomy, not FigureLab domain logic.

## Representative MCP evidence

Every node in this table returned non-sparse `get_design_context` output before implementation conclusions were recorded.

| Area | Context node | Screenshot evidence |
| --- | --- | --- |
| AI shell | `191042:2379` | 1440×900 PNG |
| Sidebar | `3802:11758` | 272×900 PNG |
| Button | `129:1421` | 121×40 PNG |
| Text input | `266:5245` | 304×84 PNG |
| Modal/status composition | `480:1366` | 480×216 PNG |
| Empty state | `3860:4496` | 148×151 PNG |

Additional non-sparse context was fetched for `226:4668`, `435:5726`, `3187:5673`, `379:6626`, `270:1086`, `4171:15651`, `2604:268`, `3511:9830`, `2603:2061`, `169:2580`, `450:9410`, `553:22169`, `3829:27890`, and `191226:4235`.

Screenshot URLs are short-lived and intentionally are not committed. Re-run `get_screenshot` against the stable node IDs above for visual comparison.

## Migration rules derived from the verified source

1. Migrate component families, not isolated screens: preserve every relevant state axis shown above in `/components` before replacing consumers.
2. Use AI Product for shell geometry and prompt anatomy; use Product Navigation/Page Headers for reusable chrome; use Base Components for control anatomy.
3. Keep Radix/cmdk/Sonner only as hidden behavior layers where useful. Align owns visual anatomy and public component contracts; the headless packages retain accessible interaction behavior.
4. Exact Figma assets expire at the MCP URL. Download and commit required assets or map to a demonstrably identical repository glyph.
5. Do not copy Align’s HR, Finance, or placeholder data. FigureLab product IA and the canonical generation/editor contracts remain authoritative.
6. Validate every migrated family in the real `/components` catalog, then test its consuming product flow at desktop, 390px, 320px, keyboard-only, reduced motion, dark mode, and 200% zoom.
