import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("@/lib/cache/source-cache", () => ({
  allSources: vi.fn(async () => []),
}));
import { POST } from "@/app/api/refresh/route";
afterEach(() => vi.unstubAllEnvs());
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
  });
  it("accepts a correct same-origin authorized refresh", async () => {
    vi.stubEnv("ADMIN_REFRESH_TOKEN", "test-only-token");
    expect(
      (
        await POST(
          new Request("https://example.com/api/refresh", {
            method: "POST",
            headers: {
              Authorization: "Bearer test-only-token",
              Origin: "https://example.com",
            },
          }),
        )
      ).status,
    ).toBe(200);
  });
});
