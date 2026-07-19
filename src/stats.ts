// Stats computations for S5–S8, derived from real logged entries.
//
// Display honesty rule (BACKLOG P0): charts and tiles only ever show what was
// actually logged — days before install render as empty ('·' / '—'), never as
// the stated baseline. The baseline fallback lives exclusively inside the
// budget math (domain.budgetSixths), where it's needed for a sane day-1
// budget; it must not leak into anything the user sees as "their data".

import {
  BaselineRecord,
  PlanRecord,
  Entry,
  PriceRecord,
  budgetSeries,
  entriesForDay,
  fmtSince,
  fmtTime,
  frac,
  priceAt,
  totalSixths,
  weekdayOfKey,
} from './domain';

export type Bar = { label: string; val: string; h: number; accent: boolean };
export type StatsRange = 'day' | 'week' | 'month';
export type TileData = { label: string; value: string; accent?: boolean };

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Daily totals for the `n` day-keys ending at (and including) todayKey,
// oldest → newest. Days before install are null — no data, not zero.
function dailyTotals(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  n: number,
): (number | null)[] {
  const out: (number | null)[] = [];
  for (let k = todayKey - n + 1; k <= todayKey; k++) {
    out.push(k >= installDayKey ? totalSixths(entriesForDay(entries, k)) : null);
  }
  return out;
}

// S5 Day view — today's smokes by time-of-day bucket. The night bucket wraps
// past midnight (9pm–4am) to match the 4am day boundary: a 1am smoke belongs
// to the previous evening and must render as night, not morning. The 4–6am
// sliver folds into the first slot.
export function dayBars(todayEntries: Entry[]): Bar[] {
  const labels = ['6–9', '9–12', '12–3', '3–6', '6–9p', '9p–4'];
  const totals = [0, 0, 0, 0, 0, 0];
  for (const e of todayEntries) {
    const h = new Date(e.timestamp).getHours();
    const i = h < 4 ? 5 : h < 9 ? 0 : h < 12 ? 1 : h < 15 ? 2 : h < 18 ? 3 : h < 21 ? 4 : 5;
    totals[i] += e.sixths;
  }
  const m = Math.max(...totals, 6);
  return totals.map((v, i) => ({
    label: labels[i],
    val: v ? frac(v) : '·',
    h: Math.max(4, (v / m) * 100),
    accent: v > 6, // more than a full cigarette in one slot
  }));
}

// S5 Week view — cigarettes per day, last 7 days ending today. Labels come
// from the day key, not the wall clock — between midnight and 4am the last
// bar holds yesterday evening's day and must carry yesterday's name. Each
// bar is accented against its own day's budget, same rule as the streaks.
export function weekBars(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
  planHistory: PlanRecord[],
): Bar[] {
  const week = dailyTotals(entries, todayKey, installDayKey, 7);
  const budgets = budgetSeries(entries, todayKey, installDayKey, baselineHistory, planHistory);
  const keys = week.map((_, i) => todayKey - 6 + i);
  const max = Math.max(
    ...week.map((v) => v ?? 0),
    ...keys.filter((k) => k >= installDayKey).map((k) => budgets[k - installDayKey]),
    1,
  );
  return week.map((v, i) => ({
    label: WEEKDAY[weekdayOfKey(keys[i])],
    val: v ? frac(v) : '·',
    h: v ? Math.max(6, (v / max) * 100) : 4,
    accent: v != null && keys[i] >= installDayKey && v > budgets[keys[i] - installDayKey],
  }));
}

// S5 Month view — daily average per week, last 4 weeks. Weeks average only
// over their post-install days; fully pre-install weeks render empty.
export function monthBars(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
): Bar[] {
  const days = dailyTotals(entries, todayKey, installDayKey, 28);
  const weeks = [0, 1, 2, 3].map((i) => {
    const real = days.slice(i * 7, i * 7 + 7).filter((v): v is number => v != null);
    return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
  });
  const m = Math.max(...weeks.map((v) => v ?? 0), 1);
  return weeks.map((v, i) => ({
    label: 'W' + (i + 1),
    val: v != null ? (v / 6).toFixed(1) : '·',
    h: v != null ? Math.max(6, (v / m) * 100) : 4,
    accent: i === 3 && v != null,
  }));
}

