import { describe, expect, it } from "vitest";
import { displayDeadline } from "../src/lib/tender/deadline-display";

describe("source precision in document deadline display", () => {
  it.each(["2026-10-07", "2026-10-07T23:59:59+05:30"])("does not invent a time for day precision %s", (effectiveClosingDate) => {
    expect(displayDeadline({ effectiveClosingDate, datePrecision: "day" })).toBe("07 Oct 2026 · Time not confirmed");
  });
  it("recognizes date-only values without a precision flag", () => {
    expect(displayDeadline({ effectiveClosingDate: "2026-10-07" })).toBe("07 Oct 2026 · Time not confirmed");
  });
  it("does not infer a time from inconsistent minute metadata", () => {
    expect(displayDeadline({ effectiveClosingDate: "2026-10-07", datePrecision: "minute" })).toBe("07 Oct 2026 · Time not confirmed");
  });
  it("shows a confirmed time in IST", () => {
    expect(displayDeadline({ effectiveClosingDate: "2026-10-07T08:30:00Z", datePrecision: "minute" })).toBe("07 Oct 2026, 02:00 pm IST");
  });
  it.each([undefined, "bad-date"])("retains unknown deadlines %s", (effectiveClosingDate) => {
    expect(displayDeadline({ effectiveClosingDate })).toBe("Deadline unknown");
  });
});
