import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("undici", () => ({ request, Agent: class {}, EnvHttpProxyAgent: class {} }));
import { isGemEmptySearchResponse, officialDocumentRedirect, officialUrl, SourceHttp } from "@/lib/sources/http";
const reply = (statusCode: number, headers: Record<string, string> = {}, text = "ok") => ({ statusCode, headers, body: Readable.from([Buffer.from(text)]) });
afterEach(() => request.mockReset());
describe("exact GeM empty-result response", () => {
  const empty = JSON.stringify({status: 0, code: 404, message: "No data found"});
  it("allows the observed no-match JSON only on an opted-in official search POST", async () => {
    request.mockResolvedValueOnce(reply(404, {}, empty));
    expect(await new SourceHttp().text("https://bidplus.gem.gov.in/search-bids", {method:"POST", allowGemEmptyResult:true})).toBe(empty);
  });
  it("reads the exact empty response across chunks without broadening redirect acceptance", async () => {
    request.mockResolvedValueOnce({statusCode:404,headers:{},body:Readable.from([Buffer.from(empty.slice(0,9)),Buffer.from(empty.slice(9))])});
    expect(await new SourceHttp().text('https://bidplus.gem.gov.in/search-bids',{method:'POST',allowGemEmptyResult:true})).toBe(empty);
    request.mockResolvedValueOnce(reply(302,{location:'/search-bids'})).mockResolvedValueOnce(reply(404,{},empty));
    await expect(new SourceHttp().text('https://bidplus.gem.gov.in/search-bids',{method:'POST',allowGemEmptyResult:true})).rejects.toThrow('HTTP 404');
    expect(request.mock.calls[2][1].method).toBe('GET');
  });
  it.each([
    ["https://bidplus.gem.gov.in/search-bids", "GET", true],
    ["https://bidplus.gem.gov.in/search-bids", "POST", false],
    ["https://bidplus.gem.gov.in/other", "POST", true],
    ["https://eprocure.gov.in/search-bids", "POST", true],
  ])("keeps unrelated 404 requests failing: %s %s", async (url, method, allow) => {
    request.mockResolvedValueOnce(reply(404, {}, empty));
    await expect(new SourceHttp().text(url as string,{method:method as string,allowGemEmptyResult:allow as boolean})).rejects.toThrow("HTTP 404");
  });
  it.each(["<html>CAPTCHA</html>", '{"status":0,"code":404,"message":"Session expired"}', '{"status":0,"code":404,"message":"No data found","extra":true}', "x".repeat(513)])("rejects access challenges and changed/oversized errors", async body => {
    request.mockResolvedValueOnce(reply(404, {}, body));
    await expect(new SourceHttp().text("https://bidplus.gem.gov.in/search-bids",{method:"POST",allowGemEmptyResult:true})).rejects.toThrow("Invalid GeM empty-search response");
  });
  it.each([null, [], {status:0,code:404}, {status:"0",code:404,message:"No data found"}])("rejects ambiguous empty-result structures", value => {
    expect(isGemEmptySearchResponse(value)).toBe(false);
  });
});
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

describe("priority listing phase cancellation", () => {
  it("does not issue a request for an already aborted phase", async () => {
    const controller=new AbortController();controller.abort(new Error("listing phase expired"));
    await expect(new SourceHttp().text("https://hptenders.gov.in/list",{signal:controller.signal})).rejects.toThrow("listing phase expired");
    expect(request).not.toHaveBeenCalled();
  });
  it("aborts an in-flight listing without retry and keeps its session for priority details", async () => {
    const http=new SourceHttp();
    request.mockResolvedValueOnce(reply(200,{"set-cookie":"session=fixture"}));
    await http.text("https://hptenders.gov.in/index");
    const controller=new AbortController();
    request.mockImplementationOnce((_url,options)=>new Promise((_resolve,reject)=>{
      options.signal.addEventListener("abort",()=>reject(options.signal.reason),{once:true});
    }));
    const listing=http.text("https://hptenders.gov.in/list",{signal:controller.signal});
    controller.abort(new Error("listing phase expired"));
    await expect(listing).rejects.toThrow("listing phase expired");
    expect(request).toHaveBeenCalledTimes(2);
    request.mockResolvedValueOnce(reply(200,{},"priority detail"));
    expect(await http.text("https://hptenders.gov.in/detail")).toBe("priority detail");
    expect(request.mock.calls[2][1].headers.cookie).toBe("session=fixture");
  });
});
