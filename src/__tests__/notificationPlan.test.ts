// Notification planning: "would this fire, and would it still be true when it
// lands?"
//
// The module's header explains why it was split out — the OS fires these while
// our JS is dead, so whatever is scheduled *will* land verbatim, and every
// interesting decision is a date-and-threshold question that should be
// answerable without a device, a permission grant, or waiting until 9pm.
// This file is what that sentence was promising.

import type { PlannedNotification } from '../notificationPlan';
import { planNotifications } from '../notificationPlan';
import { INSTALL_KEY as I, appData, atLocalHour, plan, smoke, smokeDaily } from './fixtures';

const ids = (out: PlannedNotification[]) => out.map((n) => n.id).sort();
const find = (out: PlannedNotification[], id: string) => out.find((n) => n.id === id);

// Day I+1's budget is 54 sixths (9 cigarettes) — see domain.test.ts. 80% of
// that is 43.2, so the nudge threshold is crossed at 44 sixths.
const DAY = I + 1;
const installDaySmoke = smoke(I, 10, 12);

// Crosses 80% on the second entry: 42 sixths is under 43.2, 48 is over.
function crossingAt(hour: number) {
  return [installDaySmoke, smoke(DAY, 7, hour - 1), smoke(DAY, 1, hour)];
}

describe('budget nudge — timing', () => {
  it('fires 45 minutes after the cigarette that crossed 80%', () => {
    const data = appData({ entries: crossingAt(15) });
    const out = planNotifications(data, atLocalHour(DAY, 15, 10));
    const nudge = find(out, `nudge-${DAY}`);
    expect(nudge).toBeDefined();
    expect(nudge!.fireAt).toBe(atLocalHour(DAY, 15, 45));
    expect(nudge!.screen).toBe('Log');
    expect(nudge!.milestone).toBe(false);
  });

  it('anchors on the data, not on now — so reopening the app cannot push it away', () => {
    // The bug this guards: anchoring on `now` moved the nudge 45 minutes
    // further out every time the app was foregrounded, so it never arrived.
    const data = appData({ entries: crossingAt(15) });
    const early = planNotifications(data, atLocalHour(DAY, 15, 1));
    const late = planNotifications(data, atLocalHour(DAY, 15, 44));
    expect(find(early, `nudge-${DAY}`)!.fireAt).toBe(find(late, `nudge-${DAY}`)!.fireAt);
  });

  it('drops it once the moment has passed — a late nudge is noise', () => {
    const data = appData({ entries: crossingAt(15) });
    expect(find(planNotifications(data, atLocalHour(DAY, 15, 46)), `nudge-${DAY}`)).toBeUndefined();
  });

  it('never schedules into the night', () => {
    // Quiet hours are 22:00–09:00, and we decline to schedule rather than
    // relying on the user having Focus configured. A crossing at 21:30 would
    // land at 22:15 and be stale by morning anyway.
    const quiet = appData({ entries: [installDaySmoke, smoke(DAY, 7, 20), smoke(DAY, 1, 21)] });
    // 21:00 crossing → 21:45, still allowed.
    expect(find(planNotifications(quiet, atLocalHour(DAY, 21, 5)), `nudge-${DAY}`)).toBeDefined();

    const tooLate = appData({ entries: [installDaySmoke, smoke(DAY, 7, 21), smoke(DAY, 1, 22)] });
    // 22:00 crossing → 22:45, inside quiet hours.
    expect(find(planNotifications(tooLate, atLocalHour(DAY, 22, 5)), `nudge-${DAY}`)).toBeUndefined();
  });

  it('never nudges about a day that has already closed', () => {
    // A 3am crossing would fire at 3:45, and the 4am boundary means the
    // following key. Belt and braces: quiet hours (22:00–09:00) already span
    // the 4am rollover, so the explicit day-key guard in planNudge cannot be
    // the sole reason this returns null. Both gates agree, which is the point.
    const data = appData({ entries: [installDaySmoke, smoke(DAY, 7, 26), smoke(DAY, 1, 27)] });
    expect(find(planNotifications(data, atLocalHour(DAY, 27, 5)), `nudge-${DAY}`)).toBeUndefined();
  });
});

