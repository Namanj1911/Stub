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

// The taper plan (design/HEALTH_TIMELINE.md §11). Effective-dated like the
// baseline: changing the plan must never rewrite past budgets, because
// budgetSeries() is what streaks, the heatmap and under-budget grading are
// scored against — a reschedule that silently flipped old verdicts would be
// the app rewriting history.
//
// `rate` is sixths/week and is the canonical value: the three presets set it
// (3/6/12 via PACE_RATE) and the date picker sets it from the distance to the
// target. `startBudget` anchors the straight line the plan draws from
// `fromDayKey`.
export type PlanRecord = { fromDayKey: number; rate: number; startBudget: number };
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

// The record in effect at the end of a day: the last one that took effect on
// or before that day. Avoided smokes have no timestamp of their own, so a
// day's worth of not-smoking is valued at whatever the user was smoking by
// that evening — the price for Money, and the brand's per-stick nicotine/tar
// for the health timeline (health.cumulativeAvoided). Both need the same
// effective-dating rule, so it lives here once.
export function priceRecordAtEndOfDay(history: PriceRecord[], key: number): PriceRecord {
  let current = history[0];
  for (const r of history) {
    if (dayKey(r.fromTimestamp) <= key) current = r;
    else break;
  }
  return current;
}

function priceAtEndOfDay(history: PriceRecord[], key: number): number {
  return priceRecordAtEndOfDay(history, key).pricePerStick;
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

// The budget the plan calls for on a given day: a straight line down from
// `startBudget` at the plan's rate, rounded to the half-cigarette the UI can
// actually display.
//
// Deliberately NOT subject to budgetSeries()'s max(3) floor. That floor keeps
// the *adaptive* budget from collapsing to zero on a quiet week, but applied
// to the plan it would park every user at ½ a cigarette a day forever — the
// quit date would be unreachable by construction, and post-zero mode could
// never trigger. The plan is the one path that is allowed to reach 0.
export function plannedBudgetFor(history: PlanRecord[], key: number): number | null {
  if (!history.length) return null;
  let current = history[0];
  for (const r of history) {
    if (r.fromDayKey <= key) current = r;
    else break;
  }
  if (key < current.fromDayKey) return null;
  const weeks = (key - current.fromDayKey) / 7;
  return Math.max(0, Math.round((current.startBudget - current.rate * weeks) / 3) * 3);
}

// The plan record that begins exactly on `key`, if any. budgetSeries() re-seeds
// its taper chain on these: a plan record's `startBudget` is authoritative for
// its own start day (see the re-seed there for why this is the only way off a
// zero budget).
export function planStartingOn(history: PlanRecord[], key: number): PlanRecord | null {
  return history.find((r) => r.fromDayKey === key) ?? null;
}

// What the user is *actually* smoking lately, rounded to the half-cigarette the
// UI displays. Unlike budgetSeries this applies no 90% taper and no monotone
// clamp — it is a measurement, not a target, and it is what a restarted taper
// anchors on. Pre-install days are excluded: we only do arithmetic on days we
// watched (same rule as Money and the cumulative health section).
//
// Today counts, via max() rather than as another term in the mean. Two reasons,
// and they pull the same way: today is a *partial* day, so averaging it in
// drags the anchor below the real rate; and a relapse that happens today is
// invisible to a trailing window that ends yesterday, which is exactly the user
// most likely to be tapping "start a new taper". Anchoring below what someone
// is already smoking hands them a budget they have blown before they start.
export function recentDailyAverageSixths(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
): number {
  const from = Math.max(installDayKey, todayKey - 7);
  let mean = 0;
  if (todayKey > from) {
    let total = 0;
    for (let k = from; k < todayKey; k++) total += totalSixths(entriesForDay(entries, k));
    mean = total / (todayKey - from);
  }
  const today = totalSixths(entriesForDay(entries, todayKey));
  return Math.round(Math.max(mean, today) / 3) * 3;
}

// NOTE: the date→rate conversion (rateForTarget/targetKeyForRate) was built
// and removed on 2026-07-19 with the target-date picker — see BACKLOG
// "Later". If it comes back, the rate must be fractional and the date derived
// in days, not whole weeks: whole-number rounding on both sides made most
// picked dates snap to a different one. The plan record and the
// min(adaptive, planned) math it feeds are unaffected and stay.

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
// Two things re-seed the taper from their effective day — the only honest ways
// the budget may rise. A baseline edit ("I actually smoke more than I said"),
// and a new plan record, whose `startBudget` is authoritative for its own start
// day. On install day there is no history yet: budget = stated baseline
// (S13 — taper begins day 2).
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
  planHistory: PlanRecord[],
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
    // A plan record re-anchors the chain on its start day. Without this the
    // monotone clamp below makes zero a one-way door: once `budget` reaches 0
    // no later plan can lift it, because min() only ever descends — a new pace
    // re-anchored at startBudget 0 and a baseline edit got mined out by the
    // still-zero plan. For an ordinary mid-taper pace change this is a no-op
    // (setPlanRate anchors startBudget at the budget already in force today);
    // it only bites when the anchor is deliberately higher, which is what
    // "start a new taper" writes.
    const restart = planStartingOn(planHistory, k);
    if (restart) budget = restart.startBudget;
    budget = Math.min(budget, Math.max(3, Math.round(((window / 7) * 0.9) / 3) * 3));
    // the plan is a ceiling, not a replacement: whichever of the two is
    // stricter wins (§11.1(b)). The adaptive side keeps reacting to what was
    // actually smoked; the plan keeps pulling the ceiling down toward zero.
    const planned = plannedBudgetFor(planHistory, k);
    if (planned != null) budget = Math.min(budget, planned);
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
  planHistory: PlanRecord[],
): number {
  const series = budgetSeries(entries, todayKey, installDayKey, baselineHistory, planHistory);
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
  planHistory: PlanRecord[],
): number {
  const today = budgetSixths(entries, todayKey, installDayKey, baselineHistory, planHistory);
  const preInstall = baselineSixthsFor(baselineHistory, installDayKey);
  const avg =
    trailing7Totals(entries, todayKey + 1, installDayKey, preInstall).reduce((a, b) => a + b, 0) /
    7;
  const adaptive = Math.max(3, Math.round((avg * 0.9) / 3) * 3);
  const planned = plannedBudgetFor(planHistory, todayKey + 1);
  return Math.min(today, planned != null ? Math.min(adaptive, planned) : adaptive);
}

