/** Earliest supported dateTaken bound (2000-01-01T00:00:00Z). */
export const MIN_YEAR = 2000;
export const MIN_EPOCH_MS = Date.UTC(MIN_YEAR, 0, 1);

export interface DateParts {
  day: number;
  month: number;
  year: number;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function partsToEpochMs(
  parts: DateParts,
  bound: "start" | "end",
): number | null {
  const { day, month, year } = parts;
  if (!day || !month || !year || year < MIN_YEAR) return null;
  const maxDay = daysInMonth(month, year);
  if (day < 1 || day > maxDay || month < 1 || month > 12) return null;

  if (bound === "start") {
    return Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  }
  return Date.UTC(year, month - 1, day, 23, 59, 59, 999);
}

export function yearOptions(from = MIN_YEAR, to = new Date().getUTCFullYear()): number[] {
  const years: number[] = [];
  for (let y = to; y >= from; y -= 1) years.push(y);
  return years;
}

export function dayOptions(month: number, year: number): number[] {
  const max = month && year ? daysInMonth(month, year) : 31;
  return Array.from({ length: max }, (_, i) => i + 1);
}

export function formatEpochMs(value: number | string | undefined | null): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
