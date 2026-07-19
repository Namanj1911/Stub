// Notification *planning* — S15 budget nudge, S17 milestones and the
// milestone roasts. Pure: no expo, no IO, no clock of its own.
//
// Split out from notifications.ts on purpose. The interesting decisions in
// this feature are all "would this fire, and would it still be true when it
// lands?", and those are date-and-threshold questions that deserve to be
// answerable without a device, a granted permission, or waiting until 9pm.
// Keeping expo-notifications out of this file is what makes that possible —
// it also keeps the native module out of store.ts's import graph, which
// imports the prefs type from here.
//
// THE CONSTRAINT THAT SHAPES EVERYTHING HERE: the OS fires local
// notifications while our JS is dead. There is no callback at delivery time,
// no "should this still be true?" check. Whatever we schedule *will* land,
// verbatim, even if the user smokes twenty cigarettes in between. So the rule
// is: never schedule a claim we can't stand behind, and let notifications.ts
// re-derive the whole schedule from the store on every change.

import { budgetSixths, dayKey, entriesForDay, totalSixths } from './domain';
import { underBudgetCount, underBudgetStreaks } from './stats';
import { budgetNudgeCopy, milestonePushCopy } from './strings';
import type { AppData } from './store';

// ---------------------------------------------------------------------------
// Preferences + persisted state
// ---------------------------------------------------------------------------

// SPEC S15–S17 AC: "user can toggle each category". Two categories, not
// three — S16 (craving-window alerts) is deliberately not in this round.
export type NotifPrefs = { budget: boolean; milestones: boolean };

// On by default. The OS permission prompt is the real gate, and we don't ask
// for it until we actually have something to say (see ensurePermission), so
// defaulting these on costs the user nothing until they've earned a push.
export const DEFAULT_NOTIF_PREFS: NotifPrefs = { budget: true, milestones: true };

// A milestone push that has been scheduled. `fireAt` in the past means it has
// been delivered, which makes the record permanent — that's how a
// once-ever milestone stays once-ever across relaunches. A record with
// `fireAt` in the future is still pending and may yet be cancelled.
export type AnnouncedMilestone = { id: string; fireAt: number };

// ---------------------------------------------------------------------------
// Timing rules
// ---------------------------------------------------------------------------

const NUDGE_THRESHOLD = 0.8; // S15: "push at 80% of daily budget consumed"
const NUDGE_DELAY_MS = 45 * 60_000;
const MILESTONE_HOUR = 9;

// Quiet hours (SPEC AC: "respects OS quiet hours"). iOS Focus/Do Not Disturb
// handles the OS half on its own; this is our half — we never *schedule* into
// the night in the first place, so a user without Focus configured still
// doesn't get roasted at 2am.
const QUIET_START = 22;
const QUIET_END = 9;

// Day-verdict milestones may only be scheduled from a reconcile this late in
// the day. Two reasons, and the second is the important one:
//
// 1. At 8am, "today is under budget" is trivially true and means nothing.
// 2. src/postzero.ts documents the app's sharpest known limitation: it cannot
//    tell "didn't smoke" from "didn't open the app". Pushing "a smoke-free
//    day!" to someone who simply stopped using the app is exactly the
//    trust-damaging claim that comment warns about. Requiring the app to have
//    been open in the *evening* of the day being judged is the cheapest real
//    evidence of engagement we have. It doesn't fully close the hole (they
//    could open the app at 8pm and smoke at 11pm without logging), but it
//    turns "never opened the app" from a false positive into a silence.
const EVENING_HOUR = 20;

// Streak lengths worth interrupting someone for. SPEC S17 says "each week
// completed on plan"; unbounded weekly pushes are the badge spam the backlog
// explicitly rules out, so it's these four and then the app shuts up.
const STREAK_THRESHOLDS = [3, 7, 14, 30];

export type PlannedNotification = {
  id: string;
  fireAt: number;
  title: string;
  body: string;
  screen: 'Log' | 'Stats' | 'Goal';
  milestone: boolean;
};

function hourOf(timestamp: number): number {
  return new Date(timestamp).getHours();
}

function inQuietHours(timestamp: number): boolean {
  const h = hourOf(timestamp);
  return h >= QUIET_START || h < QUIET_END;
}

