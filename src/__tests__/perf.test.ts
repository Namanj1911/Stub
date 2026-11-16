// R1 (REVIEW_FINDINGS_2026-11-16): the per-render maths must stay linear in
// history. Every function here used to filter the whole entries array once
// per day walked, so a loyal user's Log screen got slower every day — two
// years at a pack a day took ~3 seconds per render on a Mac.
//
// Two kinds of assertion, because a timing test alone is a weak witness:
// the answers must match a brute-force recount, and a long history must
// finish far inside a budget the quadratic version missed by 30×.

import {
  computeSavings,
  dayKey,
  dayTotals,
  entriesForDay,
  totalForDay,
  totalSixths,
} from '../domain';
import type { Entry } from '../domain';
import { cumulativeAvoided } from '../health';
import { planNotifications } from '../notificationPlan';
import { smokeFree } from '../postzero';
import { heatCells, tiles, underBudgetCount, underBudgetStreaks } from '../stats';
import { INSTALL_KEY, appData, atLocalHour, baseline, smoke } from './fixtures';

const I = INSTALL_KEY;
const PRICE = [{ fromTimestamp: 0, pricePerStick: 20 }];

// `perDay` separate entries on each of `days` days, spread across waking hours.
function history(days: number, perDay: number): Entry[] {
  const out: Entry[] = [];
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < perDay; i++) out.push(smoke(I + d, 1, 6 + (i % 18)));
  }
  return out;
}

describe('dayTotals — one pass, shared', () => {
  it('agrees with a brute-force recount on every day, including empty ones', () => {
    const entries = [...history(30, 3), smoke(I + 40, 0.5, 25), smoke(I + 40, 2, 5)];
    for (let k = I - 2; k <= I + 42; k++) {
      expect(totalForDay(entries, k)).toBe(totalSixths(entriesForDay(entries, k)));
    }
  });

  it('keys a 1am smoke to the evening before (NFR3), like dayKey', () => {
    const late = smoke(I + 3, 1, 25);
    expect(dayKey(late.timestamp)).toBe(I + 3);
    expect(totalForDay([late], I + 3)).toBe(6);
    expect(totalForDay([late], I + 4)).toBe(0);
  });

  it('is cached per array, and a new array is a new answer', () => {
    const a = history(5, 2);
    expect(dayTotals(a)).toBe(dayTotals(a));
    const b = [...a, smoke(I + 4, 1)];
    expect(totalForDay(a, I + 4)).toBe(12);
    expect(totalForDay(b, I + 4)).toBe(18);
  });

  it('does not serve a stale total to a caller that appended in place', () => {
    const a = history(2, 1);
    expect(totalForDay(a, I + 1)).toBe(6);
    a.push(smoke(I + 1, 1));
    expect(totalForDay(a, I + 1)).toBe(12);
  });
});

describe('two years at a pack a day stays fast (R1)', () => {
  const DAYS = 730;
  const entries = history(DAYS, 20);
  const today = I + DAYS - 1;
  const base = [baseline(20)];

  it('one pass of every screen’s maths finishes well inside the budget', () => {
    const data = appData({ entries, baselineHistory: base });
    const evening = atLocalHour(today, 21);

    const t0 = performance.now();
    smokeFree(entries, today, I); // Log, Goal, Health
    computeSavings(entries, base, PRICE, I, today); // Money
    underBudgetStreaks(entries, today, I, base, []); // Stats
    underBudgetCount(entries, today, I, base, [], 28);
    tiles('month', entries, today, I, base, [], PRICE, evening);
    heatCells(entries, today, I, base, []);
    cumulativeAvoided(entries, base, PRICE, I, today); // Health
    planNotifications(data, evening); // every store write, evenings
    const ms = performance.now() - t0;

    // Linear: ~20 ms here. The quadratic version took several seconds, so the
    // budget has a wide margin on both sides and will not flake on a slow CI.
    expect(ms).toBeLessThan(400);
  });
});
