# Research log and sources

## Authenticated production observations

Observed in Dia with the user's signed-in session on 2026-08-19:

- Home workbench and Flowchart default state.
- Global navigation/header and 200-credit display.
- Projects empty state at `/projects`.
- Library empty/default state at `/library`.
- Vector Canvas index at `/vector-canvas`.
- Referral page at `/invitation`.
- Referral terms at `/invitation/rules`.
- Public `Join FigureLabs` authentication modal.
- One live Nano Banana Pro text-to-Illustration generation and the resulting project editor.
- Populated Projects grid card after the live generation.

The signed session was intermittently moved to other tabs during the audit. The documented authenticated states are only those read back after the relevant route loaded.

## Official public sources

- [FigureLabs product home](https://www.figurelabs.ai/)
- [Flowchart product](https://www.figurelabs.ai/flowchart)
- [Plot product](https://www.figurelabs.ai/plot)
- [Pricing and FAQ](https://www.figurelabs.ai/pricing)
- [Help center](https://www.figurelabs.ai/help-center)
- [Video tutorials](https://www.figurelabs.ai/tutorial)
- [API overview](https://www.figurelabs.ai/api)

## Published interface images inspected

- Flowchart editor hero: `https://www.figurelabs.ai/images/flowchart/1-1920.webp`
- Flowchart editable canvas: `https://www.figurelabs.ai/images/flowchart/3-1200.webp`
- Flowchart theme switcher: `https://www.figurelabs.ai/images/flowchart/4-1200.webp`
- Flowchart PPTX export example: `https://www.figurelabs.ai/images/flowchart/5-1200.webp`
- Plot generator hero: `https://www.figurelabs.ai/images/Plots/%E5%B0%81%E9%9D%A2%E5%A4%A7%E5%9B%BE.png`
- Plot data input: `https://www.figurelabs.ai/images/Plots/From%20Data%20to%20Figure.png`
- Plot chat refinement: `https://www.figurelabs.ai/images/Plots/Refine%20Plots%20with%20AI%20Chat.png`
- Plot export menu: `https://www.figurelabs.ai/images/Plots/Export%20in%20Multiple%20Formats.png`

These image URLs are evidence links, not repository assets. Do not ship or redistribute them in the product without permission.

## Method

- Read the accessibility tree after each authenticated route loaded.
- Used screenshots when the accessibility tree omitted visual layout.
- Read official DOM content for pricing, help, product, tutorial, and API pages.
- Labeled unexercised marketing/help claims as Published.
- Recorded conflicting official statements instead of picking a convenient value.

## Not performed

- No external uploads.
- No second generation, AI edit, upscale, vectorization, or export job.
- No payment or subscription action.
- No referral invitation sent.
- No folder/project/canvas created or deleted.
- No account/team mutation.

## Live generation fixture

- Prompt topic: a simple three-step PCR workflow.
- Input contained no private research or personal data.
- Default model/style/ratio: Nano Banana Pro / Flat / Auto.
- Resolved result settings: Nano Banana Pro / Flat / 16:9.
- Visible output metadata: 560×313 image.
- Time to visible output: approximately 55 seconds.
- Visible credit change: 200 → 150.
- The private project identifier is intentionally omitted from these notes.
