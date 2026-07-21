// The budget chain: the adaptive taper, the plan ceiling, the two re-seeds,
// and tomorrow's prediction.
//
// This is the arithmetic every other number in the app is scored against —
// streaks, the heatmap, under-budget grading, post-zero mode, the nudge
// threshold. It is also the arithmetic that produced the one-way-door P0, and
// that bug was found by *probing* the maths rather than reading it. These
// tests are that probe, made repeatable.
//
// Values are hand-derived from the formula in the comments, not recorded from
// a run. Sixths throughout (NFR2): 6 = one cigarette, 3 = a half.

import {
  budgetHoldOnLog,
  budgetSeries,
  budgetSixths,
  currentPlanRate,
  planHistoryWithRate,
  plannedBudgetFor,
  recentDailyAverageSixths,
  tomorrowBudgetSixths,
} from '../domain';
import { INSTALL_KEY as I, baseline, dayKey, plan, smoke, smokeDaily } from './fixtures';

const b10 = [baseline(10)];

// series index = key − installDayKey (the comment on budgetSeries says grading
// must read it this way rather than recomputing per day).
const on = (series: number[], key: number) => series[key - I];

describe('budgetSeries — the adaptive taper', () => {
  it('starts at the stated baseline on install day (S13: taper begins day 2)', () => {
    expect(budgetSeries([], I, I, b10, [])[0]).toBe(60);
  });

  it('tapers to 90% of the trailing average, rounded to the half cigarette', () => {
    // Install day: 10 smoked. The 7-day window behind day I+1 is six
    // pre-install days at the baseline (60) plus install day's 60 = 420.
    // 420/7 = 60 → ×0.9 = 54 → /3 = 18 exactly → 54 sixths = 9 cigarettes.
    const series = budgetSeries([smoke(I, 10)], I + 1, I, b10, []);
    expect(on(series, I + 1)).toBe(54);
  });

  it('keeps tapering as the window empties, down to the half-cigarette floor', () => {
    // Nothing logged after install day. Each step drops one 60 out of the
    // window: 420→360→300→240→180→120.
    //   360/7=51.43 ×0.9=46.29 /3=15.43 → 15 → 45
    //   300/7=42.86 ×0.9=38.57 /3=12.86 → 13 → 39
    //   240/7=34.29 ×0.9=30.86 /3=10.29 → 10 → 30
    //   180/7=25.71 ×0.9=23.14 /3= 7.71 →  8 → 24
    //   120/7=17.14 ×0.9=15.43 /3= 5.14 →  5 → 15
    const series = budgetSeries([smoke(I, 10)], I + 6, I, b10, []);
    expect(series).toEqual([60, 54, 45, 39, 30, 24, 15]);
  });

  it('never rises on its own, however much is smoked (the monotone clamp)', () => {
    // The clamp is what stops smoking over budget from raising tomorrow's bar.
    const heavy = [...smokeDaily(I, 5, 2), ...smokeDaily(I + 5, 10, 40)];
    const series = budgetSeries(heavy, I + 14, I, b10, []);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeLessThanOrEqual(series[i - 1]);
    }
  });

  it('floors at half a cigarette without a plan — the adaptive side never reaches zero', () => {
    const series = budgetSeries([], I + 40, I, b10, []);
    expect(Math.min(...series)).toBe(3);
    expect(on(series, I + 40)).toBe(3);
  });

  it('stalls where the user actually is: 10/day forever holds the budget at 9', () => {
    // The reason the plan ceiling has to exist. A steady smoker's trailing
    // average never falls, so 90%-of-average converges and stops: the adaptive
    // budget alone would park them at 9 a day indefinitely.
    const series = budgetSeries(smokeDaily(I, 12, 10), I + 11, I, b10, []);
    expect(on(series, I + 11)).toBe(54);
    expect(new Set(series.slice(1)).size).toBe(1);
  });
});

