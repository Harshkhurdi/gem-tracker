import { allSources } from "@/lib/cache/source-cache";
import { buildDashboard } from "@/lib/tender/normalize";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET() {
  try {
    return Response.json(
      buildDashboard(await allSources(), !!process.env.ADMIN_REFRESH_TOKEN),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Tender service could not complete this request. Please try again.",
      },
      { status: 503 },
    );
  }
}