export function weeksToQuit(budget: number, pace: Pace): number {
  return Math.ceil(budget / PACE_RATE[pace]);
}

export function quitDate(budget: number, pace: Pace, now = Date.now()): Date {
  return new Date(now + weeksToQuit(budget, pace) * 7 * 86_400_000);
}

// Rate-based equivalents. The rate is the canonical plan value (§11.2), so
// these are what the screens should use; the Pace versions above remain for
// the preset labels and onboarding.
export function currentPlanRate(history: PlanRecord[]): number {
  return history.length ? history[history.length - 1].rate : PACE_RATE.steady;
}

// Effective-dated plan write (§11.2). Returns the history to persist for
// `rate` taking effect today. Re-selecting the rate already in force returns
// the SAME array reference — a signal to the store to skip the write. This
// matters because a fresh record re-anchors `startBudget` to today's rounded
// budget, restarting the sub-half-cigarette progress and pushing the next
// step-down out by up to ~1.75 days; without the guard, merely browsing the
// pace chips (or re-confirming the same target date) silently delays the taper.
// A genuine rate change collapses same-day (last write wins) so dithering
// between presets doesn't pile up records.
export function planHistoryWithRate(
  history: PlanRecord[],
  rate: number,
  todayKey: number,
  entries: Entry[],
  installDayKey: number,
  baselineHistory: BaselineRecord[],
): PlanRecord[] {
  if (currentPlanRate(history) === rate) return history;
  const kept = history.filter((r) => r.fromDayKey !== todayKey);
  const startBudget = budgetSixths(entries, todayKey, installDayKey, baselineHistory, kept);
  return [...kept, { fromDayKey: todayKey, rate, startBudget }];
}

export function weeksToQuitAtRate(budget: number, rate: number): number {
  return Math.max(1, Math.ceil(budget / Math.max(1, rate)));
}

export function quitDateAtRate(budget: number, rate: number, now = Date.now()): Date {
  return new Date(now + weeksToQuitAtRate(budget, rate) * 7 * 86_400_000);
}

// Which preset, if any, a rate corresponds to — the plan control highlights a
// preset only when the rate actually matches it, so a date-derived rate shows
// as "custom" rather than pretending to be one of the three.
export function paceForRate(rate: number): Pace | null {
  return (Object.keys(PACE_RATE) as Pace[]).find((p) => PACE_RATE[p] === rate) ?? null;
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
