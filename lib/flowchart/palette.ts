// Portable artifact colors for flowchart documents. Documents must render
// identically outside the app (SVG/PNG export), so they carry real color
// values instead of app theme tokens. Keep this palette restrained: neutral
// ink plus one blue accent family, matching the publication-style default.

export type DocumentColorOption = {
  value: string
  label: string
}

export const documentColorOptions: DocumentColorOption[] = [
  { value: "#ffffff", label: "White" },
  { value: "#fafafa", label: "Paper" },
  { value: "#eff6ff", label: "Blue tint" },
  { value: "#a1a1aa", label: "Light gray" },
  { value: "#52525b", label: "Gray" },
  { value: "#3f3f46", label: "Charcoal" },
  { value: "#18181b", label: "Ink" },
  { value: "#1e40af", label: "Blue" },
  { value: "#1e3a8a", label: "Deep blue" },
]
