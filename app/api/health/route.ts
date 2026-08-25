export function GET() {
  return Response.json({
    ok: true,
    service: "figurelab",
    release: process.env.FIGURELAB_RELEASE ?? "development",
  })
}