// Tomorrow morning by the wall clock — deliberately not `dayKey + 1`, which
// is a 4am-shifted construct. A push lands on a human at a human hour.
function nextMorning(now: number): number {
  const d = new Date(now);
  d.setHours(MILESTONE_HOUR, 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// ---------------------------------------------------------------------------
// Planning — pure. No expo, no IO, no clock of its own.
// ---------------------------------------------------------------------------
//
// Kept pure and exported so the interesting decisions ("would this fire?")
// can be reasoned about and tested without a device, a permission grant, or
// waiting until 9pm.
export function planNotifications(data: AppData, now: number): PlannedNotification[] {
  const p = data.profile;
  if (!p) return [];

  const prefs = data.notifPrefs ?? DEFAULT_NOTIF_PREFS;
  const todayKey = dayKey(now);
  const budget = budgetSixths(
    data.entries,
    todayKey,
    p.installDayKey,
    p.baselineHistory,
    p.planHistory,
  );
  const spent = totalSixths(entriesForDay(data.entries, todayKey));

  const out: PlannedNotification[] = [];
  if (prefs.budget) {
    const nudge = planNudge(data, now, todayKey, budget, spent);
    if (nudge) out.push(nudge);
  }
  if (prefs.milestones) {
    out.push(...planMilestones(data, now, todayKey, budget, spent));
  }
  return out;
}

function planNudge(
  data: AppData,
  now: number,
  todayKey: number,
  budget: number,
  spent: number,
): PlannedNotification | null {
  if (budget <= 0) return null; // post-zero: no budget to be 80% of
  if (spent >= budget) return null; // already spent — the log toast said its piece
  if (spent < budget * NUDGE_THRESHOLD) return null;

  // Anchor on the entry that crossed 80%, so this is a pure function of the
  // data. Anchoring on `now` would push the nudge 45 minutes further out
  // every time the app reopened, and it would never arrive.
  const day = entriesForDay(data.entries, todayKey).sort((a, b) => a.timestamp - b.timestamp);
  let run = 0;
  let crossing: number | null = null;
  for (const e of day) {
    run += e.sixths;
    if (run >= budget * NUDGE_THRESHOLD) {
      crossing = e.timestamp;
      break;
    }
  }
  if (crossing == null) return null;

  const fireAt = crossing + NUDGE_DELAY_MS;
  if (fireAt <= now) return null; // the moment has passed; a late nudge is noise
  if (inQuietHours(fireAt)) return null; // would be stale by morning anyway
  if (dayKey(fireAt) !== todayKey) return null; // never nudge about a closed day

  return {
    id: `nudge-${todayKey}`,
    fireAt,
    ...budgetNudgeCopy(budget - spent, fireAt),
    screen: 'Log',
    milestone: false,
  };
}

function planMilestones(
  data: AppData,
  now: number,
  todayKey: number,
  budget: number,
  spent: number,
): PlannedNotification[] {
  const p = data.profile;
  if (!p) return [];

  const out: PlannedNotification[] = [];
  const announced = new Map((data.announcedMilestones ?? []).map((a) => [a.id, a]));

  const add = (id: string, screen: PlannedNotification['screen']) => {
    const prior = announced.get(id);
    if (prior && prior.fireAt <= now) return; // already delivered; once means once
    const copy = milestonePushCopy(id);
    if (!copy) return;
    // Reuse a pending record's fire time so a reconcile at 9:30pm doesn't
    // shunt an already-scheduled 9am push to the morning after.
    out.push({ id, fireAt: prior?.fireAt ?? nextMorning(now), ...copy, screen, milestone: true });
  };

  // Quit day is a fact about the plan, not a verdict on today's logging, so
  // it skips the evening gate below.
  if (budget <= 0) add('quit-day', 'Goal');

  const h = hourOf(now);
  const isEvening = h >= EVENING_HOUR || h < 4; // 8pm → the 4am day boundary
  if (!isEvening) return out;

  // Install day is a partial day with a baseline-sized budget — being "under
  // budget" on it is an artifact of when the user happened to tap install.
  if (todayKey <= p.installDayKey) return out;
  if (spent > budget) return out;

  const historyDays = todayKey - p.installDayKey + 1;
  const everUnder = underBudgetCount(
    data.entries,
    todayKey,
    p.installDayKey,
    p.baselineHistory,
    p.planHistory,
    historyDays,
  ).under;
  if (everUnder === 1) add('first-under-budget', 'Stats');

  if (spent === 0 && countCleanDays(data, todayKey, p.installDayKey) === 1) {
    add('first-clean-day', 'Stats');
  }

  const { current } = underBudgetStreaks(
    data.entries,
    todayKey,
    p.installDayKey,
    p.baselineHistory,
    p.planHistory,
  );
  if (STREAK_THRESHOLDS.includes(current)) add(`streak-${current}`, 'Stats');

  return out;
}

// Zero-logged days since install. The install day itself is excluded: the
// user installs mid-day, so a "clean" install day usually means "installed at
// 11pm", not "smoked nothing".
function countCleanDays(data: AppData, todayKey: number, installDayKey: number): number {
  let clean = 0;
  for (let k = installDayKey + 1; k <= todayKey; k++) {
    if (totalSixths(entriesForDay(data.entries, k)) === 0) clean += 1;
  }
  return clean;
}

