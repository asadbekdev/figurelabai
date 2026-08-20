<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FigureLab UI contract

Before any UI work, read and follow `DESIGN.md`. Run `npm run design:audit`, `npm run lint`, and `npm run build` before handing off a user-facing change.

# FigureLab product build contract

Before feature work, read `docs/production-build-spec.md`. Implement its milestones in order unless the user explicitly changes the scope. Preserve the component catalog at `/components`, prove the deterministic core before adding vendors, and verify each milestone against its exit gate in the real interface.
