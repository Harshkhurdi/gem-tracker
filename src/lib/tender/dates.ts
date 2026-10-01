const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
export function parseIndianDate(
  input: string,
  endOfDay = false,
): string | undefined {
  const value = input.trim().replace(/\s+/g, " ");
  if (!value || /^(?:NA|N\/A|Others|-+)$/i.test(value)) return;
  const iso = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?)?$/,
  );
  let y = 0,
    m = 0,
    d = 0,
    h = endOfDay ? 23 : 0,
    minute = endOfDay ? 59 : 0,
    sec = endOfDay ? 59 : 0;
  if (iso) {
    y = +iso[1];
    m = +iso[2];
    d = +iso[3];
    if (iso[4]) {
      h = +iso[4];
      minute = +iso[5];
      sec = +(iso[6] || 0);
    }
  } else {
    const match = value.match(
      /\b(\d{1,2})[-/. ](\d{1,2}|[A-Za-z]{3,9})[-/. ,]+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?\b/i,
    );
    if (!match) return;
    y = +match[3];
    m = /^\d+$/.test(match[2])
      ? +match[2]
      : months.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
    d = +match[1];
    if (match[4]) {
      h = +match[4];
      minute = +match[5];
      sec = +(match[6] || 0);
      if (match[7]) {
        if (h < 1 || h > 12) return;
        h = (h % 12) + (match[7].toUpperCase() === "PM" ? 12 : 0);
      }
    }
  }
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    y < 2000 ||
    y > 2100 ||
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d ||
    h > 23 ||
    minute > 59 ||
    sec > 59
  )
    return;
  const z = iso?.[7] || "+05:30";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(sec).padStart(2, "0")}${z}`;
}
export function dayOnly(value: string) {
  return !/\d{1,2}:\d{2}/.test(value);
}
export function istDay(now: Date = new Date()) {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

/** A date-only tender deadline includes the full Indian calendar day. */
export function closingDeadlineTimestamp(value?: string): number {
  if (!value) return NaN;
  return Date.parse(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999+05:30` : value,
  );
}
