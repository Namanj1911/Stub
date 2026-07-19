// Post-zero mode (design/HEALTH_TIMELINE.md §10 and §12, build step 4).
//
// At zero the app stops being a taper tracker and becomes a smoke-free
// companion. This module owns exactly one question — "which mode are we in?"
// — and the streak arithmetic behind it. Everything else (Goal's tense, the
// timeline's emphasis) reads the answer and re-renders; no screen decides for
// itself what "at zero" means.
//
// Almost nothing here is persisted. The streak, the run and the relapse are
// all derived from `entries` on every read, which is what makes a relapse
// honest by construction: no stored "you are quit now" flag can disagree with
// the logs. The single stored value (`confirmedFrom`, below) is *consent*, not
// truth — it can gate the mode but never assert it.

import { Entry, entriesForDay, totalSixths } from './domain';

// §12, decision 11: the budget reaching zero sets the expectation; living it
// for a week earns the mode. Flipping on the budget alone would declare
// victory on a technicality the user hasn't lived yet.
export const ZERO_DAYS_TO_FLIP = 7;

export type SmokeFree = {
  active: boolean; // post-zero mode is on — earned AND confirmed
  eligible: boolean; // the days are lived; the offer stands, unconfirmed
  completedZeroDays: number; // whole zero days lived, ending yesterday
  streakDays: number; // the live run, counting today while it stays clean
  runStartDayKey: number | null; // day the live run began; null once broken
  bestDays: number; // longest run ever — survives a relapse (§9.1)
  todayClean: boolean; // nothing logged today (yet)
  lastSmokeAt: number | null; // null when nothing has ever been logged
  daysToFlip: number; // whole zero days still owed before the offer appears
};

// THE SILENT-DAY PROBLEM, and why the mode is confirmed rather than assumed.
//
// A post-install day with no entries counts as a zero day. That follows the
// app's existing convention (domain.trailing7Totals: "a clean day is a clean
// day"), and for an engaged user it is correct — but the app cannot tell
// "didn't smoke" from "didn't open the app". Left to itself, someone who
// installs, logs once and then goes quiet for a week gets flipped into
// post-zero mode and told they're smoke-free: a claim we have no evidence
// for, and the most trust-damaging thing this screen could get wrong.
//
// The fix is not to guess harder. Requiring app activity, or decaying the
// streak after N silent days, both punish the user who genuinely stopped
// smoking and therefore stopped thinking about cigarettes — the success case.
// Instead the app stops asserting and asks: at ZERO_DAYS_TO_FLIP clean days
// the mode is *offered*, and the user confirms it. The claim then belongs to
// the only party with the evidence.
//
// `confirmedFrom` is the day-key the confirmed run began, NOT a boolean. That
// keeps the derived-from-entries honesty intact: a relapse starts a new run
// with a different start day, so the stored consent stops matching and the
// mode falls away on its own. There is no flag to clear, no code path that
// can leave a stale "you are quit now" behind, and a later run asks again.
// (A stale value can never spuriously re-match: any run containing the old
// start day would have to span the relapse that broke it.)
export function smokeFree(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
  confirmedFrom?: number,
): SmokeFree {
  let run = 0;
  let best = 0;
  for (let k = installDayKey; k <= todayKey; k++) {
    const zero = totalSixths(entriesForDay(entries, k)) === 0;
    run = zero ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const runStartDayKey = run > 0 ? todayKey - run + 1 : null;

  const todayClean = totalSixths(entriesForDay(entries, todayKey)) === 0;
  // `run` counts today when today is still clean, but today isn't *lived*
  // yet — the day boundary is 4am, so a clean evening can still end in a
  // cigarette. The flip counts only whole days; today shows as progress
  // toward the next one. This is the §12 "hasn't lived it yet" guard applied
  // at day granularity rather than week.
  const completedZeroDays = todayClean ? Math.max(0, run - 1) : 0;

  const timestamps = entries.map((e) => e.timestamp);
  const lastSmokeAt = timestamps.length ? Math.max(...timestamps) : null;

  const eligible = completedZeroDays >= ZERO_DAYS_TO_FLIP;

  return {
    // The consent must name *this* run. `confirmedFrom == null` is simply an
    // unconfirmed install (no migration: absent means "not yet asked").
    active: eligible && confirmedFrom != null && confirmedFrom === runStartDayKey,
    eligible,
    completedZeroDays,
    streakDays: run,
    runStartDayKey,
    bestDays: best,
    todayClean,
    lastSmokeAt,
    daysToFlip: Math.max(0, ZERO_DAYS_TO_FLIP - completedZeroDays),
  };
}

// Goal's four tenses. The two middle ones matter:
//
// `arrived` — a user whose plan has reached zero but who hasn't yet lived
// seven clean days is in a real, common state, and telling them "quit in 1
// week" (what the rate math says when the budget is already 0) would be
// nonsense. §15's "the date slips and nothing breaks" applies to the taper;
// this is its counterpart at the finish line.
//
// `offer` — the days are lived and the app is asking, not telling (see the
// silent-day note above). Note it is checked BEFORE the budget: a user still
// mid-taper who simply hasn't smoked for a week is eligible too, and asking
// them "ready to call it?" is a better moment than either the taper card or
// the old silent auto-flip.
export type GoalMode = 'tapering' | 'arrived' | 'offer' | 'postZero';

export function goalMode(budgetSixths: number, sf: SmokeFree): GoalMode {
  if (sf.active) return 'postZero';
  if (sf.eligible) return 'offer';
  if (budgetSixths <= 0) return 'arrived';
  return 'tapering';
}
