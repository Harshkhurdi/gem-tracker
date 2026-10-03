import * as tls from "node:tls";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("undici", () => ({
  Agent: class { constructor(public options: unknown) {} },
  EnvHttpProxyAgent: class { constructor(public options: unknown) {} },
}));
import { PGIMER_YR1, PGIMER_YR_BY_X1, pgimerDispatcher, pgimerTlsOptions, validatePgimerChain } from "@/lib/sources/pgimer-tls";
afterEach(() => { vi.doUnmock("node:tls"); vi.resetModules(); });
describe("PGIMER missing intermediate completion", () => {
  it("cryptographically validates the published chain to the existing built-in X1", () => {
    expect(() => validatePgimerChain()).not.toThrow();
    const options = pgimerTlsOptions();
    const defaults = typeof tls.getCACertificates === "function" ? tls.getCACertificates("default") : tls.rootCertificates;
    expect(options.ca).toEqual([...defaults, PGIMER_YR1, PGIMER_YR_BY_X1]);
    expect(options.rejectUnauthorized).toBe(true);
    expect(options.allowPartialTrustChain).toBe(false);
    expect(options.checkServerIdentity).toBeUndefined(); // Node's default hostname validation.
  });
  it("rejects an altered or substituted intermediate", () => {
    expect(() => validatePgimerChain(PGIMER_YR_BY_X1, PGIMER_YR1)).toThrow("does not validate");
    expect(() => validatePgimerChain(PGIMER_YR1, tls.rootCertificates[0])).toThrow("does not validate");
    expect(() => validatePgimerChain("not a certificate")).toThrow();
  });
  it("rejects the expired public chain", () => {
    expect(() => validatePgimerChain(PGIMER_YR1, PGIMER_YR_BY_X1, Date.parse("2029-01-01"))).toThrow("does not validate");
  });
  it("refuses to anchor to a default extra CA when the built-in X1 is absent", async () => {
    vi.doMock("node:tls", async () => ({ ...await vi.importActual<typeof tls>("node:tls"), rootCertificates: [], getCACertificates: () => [...tls.rootCertificates] }));
    const isolated = await import("@/lib/sources/pgimer-tls");
    expect(() => isolated.pgimerTlsOptions()).toThrow("built-in ISRG Root X1");
  });
  it.each(["https://pgimer.edu.in/a", "https://www.pgimer.edu.in/a"])("restricts direct chain completion to an exact official host: %s", (url) => {
    const dispatcher = pgimerDispatcher(url, false) as unknown as { options: { connect: tls.ConnectionOptions } };
    expect(dispatcher.options.connect).toMatchObject({ rejectUnauthorized: true, allowPartialTrustChain: false });
  });
  it.each(["https://other.pgimer.edu.in/a", "https://pgimer.edu.in.example.com/a", "https://eprocure.gov.in/a", "http://pgimer.edu.in/a"])("does not select PGIMER chain for %s", (url) => {
    expect(pgimerDispatcher(url, false)).toBeUndefined();
    expect(pgimerDispatcher(url, true)).toBeUndefined();
  });
  it("keeps proxy tunnelling with verification on the destination connection", () => {
    const dispatcher = pgimerDispatcher("https://pgimer.edu.in/a", true) as unknown as { options: { connect: tls.ConnectionOptions; requestTls: tls.ConnectionOptions } };
    expect(dispatcher.options.requestTls).toMatchObject({ rejectUnauthorized: true, allowPartialTrustChain: false });
    expect(dispatcher.options.requestTls.ca).toContain(PGIMER_YR1);
    expect(dispatcher.options.connect).toBe(dispatcher.options.requestTls);
  });
});
