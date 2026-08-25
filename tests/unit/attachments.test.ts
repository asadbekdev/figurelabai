import { describe, expect, it } from "vitest"

import {
  classifyAttachment,
  composePromptWithSource,
  dataUrlToInline,
  defaultPromptForAttachment,
  parseAttachment,
} from "../../lib/product/attachments"
import { createMinimalDocx, createUncompressedPdf } from "../../lib/product/document-text"
import {
  sourcePayloadFromAttachment,
  sourcePayloadFromAttachments,
  userMessageForAttachments,
} from "../../lib/product/source-payload"

describe("attachments", () => {
  it("classifies supported text, csv, and image files", () => {
    expect(classifyAttachment({ name: "notes.md", type: "text/markdown", size: 12 })).toBe("text")
    expect(classifyAttachment({ name: "table.csv", type: "text/csv", size: 12 })).toBe("csv")
    expect(
      classifyAttachment({
        name: "table.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 12,
      })
    ).toBe("csv")
    expect(classifyAttachment({ name: "ref.png", type: "image/png", size: 12 })).toBe("image")
    expect(classifyAttachment({ name: "methods-notes.pdf", type: "application/pdf", size: 12 })).toBe(
      "text"
    )
    expect(
      classifyAttachment({
        name: "methods.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 12,
      })
    ).toBe("text")
    expect(classifyAttachment({ name: "legacy.doc", type: "application/msword", size: 12 })).toBe(null)
  })

  it("includes attached notes in the composed prompt", () => {
    const composed = composePromptWithSource("Make a PCR flowchart", {
      name: "notes.txt",
      kind: "text",
      mimeType: "text/plain",
      size: 20,
      text: "Collect, extract, amplify.",
    })
    expect(composed).toContain("Make a PCR flowchart")
    expect(composed).toContain("Collect, extract, amplify.")
    expect(composed).toContain("notes.txt")
  })

  it("builds a source payload for images and tables", () => {
    const image = sourcePayloadFromAttachment("Turn this into a flowchart", {
      name: "sketch.png",
      kind: "image",
      mimeType: "image/png",
      size: 40,
      dataUrl: "data:image/png;base64,aaaa",
    })
    expect(image.sourceImage?.mimeType).toBe("image/png")
    expect(image.sourceImage?.data).toBe("aaaa")

    const table = sourcePayloadFromAttachment("Bar chart of yields", {
      name: "yields.csv",
      kind: "csv",
      mimeType: "text/csv",
      size: 20,
      text: "step,yield\nA,12",
    })
    expect(table.tabularData).toContain("step,yield")
    expect(defaultPromptForAttachment("plot", table.sourceText ? {
      name: "yields.csv",
      kind: "csv",
      mimeType: "text/csv",
      size: 20,
      text: table.tabularData,
    } : {
      name: "yields.csv",
      kind: "csv",
      mimeType: "text/csv",
      size: 20,
      text: "x",
    })).toMatch(/chart/i)
  })

  it("extracts text from a PDF and a Word document", async () => {
    const pdf = await parseAttachment(
      new File([new Blob([Uint8Array.from(createUncompressedPdf("Collect extract amplify."))])], "methods.pdf", {
        type: "application/pdf",
      })
    )
    expect(pdf.ok).toBe(true)
    if (pdf.ok) {
      expect(pdf.attachment.kind).toBe("text")
      expect(pdf.attachment.text).toContain("Collect extract amplify.")
    }

    const docx = await parseAttachment(
      new File(
        [new Blob([Uint8Array.from(createMinimalDocx(["Prepare the sample.", "Run PCR."]))])],
        "methods.docx",
        {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
      )
    )
    expect(docx.ok).toBe(true)
    if (docx.ok) {
      expect(docx.attachment.text).toContain("Prepare the sample.")
      expect(docx.attachment.text).toContain("Run PCR.")
    }
  })

  it("rejects a PDF with no extractable text", async () => {
    const parsed = await parseAttachment(
      new File([new Blob([Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x34])])], "scan.pdf", {
        type: "application/pdf",
      })
    )
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error.message).toMatch(/extractable text/i)
    }
  })

  it("parses a data URL into inline image parts", () => {
    expect(dataUrlToInline("data:image/jpeg;base64,abc123")).toEqual({
      mimeType: "image/jpeg",
      data: "abc123",
    })
  })
})

describe("sourcePayloadFromAttachments", () => {
  const image = {
    name: "ref.png",
    kind: "image" as const,
    mimeType: "image/png",
    size: 40,
    dataUrl: "data:image/png;base64,aaaa",
  }
  const csv = {
    name: "yields.csv",
    kind: "csv" as const,
    mimeType: "text/csv",
    size: 20,
    text: "step,yield\nA,12",
  }
  const notes = {
    name: "notes.txt",
    kind: "text" as const,
    mimeType: "text/plain",
    size: 20,
    text: "Collect, extract, amplify.",
  }

  it("combines a reference image with a CSV table", () => {
    const payload = sourcePayloadFromAttachments("Chart the yields", [image, csv])
    expect(payload.sourceImage?.data).toBe("aaaa")
    expect(payload.sourceText?.name).toBe("yields.csv")
    expect(payload.tabularData).toContain("step,yield")
    expect(payload.prompt).toBe("Chart the yields")
  })

  it("lets pasted plot data win over an attached CSV", () => {
    const payload = sourcePayloadFromAttachments("Chart this", [csv], "x,y\n1,2")
    expect(payload.tabularData).toBe("x,y\n1,2")
    expect(payload.sourceText?.name).toBe("yields.csv")
  })

  it("composes notes into the prompt while keeping the image slot", () => {
    const payload = sourcePayloadFromAttachments("Make a flowchart", [notes, image])
    expect(payload.prompt).toContain("Collect, extract, amplify.")
    expect(payload.sourceImage?.mimeType).toBe("image/png")
    expect(payload.sourceText?.name).toBe("notes.txt")
  })

  it("labels reference images in the user message", () => {
    const message = userMessageForAttachments("Revise this", [image], "")
    expect(message).toContain("Reference image: ref.png")
  })
})
