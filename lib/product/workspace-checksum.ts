import type { WorkspaceDocument } from "./workspace-types"

export function checksumDocument(document: WorkspaceDocument): string {
  const json = JSON.stringify(document)
  let hash = 2166136261
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `${(hash >>> 0).toString(16).padStart(8, "0")}:${json.length}`
}