describe('budgetSeries — the plan ceiling', () => {
  const steady = [plan(I, 6, 60)]; // 6 sixths/week off a 60-sixth anchor

  it('draws a straight line down from the anchor at the plan rate', () => {
    // plannedBudgetFor = max(0, round((60 − 6×weeks)/3)×3).
    expect(plannedBudgetFor(steady, I)).toBe(60);
    expect(plannedBudgetFor(steady, I + 7)).toBe(54); // exactly one week
    expect(plannedBudgetFor(steady, I + 70)).toBe(0); // ten weeks → zero
  });

  it('is a ceiling, not a replacement — the stricter of the two wins', () => {
    const entries = smokeDaily(I, 12, 10);
    const series = budgetSeries(entries, I + 11, I, b10, steady);
    for (let k = I; k <= I + 11; k++) {
      const planned = plannedBudgetFor(steady, k);
      expect(on(series, k)).toBeLessThanOrEqual(planned!);
    }
    // Day I+9 is where the plan first bites: the adaptive side is stalled at
    // 54, and the plan line has fallen to 60 − 6×(9/7) = 52.29 → 51.
    expect(on(series, I + 8)).toBe(54);
    expect(on(series, I + 9)).toBe(51);
  });

  it('is exempt from the half-cigarette floor, so zero is reachable', () => {
    // The adaptive floor is max(3, …); the plan is allowed past it, which is
    // what makes quit day and post-zero mode possible at all.
    const series = budgetSeries([], I + 70, I, b10, steady);
    expect(on(series, I + 70)).toBe(0);
  });
});

describe('budgetSeries — the two re-seeds (the only honest ways a budget may rise)', () => {
  it('a baseline edit re-seeds the chain from its effective day', () => {
    // Smoking 15/day throughout but having stated 10 at onboarding: the chain
    // descends from 60 toward the adaptive value. Correcting the baseline to
    // 15 lifts the budget off the clamp — 90 sixths, then min'd against the
    // adaptive 0.9 × 90 = 81.
    const entries = smokeDaily(I, 20, 15);
    const edited = [baseline(10), baseline(15, I + 10)];
    const series = budgetSeries(entries, I + 12, I, edited, []);

    expect(on(series, I + 9)).toBeLessThan(60);
    expect(on(series, I + 10)).toBe(81);
    expect(on(series, I + 10)).toBeGreaterThan(on(series, I + 9));
  });

  it('a plan record is authoritative for its own start day', () => {
    // The re-seed added by fix/taper-restart. Without it the monotone clamp
    // below would immediately mine the new anchor back down.
    const entries = smokeDaily(I, 20, 15);
    const restart = [plan(I + 10, 6, 90)];
    const series = budgetSeries(entries, I + 12, I, b10, restart);
    expect(on(series, I + 10)).toBe(81); // 90 anchor, min'd against adaptive 81
  });

  it('leaves every prior day byte-identical — a re-plan never re-grades the past', () => {
    // The invariant the whole effective-dating design exists to protect:
    // budgetSeries is what streaks, the heatmap and under-budget verdicts are
    // scored against, so a plan change that shifted an old value would be the
    // app silently rewriting history.
    const entries = smokeDaily(I, 30, 8);
    const before = budgetSeries(entries, I + 29, I, b10, [plan(I, 6, 60)]);
    const after = budgetSeries(entries, I + 29, I, b10, [plan(I, 6, 60), plan(I + 20, 12, 30)]);

    expect(after.slice(0, I + 20 - I)).toEqual(before.slice(0, I + 20 - I));
  });
});

