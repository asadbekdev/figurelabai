# FigureLab

FigureLab is an AI-assisted visual workspace for turning a prompt or source material into an editable, publication-ready figure.

The repository is currently at the design-system and product-specification stage. The component catalog is the current application surface; the production editor is intentionally sequenced as a set of verifiable milestones.

## Start here

- [Production build specification](./docs/production-build-spec.md) — product scope, routes, architecture, contracts, data model, security, testing, and ordered milestones
- [Design contract](./DESIGN.md) — mandatory UI and interaction rules
- [FigureLabs research](./docs/figurelabs-research/README.md) — observed product behavior and evidence boundaries
- [Design-system documentation](./docs/design-system/README.md) — foundations and reusable component guidance

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Before feature work, read `AGENTS.md`, `DESIGN.md`, and `docs/production-build-spec.md`. Implement one milestone at a time and prove its exit gate in the browser.

This project uses a ChatGPT-style native system font stack for the interface and [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) only to self-host Geist Mono for technical values.

## Required checks

```bash
npm run design:audit
npm run lint
npm run build
```

## Framework references

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
