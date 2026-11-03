/**
 * Local calendar date as "YYYY-MM-DD".
 *
 * Streaks and daily goals follow the learner's own day, so this deliberately
 * uses local time rather than UTC.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The date key `days` days before the given one (negative values move forward). */
export function shiftDateKey({ dateKey, days }: { dateKey: string; days: number }): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(year, month - 1, day - days);
  return toLocalDateKey(shifted);
}
