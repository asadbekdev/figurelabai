# Align UI 2.0 kit map

Visual source of truth: Figma Desktop file `ugwpIV7ePpHMxDrQKafr2i` (Align UI ✦ Design System 2.0). Walked with nothing selected so every page is available by id.

FigureLab keeps product IA: a two-pane, Flowchart-first Release 1 workbench. Chrome must use this kit’s anatomy through `components/align/`, the only generic component boundary. Illustration, Plot, Vector Canvas, Templates, and their related route designs are preview/later mappings only.

## Pages we implement from

| Kit section | Use in FigureLab |
| --- | --- |
| Core Elements | Tokens already in `app/globals.css` — Inter, blue `#335CFF`, Gray, radius 8/10/12/16/20/24, named shadows |
| Base Components | Repository-owned Align primitives and accessible headless behavior |
| Product Components | Sidebar, topbar crumbs, empty states |
| AI Product | Home, chat, prompt card, projects, settings/profile |
| Landing / other sectors | Do not copy. Marketing and HR/Finance blocks are out of product chrome |

## AI Product screens (canonical layout)

- Sidebar **272px**, white, px 14 / pt 20: logo 32, collapse, weak-50 search (10px radius), New figure in **primary text** with plus on `primary-alpha-10`, Projects, Library, divider, Pinned, Recents, profile footer
- Main pane: **6px inset**, **24px** radius, stroke-soft-200
- Empty home: centered greeting (18/24 medium + 14/20 soft), prompt pinned to bottom
- Prompt: muted 20px well, raised inner card, textarea then `+` / model pill / send
- Projects / Library / Templates / Vector canvas: Align **Projects [AI]** (`191229:23174`) — 48px icon well, 18/24 title + Create, 700px column, weak-50 40px search, “All … (n)” + Sort by, 2-col 20px-radius tiles (24px icon, 16/24 title, 14/20 caption, 12/16 updated). Library is R1.1; Templates and Vector Canvas remain Preview/Later.
- Skip the kit’s Upgrade strip (no Stripe yet)

## Base families → current primitives

| Align family | FigureLab file | Status |
| --- | --- | --- |
| Button / Fancy / Compact / Link / Social | `components/align/button.tsx` | Official modes: filled=`default`, stroke=`outline`, lighter=`lighter`/`secondary`, ghost=`ghost` |
| Text Input / Tag / Counter / Digit | `input.tsx` | Official inset ring + hover weak-50 + important-focus; search is weak-50 |
| Text Area | `textarea.tsx` | Used inside prompt card |
| Modal header/footer/status/overlay | `dialog.tsx` | Icon + 56px header, muted footer on share/rename/folder/export |
| Command Menu | `command.tsx` | Search uses CommandDialog |
| File Upload area/cards/icons | `file-upload-area.tsx` | Attach + vector canvas dropzone |
| Dropdown | `dropdown-menu.tsx` | Present |
| Select | `select.tsx` | Present |
| Drawer / Sheet | `sheet.tsx` `drawer.tsx` | Present |
| Tab Menu | `tabs.tsx` | Present |
| Segmented Control | `toggle-group.tsx` | Composer modes + view toggle |
| Avatar | `avatar.tsx` | Sidebar uses initials span |
| Badge / Tag | `badge.tsx` | Present |
| Alert / Toast | `alert.tsx` `sonner.tsx` | Present |
| Checkbox / Switch / Radio | matching files | Present |
| Progress | `progress.tsx` | Job status card uses it |
| Tooltip / Popover | matching files | Present |
| Breadcrumbs | `breadcrumb.tsx` | Shell uses text crumbs |
| Empty States | `app-shell.tsx` | Icon + title + action; no sector art |
| Navigation sidebar/topbar | `app-shell.tsx` | AI Product layout landed; icon rail exists |

## Out of scope unless a screen needs them

Date Picker, Time Picker, Color Picker, Rating, Rich Editor, Activity Feed, Notification Feed, Filter, Table, Step Indicator, Country Flags, Landing blocks, HR/Finance/Crypto/Marketing sector products.

## Implementation order

This list records UI migration coverage only. “Landed” does not mean the corresponding product mode or production milestone is released; Flowchart remains the only R1 mode.

1. AI Product shell (sidebar + inset pane + home + projects) — landed
2. Command Menu for Search — landed
3. File Upload dropzone for attach / vector canvas — landed
4. Modal header/footer anatomy on share, rename, folder, export — landed
5. Segmented Control on composer modes + grid/list — landed
6. Progress + status on generation jobs — landed
7. Library / templates / vector empty + page headers — landed
8. Editor chrome — Align tool wells + illustration versions rail — landed
9. Plot editor — page header + 320px Inspector/Versions rail — landed; chart-type chips write `chartType` after encoding so Line/Area persist on categorical tables
