import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseNicList,
  enrichNicDetail,
  parseNicCorrigendum,
  createNicAdapter,
  type NicConfig,
} from "../src/lib/sources/adapters/nic";
import { SourceHttp } from "../src/lib/sources/http";
const config: NicConfig = {
  id: "hp",
  name: "HP official",
  origin: "https://hptenders.gov.in",
  prefix: "/nicgep",
  organisation: /Medical/,
  region: "Himachal Pradesh",
  institutionIds: [],
  statewide: true,
};
// Minimal cells transcribed from the live HPMSCL organisation response, 30 September 2026.
const list = `<table><tr><td>6</td><td>18-Aug-2026 06:00 PM</td><td>03-Oct-2026 03:00 PM</td><td>05-Oct-2026 11:30 AM</td><td><a href='/nicgep/app?component=%24DirectLink&amp;page=FrontEndViewTender&amp;service=direct&amp;session=T&amp;sp=SgUO2xksgfP6Bd5Ls5MXc2g%3D%3D'>[Procurement of Digital PET/CT Scanner 128 Slice]</a>[HPMSCL/Proc/PET Scan/Dr.RKGMC-HMR/2026][2026_HPMSC_141463_1]</td><td>Himachal Pradesh Medical Services Corporation Limited||Accounts||Head Office</td></tr></table>`;
const field = (key: string, value: string) =>
  `<tr><td>${key}</td><td>${value}</td></tr>`;
const detail = `<table>${field("Tender ID", "2026_HPMSC_141463_1")}${field("Title", "Procurement of Digital PET/CT Scanner 128 Slice")}${field("Location", "RKGMC Hamirpur, RPGMC Tanda")}${field("Bid Submission End Date", "03-Oct-2026 03:00 PM")}${field("Withdrawal Allowed", "Yes")}</table><!-- <table id='corrigendumDocumenttable'><tr><td>1</td><td>Cancellation of Tender</td><td>Cancellation</td><td><a href='/fake'>View</a></td></tr></table> --><table id='corrigendumDocumenttable'><tr><td>1</td><td>Date Extended 02</td><td>Date</td><td><a href='/nicgep/app?component=%24DirectLink_10&amp;page=FrontEndTenderDetails&amp;service=direct&amp;session=T&amp;sp=actual'>View</a></td></tr></table><footer>Cancelled/Retendered</footer>`;
describe("NIC official HTML", () => {
  it("keeps old-publication active tenders and central organisation scope", () => {
    const rows = parseNicList(
      list,
      config.origin,
      config,
      "2026-09-30T12:00:00Z",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].publishDate).toBe("2026-08-18T18:00:00+05:30");
    expect(rows[0].originalClosingDate).toBe("2026-10-03T15:00:00+05:30");
    expect(rows[0].procurementScope).toBe("statewide");
    expect(rows[0].referenceNumber).toBe(
      "HPMSCL/Proc/PET Scan/Dr.RKGMC-HMR/2026",
    );
    expect(rows[0].sourceUrl).not.toContain("session=");
    expect(rows[0].institutionId).toBeUndefined();
  });
  it("uses real corrigendum table and both consignee locations without footer cancellation", () => {
    const raw = parseNicList(list, config.origin, config, "now")[0];
    const enriched = enrichNicDetail(raw, detail, raw.sourceUrl);
    expect(enriched.verification).toBe("detail");
    expect(enriched.location).toBe("RKGMC Hamirpur, RPGMC Tanda");
    expect(enriched.corrigenda).toHaveLength(1);
    expect(enriched.corrigenda?.[0].title).toBe("Date Extended 02");
    expect(enriched.cancelled).toBe(false);
    expect(enriched.withdrawn).toBe(false);
  });
  it("rejects challenge and mismatched detail rather than verifying listing", () => {
    const raw = parseNicList(list, config.origin, config, "now")[0];
    expect(() =>
      enrichNicDetail(raw, "Please enter CAPTCHA", raw.sourceUrl),
    ).toThrow();
    expect(() =>
      enrichNicDetail(
        raw,
        detail.replace("2026_HPMSC_141463_1", "2026_OTHER_1_1"),
        raw.sourceUrl,
      ),
    ).toThrow("mismatch");
  });
  it("marks actual cancellation corrigenda", () => {
    const raw = parseNicList(list, config.origin, config, "now")[0];
    expect(
      enrichNicDetail(
        raw,
        detail.replace("Date Extended 02", "Cancellation of Tender"),
        raw.sourceUrl,
      ).cancelled,
    ).toBe(true);
  });
});

