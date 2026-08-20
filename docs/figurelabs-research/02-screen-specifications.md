# Screen specifications

## Visual system — verified

- Desktop-first layout with large negative space.
- White content cards over a very pale blue-gray application background.
- Navy primary text and action fills; mid-gray secondary copy.
- Rounded controls and cards; shadows are soft and low contrast.
- Top chrome is sparse: brand on the left, credits/notifications/avatar on the right.
- The side rail floats near the left edge instead of occupying a full-height sidebar.
- Main headings are large, heavy, and centered on creation pages; management pages use left-aligned headings.

This is observational guidance, not a license to copy FigureLabs branding or trade dress exactly.

## Home / workbench layout — verified

```text
┌────────────────────────────────────────────────────────────────────┐
│ FigureLabs                                      Upgrade ⚡ credits │
│                                                                    │
│                  Flowchart, made effortless.                       │
│       Illustration | Flowchart selected | Plot beta                │
│                                                                    │
│  rail   ┌──────────────── prompt / input surface ───────────────┐  │
│   ○     │ rotating example                                      │  │
│   ○     │ attach                      ratio Auto     Generate    │  │
│   ○     └───────────────────────────────────────────────────────┘  │
│   ○                                                                │
│         Templates                                  All →            │
│         [filters]                                                   │
│         [card] [card] [card] [card]                                │
│                                                                    │
│         Recent Projects                                             │
└────────────────────────────────────────────────────────────────────┘
```

Behavior details:

- Mode switching updates the workbench without leaving the shell.
- Generation is unavailable until text or an accepted source is present.
- Template cards have three different intents: inspect, seed a generation, or open an editable source directly.
- `All` is visually placed as a separate affordance while category filters are pill-like toggles.
- A completed generation replaces the Recent Projects empty state with a project card and `See All` link.

### Illustration controls — verified

The Illustration prompt surface adds a compact row of source-mode toggles and a settings footer containing palette, visual consistency, model, style, and ratio selectors. The inspected defaults were Nano Banana Pro, Flat, and Auto.

`Ctrl+Enter` submits the focused prompt. During submission, Generate changes to disabled `Generating…` while the prompt remains visible.

## Live project editor — verified

The completed project uses a split-pane layout:

```text
┌──────────────── chat / session ───────────────┬──────── project canvas ────────┐
│ title + rename                                │ zoom + credit/avatar            │
│ new chat | history | share | hide             │ select/upload/frame/text/etc.   │
│ user prompt                                   │                                 │
│ model + resolved ratio + style                │      selected generated image   │
│ analyzer narrative                            │                                 │
│ generated result + reactions/actions          │ quick-edit actions + export     │
│ follow-up composer + settings                 │ object metadata                  │
└───────────────────────────────────────────────┴─────────────────────────────────┘
```

Verified session controls:

- Open workspace menu.
- Auto-generated title based on the prompt, truncated in the header.
- Rename session title.
- Start new chat.
- Session history in this thread.
- Share conversation.
- Hide chat.

Verified generated-result actions:

- Like and Dislike.
- Copy image.
- Quote.
- Regenerate.
- Save to Library.
- Choose another model to generate.

The canvas and conversation remain simultaneously visible at desktop width, separated by a draggable splitter.

## Projects screen — verified

```text
Projects
View and continue your past projects.

[Start Date] – [End Date]                 [Grid] [List] [Oldest first]

No projects yet.
```

Populated grid card — verified:

- generated-image thumbnail;
- prompt-derived title, truncated when long;
- open target;
- Rename project;
- `Last active {date}`;
- overflow menu trigger.

Generation mode and asset count were not exposed as visible card text in the inspected grid view. List view and overflow-menu contents remain unverified.

## Library screen — verified

```text
Library
Organize and manage your saved scientific figures.

[Search folder...]                                      [New folder]

[Favorites · 0 images]
Recently updated
```

Library is folder-oriented, unlike Projects (conversation-oriented) and Vector Canvas (editable vector document-oriented).

## Vector Canvas index — verified

```text
Vector Canvas
Manage and edit your vectorized figures.

[Search vector canvases...]                 [Oldest first] [Grid] [List]
```

No visible `New canvas` action was exposed in the empty-state accessibility tree. Published docs indicate canvases originate from vectorization or image import.

## Referral screen — verified

Centered hero and one large card:

- gift icon;
- `Give 300, Get 300`;
- invite link in a read-only-looking field plus Copy Link;
- divider labeled `OR SEND VIA EMAIL`;
- email input plus Send Invite;
- rules and history links beneath the card.

## Authenticated header states — verified/published

- Credits are always visible and make scarcity explicit.
- Upgrade is co-located with the credit balance.
- Notifications are globally reachable.
- Account settings are reached from the avatar.

Published help paths under Manage account:

- Billing → Current Plan.
- Billing → Payment history.
- Account Settings → Delete Account.
- Team Settings → Dissolve Team, administrator only.

These settings paths were documented officially but not visually exercised in this pass.

## Join modal — verified on public site

Compact centered dialog with:

- FigureLabs logo and `Join FigureLabs` heading;
- `Log in or sign up to continue.` copy;
- full-width Google sign-in control;
- `or` divider;
- email field (`name@example.com`);
- `Continue with email` action;
- consent sentence linking Terms and Policy;
- top/right close action.

## Responsive behavior — not yet verified

The production app was inspected at a desktop Dia window around 1227×768. Mobile/tablet behavior is unknown. Before implementation parity is declared, inspect at least:

- 1440×900 desktop;
- 1024×768 tablet landscape;
- 768×1024 tablet portrait;
- 390×844 phone.
