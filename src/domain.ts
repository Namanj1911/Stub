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

// Effective-dated profile facts (BACKLOG P1, settled 2026-07-17). Baseline
// edits apply from a day key; brand/price switches apply from a wall-clock
// moment. History is append-only so money-saved never rewrites the past.
export type BaselineRecord = { fromDayKey: number; countPerDay: number };
export type PriceRecord = {
  fromTimestamp: number; // epoch ms; the seed record uses 0 (retroactive)
  pricePerStick: number;
  brandId?: string; // unset for custom / "something else" brands
};

// Both lookups fall back to the first record for moments before any record —
// the onboarding value is the best guess for the pre-install past.
export function baselineSixthsFor(history: BaselineRecord[], key: number): number {
  let current = history[0];
  for (const r of history) {
    if (r.fromDayKey <= key) current = r;
    else break;
  }
  return current.countPerDay * 6;
}

export function priceAt(history: PriceRecord[], timestamp: number): number {
  let current = history[0];
  for (const r of history) {
    if (r.fromTimestamp <= timestamp) current = r;
    else break;
  }
  return current.pricePerStick;
}

// Price in effect at the end of a day: the last record that took effect on or
// before that day. Avoided smokes have no timestamp, so a day's worth of
// not-smoking is valued at what a stick cost by that evening.
function priceAtEndOfDay(history: PriceRecord[], key: number): number {
  let current = history[0];
  for (const r of history) {
    if (dayKey(r.fromTimestamp) <= key) current = r;
    else break;
  }
  return current.pricePerStick;
}

// Money saved (S21): per day, (that day's baseline − actual) valued in ₹.
// Smoked entries are valued at the price in effect when they were lit
// (backfill-safe); avoided smokes at the day's ending price. Today counts
// as it stands.
export function computeSavings(
  entries: Entry[],
  baselineHistory: BaselineRecord[],
  priceHistory: PriceRecord[],
  installDayKey: number,
  todayKey: number,
): { saved: number; savedWeek: number } {
  let saved = 0;
  let savedWeek = 0;
  for (let k = installDayKey; k <= todayKey; k++) {
    const actualCost = entriesForDay(entries, k).reduce(
      (a, e) => a + (e.sixths * priceAt(priceHistory, e.timestamp)) / 6,
      0,
    );
    const counterfactualCost =
      (baselineSixthsFor(baselineHistory, k) * priceAtEndOfDay(priceHistory, k)) / 6;
    const daySaved = counterfactualCost - actualCost;
    saved += daySaved;
    if (k > todayKey - 7) savedWeek += daySaved;
  }
  return { saved, savedWeek };
}

// sixths/day reduced per week. Retuned 2026-07-18 from ¼/½/1 cigs — ¼/wk sat
// below the half-cig display granularity and stretched a 10/day smoker's
// quit to 40 weeks; every pace now moves at least one visible step per week.
export const PACE_RATE: Record<Pace, number> = { chill: 3, steady: 6, beast: 12 };

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

// Weekday of a day key (getDay() convention, 0 = Sunday). Day-key 0 covers
// 1970-01-01, a Thursday. Charts must label days from the key, not the wall
// clock — between midnight and 4am the current key is still "yesterday".
export function weekdayOfKey(key: number): number {
  return (key + 4) % 7;
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
// nearest ½) — clamped so it only ever tapers: a day's budget never exceeds
// the previous day's, so smoking over budget can't raise tomorrow's bar.
// A baseline edit re-seeds the taper from its effective day (the one honest
// way the budget may rise: "I actually smoke more than I said"). On install
// day there is no history yet: budget = stated baseline (S13 — taper begins
// day 2).
//
// The clamp chains each day on the previous one, so per-day grading
// (streaks, under-budget counts, heatmap) must read from this series —
// index = key − installDayKey — rather than recompute the chain per day,
// which is quadratic in days of use.
export function budgetSeries(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
): number[] {
  const preInstall = baselineSixthsFor(baselineHistory, installDayKey);
  const totals = new Map<number, number>();
  for (const e of entries) {
    const k = dayKey(e.timestamp);
    totals.set(k, (totals.get(k) ?? 0) + e.sixths);
  }
  const totalFor = (k: number) => (k >= installDayKey ? totals.get(k) ?? 0 : preInstall);

  let budget = preInstall;
  const out = [budget];
  // sliding sum of the 7 days before k, seeded for k = installDayKey + 1
  let window = 0;
  for (let j = installDayKey - 6; j <= installDayKey; j++) window += totalFor(j);
  for (let k = installDayKey + 1; k <= todayKey; k++) {
    const base = baselineSixthsFor(baselineHistory, k);
    if (base !== baselineSixthsFor(baselineHistory, k - 1)) budget = base;
    budget = Math.min(budget, Math.max(3, Math.round(((window / 7) * 0.9) / 3) * 3));
    out.push(budget);
    window += totalFor(k) - totalFor(k - 7);
  }
  return out;
}

export function budgetSixths(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
): number {
  const series = budgetSeries(entries, todayKey, installDayKey, baselineHistory);
  return series[series.length - 1];
}

// Tomorrow's budget (S11), predicted with the real formula: one more chain
// step, assuming no more smokes today. The spec's budget − paceRate/7 rounded
// to whole sixths, which was 0 for chill and steady — the card promised a
// taper it never showed, and could disagree with what the Log screen actually
// says tomorrow.
export function tomorrowBudgetSixths(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
): number {
  const today = budgetSixths(entries, todayKey, installDayKey, baselineHistory);
  const preInstall = baselineSixthsFor(baselineHistory, installDayKey);
  const avg =
    trailing7Totals(entries, todayKey + 1, installDayKey, preInstall).reduce((a, b) => a + b, 0) /
    7;
  return Math.min(today, Math.max(3, Math.round((avg * 0.9) / 3) * 3));
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
