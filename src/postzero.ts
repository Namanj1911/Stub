// Post-zero mode (design/HEALTH_TIMELINE.md §10 and §12, build step 4).
//
// At zero the app stops being a taper tracker and becomes a smoke-free
// companion. This module owns exactly one question — "which mode are we in?"
// — and the streak arithmetic behind it. Everything else (Goal's tense, the
// timeline's emphasis) reads the answer and re-renders; no screen decides for
// itself what "at zero" means.
//
// Nothing here is persisted. The mode is derived from `entries` on every
// read, which is what makes a relapse honest by construction: there is no
// stored "you are quit now" flag that could disagree with the logs, and no
// migration to write when the mode flips back and forth.

import { Entry, entriesForDay, totalSixths } from './domain';

// §12, decision 11: the budget reaching zero sets the expectation; living it
// for a week earns the mode. Flipping on the budget alone would declare
// victory on a technicality the user hasn't lived yet.
export const ZERO_DAYS_TO_FLIP = 7;

export type SmokeFree = {
  active: boolean; // post-zero mode is on
  completedZeroDays: number; // whole zero days lived, ending yesterday
  streakDays: number; // the live run, counting today while it stays clean
  bestDays: number; // longest run ever — survives a relapse (§9.1)
  todayClean: boolean; // nothing logged today (yet)
  lastSmokeAt: number | null; // null when nothing has ever been logged
  daysToFlip: number; // whole zero days still owed before the mode flips
};

// KNOWN LIMITATION, needs an owner decision before this ships to real users:
// a post-install day with no entries counts as a zero day. That follows the
// app's existing convention (domain.trailing7Totals: "a clean day is a clean
// day"), and for an engaged user it is correct — but the app cannot tell
// "didn't smoke" from "didn't open the app". So someone who installs, logs
// once and then goes quiet for a week gets flipped into post-zero mode and
// told they're smoke-free, which is a claim we have no evidence for and the
// most trust-damaging thing this screen could get wrong.
//
// Deliberately NOT guarded here, because every cheap fix is a design decision
// rather than a code one (require a confirmation tap on the flip? require any
// app activity in the window? decay the streak after N silent days?). Raised
// in BACKLOG under post-zero; the honest options are written up there.
export function smokeFree(
  entries: Entry[],
  todayKey: number,
  installDayKey: number,
): SmokeFree {
  let run = 0;
  let best = 0;
  for (let k = installDayKey; k <= todayKey; k++) {
    const zero = totalSixths(entriesForDay(entries, k)) === 0;
    run = zero ? run + 1 : 0;
    best = Math.max(best, run);
  }

  const todayClean = totalSixths(entriesForDay(entries, todayKey)) === 0;
  // `run` counts today when today is still clean, but today isn't *lived*
  // yet — the day boundary is 4am, so a clean evening can still end in a
  // cigarette. The flip counts only whole days; today shows as progress
  // toward the next one. This is the §12 "hasn't lived it yet" guard applied
  // at day granularity rather than week.
  const completedZeroDays = todayClean ? Math.max(0, run - 1) : 0;

  const timestamps = entries.map((e) => e.timestamp);
  const lastSmokeAt = timestamps.length ? Math.max(...timestamps) : null;

  return {
    active: completedZeroDays >= ZERO_DAYS_TO_FLIP,
    completedZeroDays,
    streakDays: run,
    bestDays: best,
    todayClean,
    lastSmokeAt,
    daysToFlip: Math.max(0, ZERO_DAYS_TO_FLIP - completedZeroDays),
  };
}

// Goal's three tenses. The middle one matters: a user whose plan has reached
// zero but who hasn't yet lived seven clean days is in a real, common state,
// and telling them "quit in 1 week" (what the rate math says when the budget
// is already 0) would be nonsense. §15's "the date slips and nothing breaks"
// applies to the taper; this is its counterpart at the finish line.
export type GoalMode = 'tapering' | 'arrived' | 'postZero';

export function goalMode(budgetSixths: number, sf: SmokeFree): GoalMode {
  if (sf.active) return 'postZero';
  if (budgetSixths <= 0) return 'arrived';
  return 'tapering';
}
