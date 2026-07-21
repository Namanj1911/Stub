// Post-zero mode: the flip, the relapse, and the consent that gates them.
//
// The module's own header calls the streak "honest by construction" because
// everything is derived from entries and the one stored value is consent
// rather than truth. That is a claim about behaviour, so it gets tested:
// the interesting cases are all "does a stale confirmation survive something
// it shouldn't?".

import { ZERO_DAYS_TO_FLIP, goalMode, smokeFree } from '../postzero';
import { INSTALL_KEY as I, smoke, smokeDaily } from './fixtures';

// A user who smoked on install day and has been clean ever since. `cleanDays`
// counts the whole days after the last cigarette, so today = I + 1 + cleanDays.
function cleanSince(cleanDays: number) {
  return { entries: [smoke(I, 5)], today: I + 1 + cleanDays };
}

describe('smokeFree — streak arithmetic', () => {
  it('counts today in the live streak but not in the days that are lived', () => {
    // The 4am boundary means a clean evening can still end in a cigarette, so
    // today is progress toward the next whole day, never one of them.
    const { entries, today } = cleanSince(3);
    const sf = smokeFree(entries, today, I);
    expect(sf.streakDays).toBe(4); // three whole days + today in progress
    expect(sf.completedZeroDays).toBe(3);
    expect(sf.todayClean).toBe(true);
  });

  it('drops completed days to zero the moment today is no longer clean', () => {
    const { entries, today } = cleanSince(10);
    const sf = smokeFree([...entries, smoke(today, 1)], today, I);
    expect(sf.todayClean).toBe(false);
    expect(sf.streakDays).toBe(0);
    expect(sf.completedZeroDays).toBe(0);
  });

  it('becomes eligible at seven lived days, and counts down to it honestly', () => {
    const { entries, today } = cleanSince(ZERO_DAYS_TO_FLIP - 1);
    const almost = smokeFree(entries, today, I);
    expect(almost.eligible).toBe(false);
    expect(almost.daysToFlip).toBe(1);

    const there = smokeFree(entries, today + 1, I);
    expect(there.eligible).toBe(true);
    expect(there.daysToFlip).toBe(0);
  });

  it('keeps the best run after a relapse (§9.1) while the live one resets', () => {
    const entries = [smoke(I, 5), smoke(I + 21, 1)];
    const sf = smokeFree(entries, I + 24, I);
    expect(sf.bestDays).toBe(20); // I+1 … I+20
    expect(sf.streakDays).toBe(3); // I+22, I+23, and today clean
    expect(sf.runStartDayKey).toBe(I + 22);
  });

  it('reports the last cigarette by timestamp, not by day key', () => {
    const late = smoke(I + 3, 1, 23);
    const early = smoke(I + 3, 1, 9);
    expect(smokeFree([early, late], I + 5, I).lastSmokeAt).toBe(late.timestamp);
  });

  it('has no run at all before anything is logged', () => {
    const sf = smokeFree([], I, I);
    expect(sf.lastSmokeAt).toBeNull();
    expect(sf.runStartDayKey).toBe(I); // today, clean so far
  });
});

describe('smokeFree — consent, not truth', () => {
  it('activates only when the stored day-key names the live run', () => {
    const { entries, today } = cleanSince(ZERO_DAYS_TO_FLIP);
    const sf = smokeFree(entries, today, I);
    expect(sf.runStartDayKey).toBe(I + 1);

    expect(smokeFree(entries, today, I, I + 1).active).toBe(true);
    expect(smokeFree(entries, today, I, I + 2).active).toBe(false); // some other run
    expect(smokeFree(entries, today, I).active).toBe(false); // never asked
  });

  it('falls away on its own when a relapse breaks the confirmed run', () => {
    // The reason confirmedFrom stores a day key rather than a boolean: there
    // is no flag to clear and no path that can leave a stale "you are quit
    // now" behind.
    const entries = [smoke(I, 5)];
    const confirmed = smokeFree(entries, I + 10, I, I + 1);
    expect(confirmed.active).toBe(true);

    const relapsed = [...entries, smoke(I + 11, 1)];
    expect(smokeFree(relapsed, I + 11, I, I + 1).active).toBe(false);
    expect(smokeFree(relapsed, I + 20, I, I + 1).active).toBe(false);
  });

  it('cannot spuriously re-match a later run, because that run would span the relapse', () => {
    // Asserted because the module header claims it as an invariant. A stale
    // consent naming day X can only re-activate if some later run starts on X
    // again — impossible, since the relapse that ended the first run sits
    // between them.
    const entries = [smoke(I, 5), smoke(I + 11, 1)];
    for (let today = I + 12; today <= I + 60; today++) {
      expect(smokeFree(entries, today, I, I + 1).active).toBe(false);
    }
  });

  it('asks again once a new run earns it', () => {
    const entries = [smoke(I, 5), smoke(I + 11, 1)];
    const sf = smokeFree(entries, I + 20, I, I + 1);
    expect(sf.eligible).toBe(true);
    expect(sf.active).toBe(false);
    expect(sf.runStartDayKey).toBe(I + 12);
    expect(smokeFree(entries, I + 20, I, I + 12).active).toBe(true);
  });
});

