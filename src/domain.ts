// Core domain rules (SPEC.md "Core domain rules", prototype logic class).
// NFR2: all counts are integer sixths of a cigarette — ⅓ = 2, ½ = 3, full = 6.
// No floating-point cigarette math.

export type Entry = {
  id: string;
  sixths: number;
  timestamp: number; // epoch ms
  backfilled?: boolean;
};

export type Pace = 'chill' | 'steady' | 'beast';

// sixths/day reduced per week
export const PACE_RATE: Record<Pace, number> = { chill: 1.5, steady: 3, beast: 6 };

const FRACTION_GLYPH: Record<number, string> = { 1: '⅙', 2: '⅓', 3: '½', 4: '⅔', 5: '⅚' };

export function frac(sixths: number): string {
  const whole = Math.floor(sixths / 6);
  const glyph = FRACTION_GLYPH[sixths % 6] ?? '';
  if (whole === 0) return glyph || '0';
  return whole + glyph;
}

// NFR3: day boundary = device-local 4:00 AM. A "day key" is the number of
// whole days since epoch of (local time − 4h), so a 1 am smoke belongs to
// the previous evening's day.
export function dayKey(timestamp: number): number {
  const shifted = new Date(timestamp - 4 * 3600_000);
  return Math.floor(
    (shifted.getTime() - shifted.getTimezoneOffset() * 60_000) / 86_400_000,
  );
}

export function entriesForDay(entries: Entry[], key: number): Entry[] {
  return entries.filter((e) => dayKey(e.timestamp) === key);
}

export function totalSixths(entries: Entry[]): number {
  return entries.reduce((a, e) => a + e.sixths, 0);
}

// Daily totals for the 7 day-keys before `todayKey`. Days after install with
// no entries count as 0 (a clean day is a clean day); days before the user
// existed fall back to their stated baseline.
export function trailing7Totals(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineSixths: number,
): number[] {
  const out: number[] = [];
  for (let k = todayKey - 7; k < todayKey; k++) {
    out.push(k >= installDayKey ? totalSixths(entriesForDay(entries, k)) : baselineSixths);
  }
  return out;
}

// Adaptive budget = max(½ cig, 90% of trailing 7-day average rounded to
// nearest ½). On install day there is no history yet: budget = stated
// baseline (S13 — taper begins day 2).
export function budgetSixths(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineSixths: number,
): number {
  if (todayKey <= installDayKey) return baselineSixths;
  const avg =
    trailing7Totals(entries, todayKey, installDayKey, baselineSixths).reduce((a, b) => a + b, 0) / 7;
  return Math.max(3, Math.round((avg * 0.9) / 3) * 3);
}

export function tomorrowBudgetSixths(budget: number, pace: Pace): number {
  return Math.max(0, budget - Math.round(PACE_RATE[pace] / 7));
}

export function weeksToQuit(budget: number, pace: Pace): number {
  return Math.ceil(budget / PACE_RATE[pace]);
}

export function quitDate(budget: number, pace: Pace, now = Date.now()): Date {
  return new Date(now + weeksToQuit(budget, pace) * 7 * 86_400_000);
}

export function fmtSince(lastAt: number | null, now = Date.now()): string {
  if (lastAt == null) return '';
  const mins = Math.max(1, Math.round((now - lastAt) / 60_000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

export function fmtTime(timestamp: number): string {
  return new Date(timestamp)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}
