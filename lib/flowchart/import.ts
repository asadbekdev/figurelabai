import { parseFlowchartDocument, type FlowchartDocument } from "./schema"

export function parseImportedFlowchartJson(text: string): FlowchartDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file is not valid JSON.")
  }

  try {
    return parseFlowchartDocument(parsed)
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeds")) throw error
    throw new Error("That JSON is not a valid FigureLab flowchart document.")
  }
}