describe('goalMode', () => {
  const atZero = 0;
  const tapering = 30;

  it('says "arrived" at zero before the days are lived', () => {
    const { entries, today } = cleanSince(2);
    expect(goalMode(atZero, smokeFree(entries, today, I))).toBe('arrived');
  });

  it('offers before it checks the budget — a clean week mid-taper counts', () => {
    // Deliberate ordering: someone still tapering who simply hasn't smoked
    // for a week is a better moment to ask than either the taper card or a
    // silent auto-flip.
    const { entries, today } = cleanSince(ZERO_DAYS_TO_FLIP);
    expect(goalMode(tapering, smokeFree(entries, today, I))).toBe('offer');
  });

  it('reaches postZero only with consent', () => {
    const { entries, today } = cleanSince(ZERO_DAYS_TO_FLIP);
    expect(goalMode(atZero, smokeFree(entries, today, I))).toBe('offer');
    expect(goalMode(atZero, smokeFree(entries, today, I, I + 1))).toBe('postZero');
  });

  it('returns to tapering after a relapse, whatever was confirmed before', () => {
    const entries = [smoke(I, 5), smoke(I + 20, 3)];
    expect(goalMode(tapering, smokeFree(entries, I + 21, I, I + 1))).toBe('tapering');
  });
});

describe('finding #5 — the partial install day is not a lived day', () => {
  // FIXED (fix/postzero-install-day). completedZeroDays now sheds both partial
  // boundary days: today (always) and the install day (when the run reaches
  // back to it), matching the reasoning notificationPlan.countCleanDays already
  // applied by running from installDayKey + 1. This was a characterization test
  // encoding the old off-by-one; its expectations were flipped when the fix
  // landed.
  it('does not offer the flip until seven WHOLE days after install', () => {
    // Someone who installs at 11pm and logs nothing. At today = I+7 the clean
    // day-keys are I … I+7, but I is the partial install day and I+7 is today
    // in progress — so only I+1 … I+6, six whole days, are lived. The offer
    // must wait one more day.
    const early = smokeFree([], I + 7, I);
    expect(early.completedZeroDays).toBe(6);
    expect(early.eligible).toBe(false);

    // One whole day later the seven lived days (I+1 … I+7) are in the bank.
    const there = smokeFree([], I + 8, I);
    expect(there.completedZeroDays).toBe(ZERO_DAYS_TO_FLIP);
    expect(there.eligible).toBe(true);
  });

  it('counts the install day as zero lived days whether or not it had a smoke', () => {
    // The whole point: the install day contributes nothing to the lived count
    // either way, so a user clean since install and a user who smoked once on
    // install day and then stopped reach the same completedZeroDays on the same
    // day. (Removing the install-day adjustment breaks this equality — the
    // never-logged user would over-count by one.)
    const neverLogged = smokeFree([], I + 8, I);
    const smokedOnInstall = smokeFree([smoke(I, 5)], I + 8, I);
    expect(neverLogged.completedZeroDays).toBe(smokedOnInstall.completedZeroDays);
    expect(neverLogged.completedZeroDays).toBe(ZERO_DAYS_TO_FLIP);
  });
});
