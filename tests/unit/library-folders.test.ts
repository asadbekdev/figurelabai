import { describe, expect, it } from "vitest"

import { createWorkspaceRepository } from "@/lib/product/workspace-repository"
import { createMemoryStorage } from "@/lib/product/workspace-storage"
import { workspaceAssetSchema } from "@/lib/product/workspace-types"

function seedAsset(id: string) {
  return {
    id,
    projectId: null,
    kind: "generated_asset" as const,
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    prompt: `Asset ${id}`,
    folderId: null,
    favorite: false,
    createdAt: new Date().toISOString(),
  }
}

describe("library organization", () => {
  it("parses legacy assets without folder or favorite fields", () => {
    const parsed = workspaceAssetSchema.parse(seedAsset("legacy"))
    expect(parsed.folderId).toBeNull()
    expect(parsed.favorite).toBe(false)
  })

  it("creates folders, assigns assets, and toggles favorites", async () => {
    const repository = createWorkspaceRepository(
      createMemoryStorage({ assets: [seedAsset("a1"), seedAsset("a2")] })
    )

    const folder = await repository.createFolder("  Journal figures  ")
    expect(folder.name).toBe("Journal figures")

    const moved = await repository.setAssetFolder("a1", folder.id)
    expect(moved.folderId).toBe(folder.id)

    const favored = await repository.setAssetFavorite("a2", true)
    expect(favored.favorite).toBe(true)

    const folders = await repository.listFolders()
    expect(folders.map((item) => item.name)).toContain("Journal figures")
  })

  it("rejects assigning an asset to a missing folder", async () => {
    const repository = createWorkspaceRepository(
      createMemoryStorage({ assets: [seedAsset("a1")] })
    )
    await expect(repository.setAssetFolder("a1", "missing-folder")).rejects.toThrow()
  })

  it("keeps assets in the library when their folder is deleted", async () => {
    const repository = createWorkspaceRepository(
      createMemoryStorage({ assets: [seedAsset("a1")] })
    )
    const folder = await repository.createFolder("Temp")
    await repository.setAssetFolder("a1", folder.id)

    await repository.deleteFolder(folder.id)

    const assets = await repository.listAssets()
    expect(assets[0]?.folderId).toBeNull()
    expect(await repository.listFolders()).toHaveLength(0)
  })
})