describe('zero is not a one-way door (P0, 2026-07-20)', () => {
  // Reproduces the exact scenario from the backlog entry: a user whose plan
  // reached zero, who then relapses to 15/day for ten days and corrects their
  // baseline. Before fix/taper-restart there was no exit but a data-wiping
  // reset. Each number below is quoted in that entry.
  const relapse = smokeDaily(I + 20, 10, 15);
  const bEdit = [baseline(10), baseline(15, I + 20)];
  const zeroPlan = [plan(I + 10, 6, 0)];

  it('reproduces the trap: at zero, neither a relapse nor a baseline edit lifts the budget', () => {
    const series = budgetSeries(relapse, I + 29, I, bEdit, zeroPlan);
    expect(on(series, I + 29)).toBe(0);
    // ...and it was zero for the whole relapse, not just at the end.
    for (let k = I + 20; k <= I + 29; k++) expect(on(series, k)).toBe(0);
  });

  it('reproduces the near-miss: without any plan record the same relapse recovers only to ½', () => {
    // The baseline re-seed does fire here, but on the day it fires the
    // trailing window is still empty, so the adaptive floor pins it at 3 and
    // the monotone clamp holds it there. This is why "a baseline edit is the
    // one honest way the budget may rise" stopped being the whole story.
    const series = budgetSeries(relapse, I + 29, I, bEdit, []);
    expect(on(series, I + 29)).toBe(3);
  });

  it('anchors a restart on measured smoking, not the stale baseline', () => {
    expect(recentDailyAverageSixths(relapse, I + 29, I)).toBe(90); // 15/day
  });

  it('counts today via max(), so a relapse that happened today is visible', () => {
    // Today is a partial day; averaging it in would drag the anchor below the
    // real rate, and a trailing window ending yesterday cannot see it at all —
    // which is exactly the user reaching for the restart button.
    const quietThenToday = [...smokeDaily(I + 20, 7, 0), smoke(I + 27, 12)];
    expect(recentDailyAverageSixths(quietThenToday, I + 27, I)).toBe(72); // 12/day, not 12/8
  });

  it('recovers to the measured rate once a restart record is written', () => {
    const restarted = [...zeroPlan, plan(I + 29, 6, 90)];
    const series = budgetSeries(relapse, I + 29, I, bEdit, restarted);
    expect(on(series, I + 29)).toBe(81); // 13.5/day, with the adaptive taper still biting
  });

  it('does not re-grade the days spent at zero', () => {
    const restarted = [...zeroPlan, plan(I + 29, 6, 90)];
    const before = budgetSeries(relapse, I + 29, I, bEdit, zeroPlan);
    const after = budgetSeries(relapse, I + 29, I, bEdit, restarted);
    expect(after.slice(0, I + 29 - I)).toEqual(before.slice(0, I + 29 - I));
  });
});

describe('tomorrowBudgetSixths', () => {
  // The card's promise is "this is what the Log screen will say tomorrow".
  // That is not a formula to re-derive in a test — it is an equality with the
  // real chain, so assert exactly that.
  it('equals the real next-day chain step, assuming nothing more is logged today', () => {
    const entries = smokeDaily(I, 12, 10);
    const steady = [plan(I, 6, 60)];
    for (let d = 1; d <= 11; d++) {
      const today = I + d;
      const soFar = entries.filter((e) => dayKey(e.timestamp) <= today);
      expect(tomorrowBudgetSixths(soFar, today, I, b10, steady)).toBe(
        budgetSixths(soFar, today + 1, I, b10, steady),
      );
    }
  });

  it('holds across the re-seeds and at zero too', () => {
    const entries = smokeDaily(I, 40, 6);
    const bEdit = [baseline(10), baseline(15, I + 12)];
    const plans = [plan(I, 12, 60), plan(I + 25, 12, 18)];
    for (let d = 1; d <= 39; d++) {
      const today = I + d;
      const soFar = entries.filter((e) => dayKey(e.timestamp) <= today);
      expect(tomorrowBudgetSixths(soFar, today, I, bEdit, plans)).toBe(
        budgetSixths(soFar, today + 1, I, bEdit, plans),
      );
    }
  });

  it('never exceeds today (finding #8 is about the display, not this bound)', () => {
    // The open UX bug is that the number can rise *overnight* once more is
    // smoked today. What the function itself promises — never above today's
    // budget — does hold, and that is the part worth pinning.
    const entries = smokeDaily(I, 15, 9);
    for (let d = 1; d <= 14; d++) {
      const today = I + d;
      const soFar = entries.filter((e) => dayKey(e.timestamp) <= today);
      const t = tomorrowBudgetSixths(soFar, today, I, b10, [plan(I, 6, 60)]);
      expect(t).toBeLessThanOrEqual(budgetSixths(soFar, today, I, b10, [plan(I, 6, 60)]));
    }
  });
});

