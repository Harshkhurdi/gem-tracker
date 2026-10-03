import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("undici", () => ({ request, Agent: class {}, EnvHttpProxyAgent: class {} }));
import { officialDocumentRedirect, officialUrl, SourceHttp } from "@/lib/sources/http";
const reply = (statusCode: number, headers: Record<string, string> = {}, text = "ok") => ({ statusCode, headers, body: Readable.from([Buffer.from(text)]) });
afterEach(() => request.mockReset());
describe("bounded official HTTP redirects", () => {
  it("rejects credential-bearing and nonstandard port official URLs", () => {
    expect(officialUrl("https://user:pass@hptenders.gov.in/x")).toBeUndefined();
    expect(officialUrl("https://hptenders.gov.in:8443/x")).toBeUndefined();
    expect(officialUrl("https://hptenders.gov.in:443/x")).toBe("https://hptenders.gov.in/x");
  });
  it("applies credential and port restrictions to the observed Wix PDF redirect", () => {
    const from = "https://www.gmc.edu.in/_files/ugd/fixture.pdf";
    const host = "bf8acbf3-d9c2-4d05-85d6-d9849a6e99ab.filesusr.com";
    expect(officialDocumentRedirect(`https://${host}/ugd/fixture.pdf`, from)).toBe(`https://${host}/ugd/fixture.pdf`);
    expect(officialDocumentRedirect(`https://user:pass@${host}/ugd/fixture.pdf`, from)).toBeUndefined();
    expect(officialDocumentRedirect(`https://${host}:8443/ugd/fixture.pdf`, from)).toBeUndefined();
  });
  it("converts a 302 form redirect to GET and drops form headers/body", async () => {
    request.mockResolvedValueOnce(reply(302, { location: "/result" })).mockResolvedValueOnce(reply(200));
    await new SourceHttp().text("https://hptenders.gov.in/form", { method: "POST", body: "form-token=fixture", headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect(request.mock.calls[1][1]).toMatchObject({ method: "GET", body: undefined });
    expect(request.mock.calls[1][1].headers["content-type"]).toBeUndefined();
  });
  it("preserves same-origin 307 POST redirects", async () => {
    request.mockResolvedValueOnce(reply(307, { location: "/result" })).mockResolvedValueOnce(reply(200));
    await new SourceHttp().text("https://hptenders.gov.in/form", { method: "POST", body: "fixture" });
    expect(request.mock.calls[1][1]).toMatchObject({ method: "POST", body: "fixture" });
  });
  it("does not leak source credentials on cross-origin GET redirects", async () => {
    request.mockResolvedValueOnce(reply(302, { location: "https://eprocure.gov.in/result" })).mockResolvedValueOnce(reply(200));
    await new SourceHttp().text("https://hptenders.gov.in/form", { headers: { authorization: "fixture", cookie: "session=fixture", referer: "https://hptenders.gov.in/private" } });
    const headers = request.mock.calls[1][1].headers;
    expect(headers.authorization).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers.referer).toBeUndefined();
  });
  it("refuses cross-origin POST replay on 307", async () => {
    request.mockResolvedValueOnce(reply(307, { location: "https://eprocure.gov.in/result" }));
    await expect(new SourceHttp().text("https://hptenders.gov.in/form", { method: "POST", body: "fixture" })).rejects.toThrow("Cross-origin");
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe("PGIMER dispatcher redirect isolation", () => {
  it("drops the PGIMER-specific dispatcher when redirecting to another official host", async () => {
    request.mockResolvedValueOnce(reply(302, { location: "https://eprocure.gov.in/result" })).mockResolvedValueOnce(reply(200));
    await new SourceHttp().text("https://pgimer.edu.in/start");
    const pgimer = request.mock.calls[0][1].dispatcher;
    expect(pgimer).toBeDefined();
    expect(request.mock.calls[1][1].dispatcher).not.toBe(pgimer);
  });
  it("selects the PGIMER-specific dispatcher when an official redirect enters PGIMER", async () => {
    request.mockResolvedValueOnce(reply(302, { location: "https://www.pgimer.edu.in/result" })).mockResolvedValueOnce(reply(200));
    await new SourceHttp().text("https://eprocure.gov.in/start");
    expect(request.mock.calls[1][1].dispatcher).toBeDefined();
    expect(request.mock.calls[1][1].dispatcher).not.toBe(request.mock.calls[0][1].dispatcher);
  });
});