const orgIndex = (row: string) =>
  `<h1>Tenders by Organisation</h1><table>${row}</table>`;
describe("NIC source completeness and endpoint", () => {
  afterEach(() => vi.restoreAllMocks());
  it("accepts app endpoint prefix and genuine zero-count organisation", async () => {
    const text = vi
      .spyOn(SourceHttp.prototype, "text")
      .mockResolvedValue(
        orgIndex("<tr><td>1</td><td>Medical Services</td><td>0</td></tr>"),
      );
    const result = await createNicAdapter({
      ...config,
      prefix: "/nicgep/app",
    }).fetch();
    expect(text.mock.calls[0][0]).toBe(
      "https://hptenders.gov.in/nicgep/app?page=FrontEndTendersByOrganisation&service=page",
    );
    expect(result.status).toBe("SUCCESS");
    expect(result.records).toHaveLength(0);
  });
  it("does not treat a missing organisation as an empty successful refresh", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      orgIndex("<tr><td>1</td><td>Public Works</td><td>0</td></tr>"),
    );
    const result = await createNicAdapter(config).fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.successfulAt).toBeUndefined();
  });
  it("does not coerce a blank organisation count to a successful zero", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      orgIndex("<tr><td>1</td><td>Medical Services</td><td></td></tr>"),
    );
    const result = await createNicAdapter(config).fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.successfulAt).toBeUndefined();
  });
  it("checks a clinical title despite unrelated nonmedical organisation boilerplate", async () => {
    const text = vi
      .spyOn(SourceHttp.prototype, "text")
      .mockResolvedValueOnce(
        orgIndex(
          '<tr><td>1</td><td>Medical Services</td><td><a href="/list">1</a></td></tr>',
        ),
      )
      .mockResolvedValueOnce(
        "<h1>Tender ID</h1>" +
          list
            .replace("Digital PET/CT Scanner 128 Slice", "Surgical instruments")
            .replace(
              "||Accounts||Head Office",
              "||Electrical works||Head Office",
            ),
      )
      .mockResolvedValueOnce(
        detail.replace(
          /<table id='corrigendumDocumenttable'>[\s\S]*?<\/table>/g,
          "",
        ),
      );
    const result = await createNicAdapter(config).fetch();
    expect(text).toHaveBeenCalledTimes(3);
    expect(result.metrics.medicalMatches).toBe(1);
    expect(result.metrics.detailChecks).toBe(1);
    expect(result.records[0].verification).toBe("detail");
  });
  it("keeps all failed organisation fetches unavailable so last-good cache survives", async () => {
    vi.spyOn(SourceHttp.prototype, "text")
      .mockResolvedValueOnce(
        orgIndex(
          '<tr><td>1</td><td>Medical Services</td><td><a href="/nicgep/app?listing=1">1</a></td></tr>',
        ),
      )
      .mockRejectedValue(new Error("Source timed out"));
    const result = await createNicAdapter(config).fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.records).toHaveLength(0);
    expect(result.successfulAt).toBeUndefined();
  });
});

// Official corrigendum details repeat the tender ID with a colon label.
// Session drift must never apply another tender's deadline.
describe("NIC corrigendum identity", () => {
  const current = `<h1>Published Corrigendum Details</h1><table>${field("Tender ID :", "2026_HPMSC_141463_1")}${field("Bid Submission End Date", "03-Oct-2026 03:00 PM")}</table><h2>Details Before Corrigendum</h2><table>${field("Bid Submission End Date", "18-Sep-2026 03:00 PM")}</table>`;
  it("verifies the tender identity and uses only the revised critical dates", () => {
    expect(
      parseNicCorrigendum(
        current,
        "https://hptenders.gov.in/corr",
        "2026_HPMSC_141463_1",
      ).revisedClosingDate,
    ).toBe("2026-10-03T15:00:00+05:30");
  });
  it("rejects another tender or a missing identity", () => {
    expect(() =>
      parseNicCorrigendum(
        current,
        "https://hptenders.gov.in/corr",
        "2026_HPMSC_143790_1",
      ),
    ).toThrow("mismatch");
    expect(() =>
      parseNicCorrigendum(
        current.replace("Tender ID :", "Unrelated"),
        "https://hptenders.gov.in/corr",
        "2026_HPMSC_141463_1",
      ),
    ).toThrow("missing");
  });
});
