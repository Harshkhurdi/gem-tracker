import { describe, expect, it } from "vitest";
import {
  applyInstitutionDocument,
  bfuhsDocumentUrl,
  parseInstitution,
} from "@/lib/sources/adapters/institution";
import { officialDocumentRedirect, officialUrl } from "@/lib/sources/http";
const bathinda = (end: string) =>
  parseInstitution(
    `<table><tr><td>1</td><td>GEM/2026/B/7831962</td><td>DVT Pumps</td><td>27-08-2026</td><td>${end}</td><td><a href="/images/procurements/doc.pdf">Bid document</a></td></tr></table>`,
    "aiims-bathinda",
    "2026-10-01T00:00:00Z",
  )[0];
describe("institution document evidence", () => {
  it("recovers the known erroneous Bathinda mirror deadline from an explicit PDF field", () => {
    const r = bathinda("18-09-2025");
    expect(r.originalClosingDate).toBeUndefined();
    applyInstitutionDocument(
      r,
      "Bid End Date/Time 18-09-2026 12:00:00\nBid Opening Date/Time 18-09-2026 12:30:00",
      "https://www.aiimsbathinda.edu.in/doc.pdf",
    );
    expect(r.originalClosingDate).toBe("2026-09-18T12:00:00+05:30");
    expect(r.datePrecision).toBe("minute");
    expect(r.verification).toBe("listing");
    expect(r.sourceReferences).toHaveLength(2);
  });
  it("refines a matching day deadline without treating the original bid as complete amendment evidence", () => {
    const r = bathinda("13-10-2026");
    applyInstitutionDocument(
      r,
      "Bid End Date/Time 13-10-2026 16:00:00",
      "https://www.aiimsbathinda.edu.in/doc.pdf",
    );
    expect(r.originalClosingDate).toBe("2026-10-13T16:00:00+05:30");
    expect(r.verification).toBe("listing");
  });
  it("does not guess which conflicting mirror/document date is current", () => {
    const r = bathinda("20-10-2026");
    applyInstitutionDocument(
      r,
      "Bid End Date/Time 13-10-2026 16:00:00",
      "https://www.aiimsbathinda.edu.in/doc.pdf",
    );
    expect(r.originalClosingDate).toBeUndefined();
  });
  it("rejects a PDF explicitly identifying a different GeM bid", () => {
    const r = bathinda("13-10-2026");
    applyInstitutionDocument(
      r,
      "Bid Number: GEM/2026/B/9999999\nBid End Date/Time 15-10-2026 16:00:00",
      "https://www.aiimsbathinda.edu.in/doc.pdf",
    );
    expect(r.originalClosingDate).toBe("2026-10-13T23:59:59+05:30");
    expect(r.description).toBeUndefined();
  });
  it("keeps scanned/ambiguous BFUHS deadlines unknown", () => {
    const r = bathinda("18-09-2025");
    applyInstitutionDocument(
      r,
      "The sealed quotations should reach this office on or before 39 *:26 by s dp PM",
      "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5367.pdf",
    );
    expect(r.originalClosingDate).toBeUndefined();
  });
  it("bounds known BFUHS paths to numeric notice IDs and a published year", () => {
    expect(bfuhsDocumentUrl("5368", "2026-09-15T00:00:00+05:30")).toContain(
      "/2026/Tender_5368.pdf",
    );
    expect(bfuhsDocumentUrl("../secret", "2026")).toBeUndefined();
    expect(bfuhsDocumentUrl("5368")).toBeUndefined();
  });
});
describe("GMC Amritsar document redirects", () => {
  const from = "https://www.gmc.edu.in/_files/ugd/9090ab_file.pdf";
  const target =
    "https://bf8acbf3-d9c2-4d05-85d6-d9849a6e99ab.filesusr.com/ugd/9090ab_file.pdf";
  it("permits only the observed tenant with the same PDF path", () => {
    expect(officialDocumentRedirect(target, from)).toBe(target);
    expect(officialUrl(target)).toBeUndefined();
  });
  it("rejects other tenants, changed files, and untrusted origins", () => {
    expect(
      officialDocumentRedirect(
        target.replace("bf8acbf3-d9c2-4d05-85d6-d9849a6e99ab", "other"),
        from,
      ),
    ).toBeUndefined();
    expect(
      officialDocumentRedirect(target.replace("file.pdf", "other.pdf"), from),
    ).toBeUndefined();
    expect(
      officialDocumentRedirect(
        target,
        "https://example.com/_files/ugd/9090ab_file.pdf",
      ),
    ).toBeUndefined();
  });
});

import { createHash } from "node:crypto";
import { reviewedDocumentDeadline } from "@/lib/sources/reviewed-documents";
describe("reviewed scanned document evidence", () => {
  it("requires both exact official URL and fresh content hash", () => {
    const bytes = new TextEncoder().encode("%PDF-test-review");
    const entry = {
      url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_1.pdf",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      date: "2026-09-30T17:00:00+05:30",
      datePrecision: "minute" as const,
      reviewedAt: "2026-10-01",
      evidenceField: "page 1 receipt date",
      legibility: "clear",
      institutionId: "ggsmch-faridkot",
    };
    expect(reviewedDocumentDeadline(entry.url, bytes, [entry])).toEqual(entry);
    expect(
      reviewedDocumentDeadline(
        entry.url,
        new TextEncoder().encode("%PDF-changed"),
        [entry],
      ),
    ).toBeUndefined();
    expect(
      reviewedDocumentDeadline(entry.url + "?other", bytes, [entry]),
    ).toBeUndefined();
  });
});
