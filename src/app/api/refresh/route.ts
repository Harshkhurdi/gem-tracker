import { timingSafeEqual } from "node:crypto";
import { invalidateSources } from "@/lib/cache/source-cache";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const token = process.env.ADMIN_REFRESH_TOKEN;
  if (!token)
    return Response.json(
      {
        error:
          "Forced source refresh is disabled. Configure ADMIN_REFRESH_TOKEN to enable it; cached reads still revalidate automatically.",
      },
      { status: 503 },
    );
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const a = Buffer.from(token),
    b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ error: "Refresh token required" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  invalidateSources();
  return Response.json(
    { refreshRequested: true },
    {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
