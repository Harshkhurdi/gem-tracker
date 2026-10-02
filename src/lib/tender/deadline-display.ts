import type { Tender } from "../../types/tender";

const dateOptions: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
};
const dayFormatter = new Intl.DateTimeFormat("en-IN", dateOptions);
const minuteFormatter = new Intl.DateTimeFormat("en-IN", {
  ...dateOptions, hour: "2-digit", minute: "2-digit",
});

/** Day precision is an inclusive calendar date, never a confirmed clock time. */
export function displayDeadline(tender: Pick<Tender, "effectiveClosingDate" | "datePrecision">): string {
  const value = tender.effectiveClosingDate;
  if (!value || !Number.isFinite(Date.parse(value))) return "Deadline unknown";
  const dayOnly = tender.datePrecision === "day" || /^\d{4}-\d{2}-\d{2}$/.test(value);
  return dayOnly
    ? `${dayFormatter.format(new Date(value))} · Time not confirmed`
    : `${minuteFormatter.format(new Date(value))} IST`;
}
