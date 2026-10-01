import { closingDeadlineTimestamp } from "./dates";
import type { RawTender, TenderStatus } from "../../types/tender";
const validDate = (value?: string): number | undefined => {
  if (!value) return;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : undefined;
};
export function resolveStatus(
  raw: RawTender,
  now = new Date(),
): { status: TenderStatus; effectiveClosingDate?: string } {
  const corrigenda = [...(raw.corrigenda ?? [])]
    .map((c, i) => ({ c, i, date: validDate(c.publishedDate) ?? -Infinity }))
    .sort((a, b) => a.date - b.date || a.i - b.i);
  let effectiveClosingDate =
    validDate(raw.extendedClosingDate) !== undefined
      ? raw.extendedClosingDate
      : validDate(raw.originalClosingDate) !== undefined
        ? raw.originalClosingDate
        : undefined;
  let terminal: TenderStatus | undefined = raw.withdrawn
    ? "WITHDRAWN"
    : raw.cancelled
      ? "CANCELLED"
      : undefined;
  for (const { c } of corrigenda) {
    const notice = `${c.type ?? ""} ${c.title ?? ""}`;
    if (/\b(?:withdrawn|withdrawal|withdraw)\b/i.test(notice))
      terminal = "WITHDRAWN";
    else if (/\b(?:cancelled|canceled|cancellation|cancel)\b/i.test(notice))
      terminal = "CANCELLED";
    if (validDate(c.revisedClosingDate) !== undefined)
      effectiveClosingDate = c.revisedClosingDate;
  }
  if (terminal) return { status: terminal, effectiveClosingDate };
  if (!effectiveClosingDate) return { status: "DEADLINE_UNKNOWN" };
  if (closingDeadlineTimestamp(effectiveClosingDate) < now.getTime())
    return { status: "EXPIRED", effectiveClosingDate };
  const fetched = validDate(raw.fetchedAt);
  const fresh =
    fetched !== undefined &&
    now.getTime() - fetched <= 24 * 60 * 60 * 1000 &&
    fetched - now.getTime() <= 5 * 60 * 1000;
  return {
    status:
      raw.verification === "detail" && fresh
        ? "ACTIVE_VERIFIED"
        : "ACTIVE_LIKELY",
    effectiveClosingDate,
  };
}
