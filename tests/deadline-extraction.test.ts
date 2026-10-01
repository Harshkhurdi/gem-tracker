import { describe, expect, it } from "vitest";
import { parseIndianDate } from "@/lib/tender/dates";
import { extractSubmissionDeadline } from "@/lib/tender/deadline";
import { sanitizeError } from "@/lib/sources/http";

describe("Indian procurement date formats", () => {
  for (const input of [
    "01-10-2026",
    "01/10/2026",
    "01.10.2026",
    "01-Oct-2026",
    "01 October 2026",
    "2026-10-01",
  ])
    it(input, () =>
      expect(parseIndianDate(input, true)).toBe("2026-10-01T23:59:59+05:30"),
    );
  for (const input of ["01/10/2026 15:00", "01-Oct-2026 03:00 PM"])
    it(input, () =>
      expect(parseIndianDate(input)).toBe("2026-10-01T15:00:00+05:30"),
    );
  it("preserves valid ISO offsets and rejects impossible offsets", () => {
    expect(parseIndianDate("2026-10-01T15:00:00Z")).toBe(
      "2026-10-01T15:00:00Z",
    );
    expect(parseIndianDate("2026-10-01T15:00:00+05:30")).toBe(
      "2026-10-01T15:00:00+05:30",
    );
    expect(parseIndianDate("2026-10-01T15:00:00+99:99")).toBeUndefined();
    expect(parseIndianDate("2026-10-01T15:00:00+14:30")).toBeUndefined();
  });
});

describe("Explicit submission deadline extraction", () => {
  for (const label of [
    "Bid End Date/Time",
    "Closing Date",
    "Submission End Date",
    "Last Date",
    "Last Date & Time",
    "Bid Submission End Date",
    "End Date",
    "Due Date",
    "Last Date for Submission of Bids",
  ])
    it(label, () =>
      expect(
        extractSubmissionDeadline(`${label}: 01-Oct-2026 03:00 PM`)?.date,
      ).toBe("2026-10-01T15:00:00+05:30"),
    );
  it("reads multiline bilingual GeM fields", () =>
    expect(
      extractSubmissionDeadline(
        "Bid End Date/Time / बिड समाप्ति दिनांक/समय\n01-10-2026 15:00:00",
      )?.date,
    ).toBe("2026-10-01T15:00:00+05:30"));
  it("does not use bid opening or download dates", () => {
    expect(
      extractSubmissionDeadline(
        "Bid Opening Date: 10-Oct-2026 15:00\nDocument Download End Date: 09-Oct-2026 15:00",
      ),
    ).toBeUndefined();
    expect(
      extractSubmissionDeadline(
        "Document Download End Date: 09-Oct-2026 15:00\nBid Submission End Date: 08-Oct-2026 15:00",
      )?.date,
    ).toBe("2026-10-08T15:00:00+05:30");
  });
  it("prefers an expressly revised deadline to the original date", () =>
    expect(
      extractSubmissionDeadline(
        "Closing Date: 30-09-2026\nRevised Closing Date: 10-10-2026",
      )?.date,
    ).toBe("2026-10-10T23:59:59+05:30"));
  it("leaves unexplained conflicting deadlines unresolved", () =>
    expect(
      extractSubmissionDeadline(
        "Bid End Date: 10-10-2026\nClosing Date: 11-10-2026",
      ),
    ).toBeUndefined());
  it("rejects impossible dates", () =>
    expect(
      extractSubmissionDeadline("Closing Date: 31-02-2026"),
    ).toBeUndefined());
  it("ignores publication and unlabelled dates", () =>
    expect(
      extractSubmissionDeadline(
        "Published: 01-10-2026\nThe machine must be installed by 15-10-2026",
      ),
    ).toBeUndefined());
});

it("sanitizes status errors without returning appended private details", () => {
  expect(sanitizeError(new Error("HTTP 502 private upstream secret"))).toBe(
    "Official source HTTP 502",
  );
});