describe('budget nudge — thresholds', () => {
  it('stays quiet below 80% of the budget', () => {
    // 7 cigarettes = 42 sixths, just under the 43.2 threshold.
    const data = appData({ entries: [installDaySmoke, smoke(DAY, 7, 15)] });
    expect(find(planNotifications(data, atLocalHour(DAY, 15, 10)), `nudge-${DAY}`)).toBeUndefined();
  });

  it('stays quiet once the budget is spent — the log toast has said its piece', () => {
    const data = appData({ entries: [installDaySmoke, smoke(DAY, 9, 15)] });
    expect(find(planNotifications(data, atLocalHour(DAY, 15, 10)), `nudge-${DAY}`)).toBeUndefined();
  });

  it('stays quiet at a zero budget — there is no 80% of nothing', () => {
    const data = appData({
      entries: [installDaySmoke, smoke(DAY, 3, 15)],
      planHistory: [plan(I, 6, 0)],
    });
    expect(find(planNotifications(data, atLocalHour(DAY, 15, 10)), `nudge-${DAY}`)).toBeUndefined();
  });

  it('respects the category toggle', () => {
    const data = appData({ entries: crossingAt(15), notifPrefs: { budget: false, milestones: true } });
    expect(find(planNotifications(data, atLocalHour(DAY, 15, 10)), `nudge-${DAY}`)).toBeUndefined();
  });

  it('says how much is left, not how much was smoked', () => {
    // Budget 54, spent 48 → 6 sixths = one whole cigarette left.
    const data = appData({ entries: crossingAt(15) });
    const nudge = find(planNotifications(data, atLocalHour(DAY, 15, 10)), `nudge-${DAY}`)!;
    expect(nudge.title).toBe('Budget check');
    expect(nudge.body).toContain('1 cigarette');
  });
});

describe('milestones — the evening gate', () => {
  // Install day over budget (15 smoked against a 60 baseline) so the first
  // under-budget day is a real event rather than an artifact of install day.
  const heavyInstall = smoke(I, 15, 12);

  it('holds day verdicts until 8pm — "under budget" at 8am means nothing', () => {
    const data = appData({ entries: [heavyInstall] });
    expect(ids(planNotifications(data, atLocalHour(I + 1, 10)))).toEqual([]);
  });

  it('releases them in the evening', () => {
    const data = appData({ entries: [heavyInstall] });
    const out = ids(planNotifications(data, atLocalHour(I + 1, 21)));
    expect(out).toEqual(['first-clean-day', 'first-under-budget']);
  });

  it('treats the small hours as still that evening', () => {
    // The gate is h >= 20 || h < 4, matching the 4am day boundary.
    const data = appData({ entries: [heavyInstall] });
    expect(ids(planNotifications(data, atLocalHour(I + 1, 26)))).toEqual([
      'first-clean-day',
      'first-under-budget',
    ]);
  });

  it('never judges install day itself', () => {
    // A partial day with a baseline-sized budget: being "under" on it is an
    // artifact of when the user happened to tap install.
    const data = appData({ entries: [] });
    expect(ids(planNotifications(data, atLocalHour(I, 21)))).toEqual([]);
  });

  it('stays silent on a day that went over budget', () => {
    const data = appData({ entries: [heavyInstall, smoke(I + 1, 20, 18)] });
    expect(ids(planNotifications(data, atLocalHour(I + 1, 21)))).toEqual([]);
  });

  it('fires a streak milestone only at the listed lengths', () => {
    const entries = [heavyInstall, ...smokeDaily(I + 1, 4, 1, 12)];
    const at = (day: number) => ids(planNotifications(appData({ entries }), atLocalHour(day, 21)));
    expect(at(I + 3)).toContain('streak-3'); // I+1, I+2, I+3
    expect(at(I + 4)).not.toContain('streak-4'); // 4 is not a threshold
  });
});