// The honest "your taper paused" signal (budget-holding notice). Fires only for
// the cigarette that cancels a step-down the adaptive ceiling had lined up —
// the moment the flat budget number stops being a surprise and starts being an
// explained consequence.
describe('budgetHoldOnLog — the budget-holding signal', () => {
  // baseline 10/day, then a 6/day week: as the higher baseline rolls out of the
  // trailing window the budget is still stepping down (36 → 33 due tomorrow).
  const hist = smokeDaily(I + 1, 3, 6);
  const today = I + 4;

  it('fires on the smoke that holds a due step-down flat (adaptive-bound)', () => {
    // 6 already smoked today; tomorrow was set to drop to 5½ (33). The 7th cig
    // lifts the 7-day average enough that tomorrow rounds back up to today's 6
    // (36) — the taper pauses, and this is the smoke that paused it.
    const before = [...hist, smoke(today, 6)];
    const after = [...before, smoke(today, 1)];
    const r = budgetHoldOnLog(before, after, today, I, b10, []);
    expect(r).toEqual({ held: true, budget: 36, wouldHaveBeen: 33 });
    // wouldHaveBeen is not a magic number: it is exactly tomorrow's budget as it
    // stood before this cigarette — the drop the user was about to get.
    expect(r.wouldHaveBeen).toBe(tomorrowBudgetSixths(before, today, I, b10, []));
  });

  it('stays silent when a plan (not intake) is what holds the budget', () => {
    // Same relapse, but a plan has already pulled the ceiling to 2½ cigs — the
    // plan is the binding constraint, it ignores intake, so nothing the user
    // smokes moves the budget and there is no paused taper to announce.
    const before = [...hist, smoke(today, 6)];
    const after = [...before, smoke(today, 1)];
    const r = budgetHoldOnLog(before, after, today, I, b10, [plan(I, 6, 18)]);
    expect(r.held).toBe(false);
  });

  it('stays silent when the smoke is not enough to hold the step-down (taper still happens)', () => {
    // A step-down to 5½ (33) is due tomorrow, but a single over-budget cigarette
    // on a light day does not lift the average enough to cancel it — the budget
    // still drops. No pause, so nothing to announce: this pins the `after` clause
    // (before < budget alone would wrongly fire).
    const before = smokeDaily(I + 1, 1, 3);
    const fToday = I + 2;
    const after = [...before, smoke(fToday, 1)];
    expect(tomorrowBudgetSixths(before, fToday, I, b10, [])).toBeLessThan(
      budgetSixths(after, fToday, I, b10, []),
    );
    expect(budgetHoldOnLog(before, after, fToday, I, b10, []).held).toBe(false);
  });

  it('stays silent when no step-down was due (a normal flat day)', () => {
    // Steady 10/day parks the budget at 9 cigs with nothing scheduled to drop;
    // an over-budget smoke keeps it flat, but flat was never a broken promise.
    const flat = smokeDaily(I + 1, 6, 10);
    const fToday = I + 7;
    const r = budgetHoldOnLog(flat, [...flat, smoke(fToday, 1)], fToday, I, b10, []);
    expect(r.held).toBe(false);
  });
});

// The effective-dated plan write, and the guard that finding #7 is about: a
// fresh record re-anchors startBudget to today's budget, so re-selecting the
// rate already in force must not write one — otherwise browsing the pace chips
// (or re-confirming the same target date) restarts sub-half-cig progress and
// delays the taper by up to ~1.75 days.
describe('planHistoryWithRate — the effective-dated plan write', () => {
  const seeded = [plan(I, 6, 60)]; // steady from install, anchored at 10/day

  it('re-selecting the rate in force is a no-op (same reference, finding #7)', () => {
    // currentPlanRate(seeded) === 6, so asking for 6 again must change nothing.
    // The SAME array back is the store's signal to skip the write entirely.
    const out = planHistoryWithRate(seeded, 6, I + 5, [], I, b10);
    expect(out).toBe(seeded);
    expect(currentPlanRate(out)).toBe(6);
  });

  it('a genuine rate change appends a record anchored at TODAY, keeping history', () => {
    const today = I + 5;
    const out = planHistoryWithRate(seeded, 12, today, [], I, b10);
    expect(out).not.toBe(seeded);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(plan(I, 6, 60)); // past record kept, its rate frozen
    const latest = out[out.length - 1];
    expect(latest.fromDayKey).toBe(today);
    expect(latest.rate).toBe(12);
    // Anchored at where the budget actually is today, not the old start budget:
    // the same re-seed budgetSixths reports for `today` under the kept history.
    expect(latest.startBudget).toBe(budgetSixths([], today, I, b10, seeded));
  });

  it('a same-day rate change collapses (last write wins, no pile-up)', () => {
    const today = I + 5;
    const withToday = planHistoryWithRate(seeded, 12, today, [], I, b10); // adds I+5
    expect(withToday).toHaveLength(2);
    // Changing the rate again the same day replaces today's record, not stacks.
    const changed = planHistoryWithRate(withToday, 3, today, [], I, b10);
    expect(changed).toHaveLength(2);
    const latest = changed[changed.length - 1];
    expect(latest.fromDayKey).toBe(today);
    expect(latest.rate).toBe(3);
  });
});
