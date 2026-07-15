// Stats computations for S5–S8, derived from real logged entries. The
// prototype ran on canned history; here days before install fall back to the
// user's stated baseline (same convention as the adaptive budget), and
// anything that needs data we don't have yet renders as '—'.

import {
  Entry,
  entriesForDay,
  fmtSince,
  frac,
  totalSixths,
  trailing7Totals,
} from './domain';

export type Bar = { label: string; val: string; h: number; accent: boolean };

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Daily totals for the `n` day-keys ending at (and including) todayKey,
// oldest → newest, with baseline fallback before install.
function dailyTotals(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineSixths: number,
  n: number,
): number[] {
  const out: number[] = [];
  for (let k = todayKey - n + 1; k <= todayKey; k++) {
    out.push(k >= installDayKey ? totalSixths(entriesForDay(entries, k)) : baselineSixths);
  }
  return out;
}

// S5 Day view — today's smokes by time-of-day bucket. Bucket by clock hour;
// the 4–6 am tail of the day folds into the first slot.
export function dayBars(todayEntries: Entry[]): Bar[] {
  const labels = ['6–9', '9–12', '12–3', '3–6', '6–9p', '9–12p'];
  const totals = [0, 0, 0, 0, 0, 0];
  for (const e of todayEntries) {
    const h = new Date(e.timestamp).getHours();
    const i = h < 9 ? 0 : h < 12 ? 1 : h < 15 ? 2 : h < 18 ? 3 : h < 21 ? 4 : 5;
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

// S5 Week view — cigarettes per day, last 7 days ending today.
export function weekBars(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineSixths: number,
  budget: number,
  now: number,
): Bar[] {
  const week = dailyTotals(entries, todayKey, installDayKey, baselineSixths, 7);
  const max = Math.max(...week, budget, 1);
  return week.map((v, i) => ({
    label: WEEKDAY[new Date(now - (6 - i) * 86_400_000).getDay()],
    val: v ? frac(v) : '·',
    h: Math.max(6, (v / max) * 100),
    accent: v > budget,
  }));
}

// S5 Month view — daily average per week, last 4 weeks.
export function monthBars(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineSixths: number,
): Bar[] {
  const days = dailyTotals(entries, todayKey, installDayKey, baselineSixths, 28);
  const weeks = [0, 1, 2, 3].map(
    (i) => days.slice(i * 7, i * 7 + 7).reduce((a, b) => a + b, 0) / 7,
  );
  const m = Math.max(...weeks, 1);
  return weeks.map((v, i) => ({
    label: 'W' + (i + 1),
    val: (v / 6).toFixed(1),
    h: Math.max(6, (v / m) * 100),
    accent: i === 3,
  }));
}

// S6 tiles + ring trend
export function tiles(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  baselineSixths: number,
  budget: number,
  now: number,
) {
  const last7 = trailing7Totals(entries, todayKey + 1, installDayKey, baselineSixths);
  const prev7 = trailing7Totals(entries, todayKey - 6, installDayKey, baselineSixths);
  const avg7 = last7.reduce((a, b) => a + b, 0) / 7;
  const prevAvg = prev7.reduce((a, b) => a + b, 0) / 7;
  const delta = prevAvg > 0 ? Math.round(((avg7 - prevAvg) / prevAvg) * 100) : 0;

  const today = entriesForDay(entries, todayKey).sort((a, b) => a.timestamp - b.timestamp);
  let longest = 0;
  for (let i = 1; i < today.length; i++) {
    longest = Math.max(longest, today[i].timestamp - today[i - 1].timestamp);
  }
  if (today.length > 0) {
    longest = Math.max(longest, now - today[today.length - 1].timestamp);
  }

  return {
    avg7: (avg7 / 6).toFixed(1),
    vsLastWeek: (delta < 0 ? '−' : '+') + Math.abs(delta) + '%',
    trendLine: `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta)}% vs last week`,
    trendDown: delta < 0,
    underBudget: last7.filter((v) => v <= budget).length + ' / 7',
    longestGap: today.length ? fmtSince(now - longest, now) : '—',
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
      const dow = new Date(now - (todayKey - k) * 86_400_000).getDay();
      if (dow !== 6) continue;
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

// S8 heatmap — last 28 days, intensity relative to today's budget.
export type HeatCell = { key: number; color: 'none' | 'low' | 'mid' | 'high' | 'over' };

export function heatCells(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  budget: number,
): HeatCell[] {
  const cells: HeatCell[] = [];
  for (let k = todayKey - 27; k <= todayKey; k++) {
    if (k < installDayKey) {
      cells.push({ key: k, color: 'none' });
      continue;
    }
    const v = totalSixths(entriesForDay(entries, k));
    cells.push({
      key: k,
      color: v === 0 ? 'low' : v <= budget / 2 ? 'mid' : v <= budget ? 'high' : 'over',
    });
  }
  return cells;
}