describe('milestones — quit day', () => {
  const zeroPlan = [plan(I, 6, 0)];

  it('is a fact about the plan, so it skips the evening gate', () => {
    const data = appData({ entries: [smoke(I, 10, 12)], planHistory: zeroPlan });
    const out = planNotifications(data, atLocalHour(I + 3, 11));
    expect(find(out, 'quit-day')).toBeDefined();
    expect(find(out, 'quit-day')!.screen).toBe('Goal');
  });

  it('lands at 9am, the morning after it is planned', () => {
    const data = appData({ entries: [smoke(I, 10, 12)], planHistory: zeroPlan });
    const out = planNotifications(data, atLocalHour(I + 3, 11));
    const fireAt = new Date(find(out, 'quit-day')!.fireAt);
    expect(fireAt.getHours()).toBe(9);
    expect(fireAt.getTime()).toBeGreaterThan(atLocalHour(I + 3, 11));
  });
});

describe('milestones — once means once', () => {
  const zeroPlan = [plan(I, 6, 0)];
  const entries = [smoke(I, 10, 12)];

  it('does not re-plan one that has already been delivered', () => {
    const now = atLocalHour(I + 3, 11);
    const data = appData({
      entries,
      planHistory: zeroPlan,
      announcedMilestones: [{ id: 'quit-day', fireAt: now - 60_000 }],
    });
    expect(find(planNotifications(data, now), 'quit-day')).toBeUndefined();
  });

  it('reuses a pending fire time instead of shunting it to the next morning', () => {
    // A reconcile at 9:30pm must not push an already-scheduled 9am push out by
    // a day. It also keeps the copy seed stable, since the seed carries fireAt.
    const pending = atLocalHour(I + 4, 9);
    const data = appData({
      entries,
      planHistory: zeroPlan,
      announcedMilestones: [{ id: 'quit-day', fireAt: pending }],
    });
    expect(find(planNotifications(data, atLocalHour(I + 3, 21, 30)), 'quit-day')!.fireAt).toBe(
      pending,
    );
  });

  it('respects the category toggle', () => {
    const data = appData({
      entries,
      planHistory: zeroPlan,
      notifPrefs: { budget: true, milestones: false },
    });
    expect(ids(planNotifications(data, atLocalHour(I + 3, 21)))).toEqual([]);
  });
});

describe('planning is a pure function of the store', () => {
  it('plans nothing without a profile', () => {
    const data = { ...appData({}), profile: null };
    expect(planNotifications(data, atLocalHour(I + 1, 21))).toEqual([]);
  });

  it('returns an identical plan for an identical store and clock', () => {
    // What reconcile()'s change-detection depends on: the signature covers
    // title and body, so any per-call variation defeats it. This is the
    // regression that fix/notification-signature closed.
    const data = appData({ entries: crossingAt(15), planHistory: [plan(I, 6, 60)] });
    const now = atLocalHour(DAY, 15, 10);
    const first = JSON.stringify(planNotifications(data, now));
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(planNotifications(data, now))).toBe(first);
    }
  });

  it('keeps a pending notification word-for-word as the clock advances', () => {
    // A push already sitting in the OS queue must not rewrite its own wording
    // on every log. Same data, same fire time, later `now`.
    const data = appData({ entries: crossingAt(15) });
    const base = find(planNotifications(data, atLocalHour(DAY, 15, 1)), `nudge-${DAY}`)!;
    for (let m = 2; m < 45; m++) {
      const later = find(planNotifications(data, atLocalHour(DAY, 15, m)), `nudge-${DAY}`)!;
      expect(later.body).toBe(base.body);
      expect(later.fireAt).toBe(base.fireAt);
    }
  });
});
