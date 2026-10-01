import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("@/lib/cache/source-cache", () => ({
  invalidateSources: vi.fn(),
}));
import { invalidateSources } from "@/lib/cache/source-cache";
import { POST } from "@/app/api/refresh/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("Refresh access control", () => {
  it("is disabled without a configured secret", async () => {
    vi.stubEnv("ADMIN_REFRESH_TOKEN", "");
    expect(
      (
        await POST(
          new Request("https://example.com/api/refresh", { method: "POST" }),
        )
      ).status,
    ).toBe(503);
    expect(invalidateSources).not.toHaveBeenCalled();
  });
  it("rejects unauthorized and wrong-length tokens", async () => {
    vi.stubEnv("ADMIN_REFRESH_TOKEN", "test-only-token");
    expect(
      (
        await POST(
          new Request("https://example.com/api/refresh", {
            method: "POST",
            headers: { Authorization: "Bearer nope" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(invalidateSources).not.toHaveBeenCalled();
  });
  it("rejects cross-origin admin browser submissions", async () => {
    vi.stubEnv("ADMIN_REFRESH_TOKEN", "test-only-token");
    expect(
      (
        await POST(
          new Request("https://example.com/api/refresh", {
            method: "POST",
            headers: {
              Authorization: "Bearer test-only-token",
              Origin: "https://other.example",
            },
          }),
        )
      ).status,
    ).toBe(403);
    expect(invalidateSources).not.toHaveBeenCalled();
  });
  it("accepts a correct same-origin authorized refresh", async () => {
    vi.stubEnv("ADMIN_REFRESH_TOKEN", "test-only-token");
    const response = await POST(
      new Request("https://example.com/api/refresh", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-only-token",
          Origin: "https://example.com",
        },
      }),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ refreshRequested: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(invalidateSources).toHaveBeenCalledTimes(1);
  });
});
