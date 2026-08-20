# Plans, credits, rights, and teams

## Current public individual plans — published

Annual pricing state observed on the pricing page:

| Plan | Displayed annual-equivalent price | Plan credits | Daily refresh | Storage | Max raster | Key unlocks |
|---|---:|---:|---:|---:|---:|---|
| Free | $0/mo | 150 one-time | 50/day | 1 GB | 1K | Flowchart SVG, Plot, basic models |
| Starter | $10/mo billed annually | 1,000/mo | 100/day | 10 GB | 4K | Vector SVG/PPTX, Canvas, publication authorization |
| Plus | $20/mo billed annually | 5,000/mo | 100/day | 50 GB | 8K | Full model set |
| Pro | $54/mo billed annually | 20,000/mo | public pages conflict | 300 GB | 8K | Full model set |

Monthly list prices shown struck through/alongside annual equivalents were $12 Starter, $35 Plus, and $99 Pro.

Published Team pricing: $35 monthly or $20 annual per seat, minimum two seats, 5,000 credits per seat per month, 60 GB storage, 100 daily refresh credits, and up to 20% credit rollover. Business is referenced but not fully priced in the inspected pages.

## Credit costs — published

| Action | Credits |
|---|---:|
| 1K image generation | 50 |
| Region Redraw | 50 |
| Regenerate | 50 |
| White background operation | 50 |
| Text Edit | 60 |
| Upscale 2K | 10 |
| Upscale 4K | 20 |
| Upscale 8K | 40 |
| SVG/PPTX vector export | 150 |

The pricing FAQ states that normal image generation costs the same across models; model availability is plan-gated.

The 50-credit 1K generation cost was independently verified in the signed product: one successful Nano Banana Pro Illustration reduced the visible balance from 200 to 150. No other credit-consuming action was performed.

## Credit lifecycle — published

- Welcome allocation on signup.
- Daily refresh allocation on login; unused refresh credits expire at day end.
- Monthly plan credits allocated at billing-cycle start.
- Individual plan credits reset at cycle end.
- Team/Business may roll over up to 20% of unused monthly credits.
- Top-up credits are valid for 12 months.
- Referral rewards are granted when a new user registers through the invite mechanism.

Recommended build rule — inference: use a ledger, never one mutable integer. Track source, grant time, expiration, remaining amount, and spend reason so expiring buckets can be consumed correctly.

## Top-ups — published

Pricing page list:

- 1,000 credits: $15;
- 3,000 credits: $30;
- 6,000 credits: $50;
- 12,000 credits: $90.

Another FAQ example names 1,500 credits for $15; treat the pricing card as the stronger current source until checkout is inspected.

## Billing/account — published

- Plan upgrades take effect immediately.
- Tier upgrades grant the credit difference immediately.
- Changing only monthly to annual keeps the current month's credits and normal refresh date.
- Annual upgrade charge is described as full annual fee minus the monthly fee already paid; subscription duration is anchored to the original monthly start date.
- Auto-renewal can be canceled in Manage account → Billing → Current Plan.
- Access and credits remain active through the paid cycle.
- Invoices are under Manage account → Billing → Payment history.
- Payments are generally final/non-refundable due to immediate compute costs, with support exceptions possible.

## Ownership and publication rights — published

- FigureLabs claims no ownership over generated figures.
- Paid plans advertise commercial and publication rights.
- Free plan is explicitly described as non-commercial only.
- Eligible paid plans can download a publication authorization certificate.
- Official docs describe encrypted data in transit and at rest and say private uploads/prompts are not used to train public models or shared with third parties.

These are vendor claims, not an independent legal/security audit.

## Teams — published

- Personal and Team workspace switching.
- Shared assets.
- Member management.
- Pooled credit resources.
- Team/Business credit rollover.
- Only a team administrator can dissolve a team.

Unverified operational details:

- roles and permissions;
- invitations and seat billing;
- ownership transfer;
- project visibility defaults;
- removal/offboarding behavior;
- audit logs;
- conflict handling when multiple members edit.
