import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative } from "node:path"

const projectRoot = process.cwd()
// The visual contract applies to rendered UI. Domain documents and export
// renderers intentionally carry portable color values rather than app tokens.
const sourceRoots = ["app", "components"]
const sourceExtensions = new Set([".css", ".ts", ".tsx"])
const tokenSourceFiles = new Set(["app/globals.css"])
const allowedShadows = new Set([
  "shadow-none",
  "shadow-regular-xs",
  "shadow-regular-sm",
  "shadow-regular-md",
  "shadow-input",
  "shadow-overlay",
  "shadow-tooltip",
  "shadow-fancy-stroke",
  "shadow-button-primary-focus",
  "shadow-button-important-focus",
  "shadow-button-error-focus",
  "shadow-surface",
])

function collectFiles(directory) {
  const absoluteDirectory = join(projectRoot, directory)

  return readdirSync(absoluteDirectory).flatMap((entry) => {
    const path = join(absoluteDirectory, entry)
    if (statSync(path).isDirectory()) return collectFiles(relative(projectRoot, path))
    return sourceExtensions.has(extname(path)) ? [path] : []
  })
}

const checks = [
  {
    name: "hard-coded color",
    pattern: /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/gi,
    guidance: "Use an OKLCH semantic token from app/globals.css.",
    skipTokenSource: true,
  },
  {
    name: "raw palette utility",
    pattern:
      /(?<![-])\b(?:bg|text|border|ring)-(?:white|black|slate|gray|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d+)?(?:\/\d+)?\b/g,
    guidance: "Use a semantic color utility such as bg-primary, text-destructive, or bg-success-lighter.",
    skipTokenSource: true,
  },
  {
    name: "unapproved font weight",
    pattern: /\bfont-(?:thin|extralight|light|bold|extrabold|black)\b/g,
    guidance: "Product UI uses font-normal, font-medium, and font-semibold (Align 400 / 500 / optional 600).",
  },
  {
    name: "raw shadow scale",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl|inner|surface-hover)\b/g,
    guidance:
      "Use Align named shadows: shadow-regular-xs, shadow-regular-sm, shadow-regular-md, shadow-input, shadow-overlay, shadow-tooltip, or shadow-fancy-stroke.",
  },
  {
    name: "unapproved named shadow",
    pattern: /\bshadow-[a-z0-9-]+\b/g,
    guidance:
      "Use Align named shadows: shadow-regular-xs, shadow-regular-sm, shadow-regular-md, shadow-input, shadow-overlay, shadow-tooltip, shadow-fancy-stroke, or shadow-none.",
    allowlist: allowedShadows,
  },
  {
    name: "arbitrary spacing",
    pattern: /\b(?:p[xysetrb]?|m[xysetrb]?|gap|space-[xy])-\[[^\]]+\]/g,
    guidance: "Use the 4 px Tailwind spacing scale.",
  },
  {
    name: "transition all",
    pattern: /\btransition-all\b|transition(?:-property)?\s*:\s*all\b/g,
    guidance: "List the exact properties that transition.",
  },
  {
    name: "banned icon library",
    pattern: /from\s+["'](?:lucide-react|@heroicons\/|@tabler\/icons|react-icons|@phosphor-icons|@remixicon\/react)/g,
    guidance: "Import icons from @/components/icons (Hugeicons Stroke Rounded). Do not add a second icon package.",
  },
]

const failures = []

for (const file of sourceRoots.flatMap(collectFiles)) {
  const relativeFile = relative(projectRoot, file)
  const source = readFileSync(file, "utf8")

  for (const check of checks) {
    if (check.skipTokenSource && tokenSourceFiles.has(relativeFile)) continue
    check.pattern.lastIndex = 0
    for (const match of source.matchAll(check.pattern)) {
      if (check.allowlist?.has(match[0])) continue
      const line = source.slice(0, match.index).split("\n").length
      failures.push({
        file: relativeFile,
        line,
        match: match[0],
        ...check,
      })
    }
  }
}

if (failures.length > 0) {
  console.error("Design audit failed:\n")
  for (const failure of failures) {
    console.error(
      `${failure.file}:${failure.line} ${failure.name}: ${failure.match}\n  ${failure.guidance}`
    )
  }
  process.exitCode = 1
} else {
  console.log(`Design audit passed across ${sourceRoots.join(", ")}.`)
}