// Under-budget day count over the `n` day-keys ending today. Only post-install
// days are graded, each against its own day's budget, not today's (the budget
// tapers, so grading last week against today's tighter number would rewrite
// the past). `days` is how many real days the window holds.
export function underBudgetCount(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
  planHistory: PlanRecord[],
  n: number,
): { under: number; days: number } {
  const budgets = budgetSeries(entries, todayKey, installDayKey, baselineHistory, planHistory);
  let under = 0;
  let days = 0;
  for (let k = Math.max(installDayKey, todayKey - n + 1); k <= todayKey; k++) {
    days += 1;
    if (totalSixths(entriesForDay(entries, k)) <= budgets[k - installDayKey]) {
      under += 1;
    }
  }
  return { under, days };
}

// Days-under-budget streaks (BACKLOG P3, pulled forward for the Month tile).
// A day counts when its total stayed within that day's own budget; today
// counts as it stands — an over-budget evening breaks the streak honestly.
export function underBudgetStreaks(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
  planHistory: PlanRecord[],
): { current: number; best: number } {
  const budgets = budgetSeries(entries, todayKey, installDayKey, baselineHistory, planHistory);
  let current = 0;
  let best = 0;
  for (let k = installDayKey; k <= todayKey; k++) {
    const under = totalSixths(entriesForDay(entries, k)) <= budgets[k - installDayKey];
    current = under ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}

// Money spent over the `n` days ending today — each entry valued at the price
// in effect when it was lit (backfill- and brand-switch-safe), same rule as
// the Money tab's savings math. Always ~approximate: prices derive from MRP.
function spentOver(
  entries: Entry[],
  priceHistory: PriceRecord[],
  todayKey: number,
  n: number,
): number {
  let total = 0;
  for (let k = todayKey - n + 1; k <= todayKey; k++) {
    for (const e of entriesForDay(entries, k)) {
      total += (e.sixths / 6) * priceAt(priceHistory, e.timestamp);
    }
  }
  return total;
}

const inr = (n: number) => '~₹' + Math.round(n).toLocaleString('en-IN');

// S6 tiles + ring trend, per range (BACKLOG P2 round 2) — averages only over
// days that actually have data; '—' until there is enough real history for a
// comparison. The trend line is always the 7-day trend (it captions the
// budget ring, which is a today-thing regardless of range).
export function tiles(
  range: StatsRange,
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
  planHistory: PlanRecord[],
  priceHistory: PriceRecord[],
  now: number,
): { tiles: TileData[]; trendLine: string; trendDown: boolean } {
  const last7 = dailyTotals(entries, todayKey, installDayKey, 7).filter(
    (v): v is number => v != null,
  );
  const prev7 = dailyTotals(entries, todayKey - 7, installDayKey, 7).filter(
    (v): v is number => v != null,
  );
  const avg7 = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
  const prevAvg = prev7.length === 7 ? prev7.reduce((a, b) => a + b, 0) / 7 : null;
  const delta =
    prevAvg != null && prevAvg > 0 ? Math.round(((avg7 - prevAvg) / prevAvg) * 100) : null;
  const trendLine =
    delta == null
      ? 'no trend yet — keep logging'
      : `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta)}% vs last week`;
  const trendDown = delta != null && delta < 0;
  const pct = (d: number) => (d < 0 ? '−' : '+') + Math.abs(d) + '%';

  if (range === 'day') {
    const today = entriesForDay(entries, todayKey).sort((a, b) => a.timestamp - b.timestamp);
    // gaps between consecutive smokes, plus the still-open gap since the last
    const gaps: number[] = [];
    for (let i = 1; i < today.length; i++) gaps.push(today[i].timestamp - today[i - 1].timestamp);
    if (today.length) gaps.push(now - today[today.length - 1].timestamp);
    const longest = gaps.length ? Math.max(...gaps) : 0;
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    return {
      trendLine,
      trendDown,
      tiles: [
        { label: 'Longest gap today', value: today.length ? fmtSince(now - longest, now) : '—' },
        { label: 'Average gap today', value: today.length ? fmtSince(now - avgGap, now) : '—' },
        { label: 'First smoke', value: today.length ? fmtTime(today[0].timestamp) : '—' },
        { label: 'Spent today', value: inr(spentOver(entries, priceHistory, todayKey, 1)) },
      ],
    };
  }

  if (range === 'week') {
    const u = underBudgetCount(entries, todayKey, installDayKey, baselineHistory, planHistory, 7);
    return {
      trendLine,
      trendDown,
      tiles: [
        { label: 'Daily average (7d)', value: (avg7 / 6).toFixed(1) },
        { label: 'vs last week', value: delta == null ? '—' : pct(delta), accent: trendDown },
        { label: 'Under budget (7d)', value: `${u.under} / ${u.days || 1}` },
        { label: 'Spent (7d)', value: inr(spentOver(entries, priceHistory, todayKey, 7)) },
      ],
    };
  }

  const last28 = dailyTotals(entries, todayKey, installDayKey, 28).filter(
    (v): v is number => v != null,
  );
  const prev28 = dailyTotals(entries, todayKey - 28, installDayKey, 28).filter(
    (v): v is number => v != null,
  );
  const avg28 = last28.length ? last28.reduce((a, b) => a + b, 0) / last28.length : 0;
  const prevAvg28 = prev28.length === 28 ? prev28.reduce((a, b) => a + b, 0) / 28 : null;
  const delta28 =
    prevAvg28 != null && prevAvg28 > 0
      ? Math.round(((avg28 - prevAvg28) / prevAvg28) * 100)
      : null;
  const u28 = underBudgetCount(entries, todayKey, installDayKey, baselineHistory, planHistory, 28);
  return {
    trendLine,
    trendDown,
    tiles: [
      { label: 'Daily average (28d)', value: (avg28 / 6).toFixed(1) },
      {
        label: 'vs prev 4 weeks',
        value: delta28 == null ? '—' : pct(delta28),
        accent: delta28 != null && delta28 < 0,
      },
      { label: 'Under budget (28d)', value: `${u28.under} / ${u28.days || 1}` },
      { label: 'Spent (28d)', value: inr(spentOver(entries, priceHistory, todayKey, 28)) },
    ],
  };
}

// S7 — one insight, picked by relevance, with graceful fallback for new users.
export type Insight =
  | { kind: 'danger'; window: string }
  | { kind: 'weekend'; over: string }
  | { kind: 'newUser' };

export function pickInsight(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  budget: number,
  now: number,
): Insight {
  const recent = entries.filter((e) => e.timestamp >= now - 7 * 86_400_000);

  // weekend pattern: needs at least a week of real logging
  if (todayKey - installDayKey >= 7) {
    let satTotal = 0;
    let satDays = 0;
    for (let k = Math.max(installDayKey, todayKey - 27); k < todayKey; k++) {
      if (weekdayOfKey(k) !== 6) continue;
      satTotal += totalSixths(entriesForDay(entries, k));
      satDays += 1;
    }
    const satAvg = satDays ? satTotal / satDays : 0;
    if (satAvg > budget) {
      return { kind: 'weekend', over: ((satAvg - budget) / 6).toFixed(1) };
    }
  }

  // danger window: which 2-hour slot holds the most smokes this week
  if (recent.length >= 8) {
    const slots = new Array<number>(12).fill(0);
    for (const e of recent) slots[Math.floor(new Date(e.timestamp).getHours() / 2)] += e.sixths;
    const total = slots.reduce((a, b) => a + b, 0);
    const maxI = slots.indexOf(Math.max(...slots));
    if (total > 0 && slots[maxI] / total >= 0.25) {
      const fmtH = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
      return { kind: 'danger', window: `${fmtH(maxI * 2)}–${fmtH(maxI * 2 + 2)}` };
    }
  }

  return { kind: 'newUser' };
}

// S8 heatmap — last 28 days, each day's intensity relative to its own day's
// budget, same grading rule as the streaks and under-budget tiles.
export type HeatCell = { key: number; color: 'none' | 'low' | 'mid' | 'high' | 'over' };

export function heatCells(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineHistory: BaselineRecord[],
  planHistory: PlanRecord[],
): HeatCell[] {
  const budgets = budgetSeries(entries, todayKey, installDayKey, baselineHistory, planHistory);
  const cells: HeatCell[] = [];
  for (let k = todayKey - 27; k <= todayKey; k++) {
    if (k < installDayKey) {
      cells.push({ key: k, color: 'none' });
      continue;
    }
    const budget = budgets[k - installDayKey];
    const v = totalSixths(entriesForDay(entries, k));
    cells.push({
      key: k,
      color: v === 0 ? 'low' : v <= budget / 2 ? 'mid' : v <= budget ? 'high' : 'over',
    });
  }
  return cells;
}
