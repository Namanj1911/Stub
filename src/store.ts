// S22 local-first storage: everything lives on device in AsyncStorage,
// app is fully functional offline. Writes are fire-and-forget so logging
// stays optimistic (<100ms perceived, NFR1).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND_AVERAGES, DATASET_VERSION, findBrand } from './brands';
import {
  BaselineRecord,
  Entry,
  PACE_RATE,
  Pace,
  PlanRecord,
  PriceRecord,
  budgetHoldOnLog,
  budgetSixths,
  dayKey,
  planHistoryWithRate,
  recentDailyAverageSixths,
} from './domain';
// From the pure planning module, not notifications.ts — the store must not
// drag the native notifications module into its import graph.
import {
  DEFAULT_NOTIF_PREFS,
  type AnnouncedMilestone,
  type NotifPrefs,
} from './notificationPlan';

export type Profile = {
  // countPerDay / pricePerStick mirror the last history record (kept in sync
  // by the mutators) so screens can read "current" without a lookup.
  countPerDay: number;
  pace: Pace;
  installDayKey: number;
  brandId?: string; // unset when the brand isn't in the dataset
  customBrandName?: string; // set when the user named an unlisted brand
  pricePerStick: number;
  triggers?: string[];
  baselineHistory: BaselineRecord[]; // ascending fromDayKey, never empty
  priceHistory: PriceRecord[]; // ascending fromTimestamp, never empty
  planHistory: PlanRecord[]; // ascending fromDayKey, never empty
};

export type Craving = {
  id: string;
  timestamp: number;
  outcome: 'survived' | 'smoked';
};

export type AppData = {
  profile: Profile | null;
  entries: Entry[];
  cravings: Craving[];
  priceDatasetVersion?: number;
  // Furthest health milestone the user has actually been shown celebrating
  // (design/HEALTH_TIMELINE.md §9). Everything else about milestones is
  // derived from `entries` — the earned set is just "did the longest gap ever
  // clear this?" — but *whether we've congratulated them yet* is genuinely
  // new state, and it has to survive a relaunch or phase 1 has no celebration
  // beat at all (§9.3: push doesn't exist until the dev build, so an
  // achievement must feel earned when you open the app and find it waiting).
  ackedMilestoneId?: string;
  // Notification category toggles (SPEC S15–S17 AC) and the record of which
  // milestone pushes have been scheduled/delivered. Both absent on older
  // installs; `notifications.ts` supplies defaults rather than a migration,
  // since "unset" and "both on" are the same thing here.
  notifPrefs?: NotifPrefs;
  announcedMilestones?: AnnouncedMilestone[];
  // The day-key of the clean run the user confirmed as "I have quit"
  // (src/postzero.ts). Consent, not truth: the app cannot tell "didn't smoke"
  // from "didn't open the app", so post-zero mode is offered and accepted
  // rather than assumed. Storing the run's start day instead of a boolean is
  // what keeps a relapse honest — the value stops matching the live run by
  // itself. Absent on every install that has never been asked.
  postZeroConfirmedFrom?: number;
  // The budget level (sixths) at which we last showed the "your taper paused"
  // sheet (src/domain.ts budgetHoldOnLog, src/screens/BudgetHoldSheet). Dedup,
  // not truth: the budget only ever descends between re-anchors, so distinct
  // stalls sit at strictly lower levels — storing the level we announced makes
  // the sheet fire once per stall episode rather than on every over-budget log.
  budgetHoldNoticedAt?: number;
  // Transient one-shot signal that a just-logged cigarette held the budget flat
  // (payload for the sheet). Persisted so an optimistic write can't drop it and
  // so it survives the reload after logging; cleared when the sheet is
  // dismissed. Null/absent means nothing to show.
  pendingHoldNotice?: HoldNotice | null;
};

// What the budget-holding sheet needs to render: the level the budget is
// holding at, and the lower level it would have stepped down to but for this
// cigarette (both sixths). Frozen at log time so the copy can't drift.
export type HoldNotice = { budget: number; wouldHaveBeen: number };

const KEY = 'stub/v1';

const EMPTY: AppData = { profile: null, entries: [], cravings: [] };

// Older app versions stored flat countPerDay/pricePerStick; synthesize the
// dated histories so existing installs keep an honest savings history. The
// price seed uses fromTimestamp 0: the first known price applies to the
// whole past (best guess beats ₹0). Pre-price profiles seed from their
// brand's MRP, or the dataset average as a last resort — this retires the
// Money tab's manual price stepper for everyone.
function migrate(parsed: Partial<AppData>): AppData {
  const data = { ...EMPTY, ...parsed };
  const p = data.profile;
  if (!p) return data;

  const profile = { ...p };
  if (!profile.baselineHistory?.length) {
    profile.baselineHistory = [
      { fromDayKey: profile.installDayKey, countPerDay: profile.countPerDay },
    ];
  }
  if (!profile.priceHistory?.length) {
    const brand = findBrand(profile.brandId);
    const price =
      (profile.pricePerStick as number | undefined) ?? brand?.price ?? BRAND_AVERAGES.price;
    profile.priceHistory = [
      { fromTimestamp: 0, pricePerStick: price, brandId: profile.brandId },
    ];
    profile.pricePerStick = price;
  }

  // Seed the taper plan for installs that predate it, from the pace they
  // already chose. Deliberately anchored at TODAY, not install day: the plan
  // caps the budget, so back-dating it would retroactively lower past budgets
  // and silently flip old under-budget verdicts in the streaks and heatmap.
  // Existing history stays exactly as it was scored; the plan takes over from
  // here. Same principle as the price seed leaving old savings alone.
  if (!profile.planHistory?.length) {
    const today = dayKey(Date.now());
    profile.planHistory = [
      {
        fromDayKey: today,
        rate: PACE_RATE[profile.pace],
        startBudget: budgetSixths(
          data.entries,
          today,
          profile.installDayKey,
          profile.baselineHistory,
          [],
        ),
      },
    ];
  }

  // A dataset MRP revision (shipped in an app update) re-prices the user's
  // brand from now — never retroactively. No-op when the price already
  // matches, so an unpersisted migration can't append twice.
  if ((data.priceDatasetVersion ?? 0) < DATASET_VERSION) {
    const brand = findBrand(profile.brandId);
    if (brand && brand.price !== profile.pricePerStick) {
      profile.priceHistory = [
        ...profile.priceHistory,
        { fromTimestamp: Date.now(), pricePerStick: brand.price, brandId: brand.id },
      ];
      profile.pricePerStick = brand.price;
    }
  }

  return { ...data, profile, priceDatasetVersion: DATASET_VERSION };
}

export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setData(migrate(JSON.parse(raw) as Partial<AppData>));
      })
      .catch(() => {}) // corrupt/missing store — start fresh rather than crash
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const completeSetup = useCallback(
    (input: {
      countPerDay: number;
      pace: Pace;
      brandId?: string;
      pricePerStick: number;
      triggers?: string[];
    }) => {
      const installDayKey = dayKey(Date.now());
      update((d) => ({
        ...d,
        priceDatasetVersion: DATASET_VERSION,
        profile: {
          ...input,
          installDayKey,
          baselineHistory: [{ fromDayKey: installDayKey, countPerDay: input.countPerDay }],
          priceHistory: [
            { fromTimestamp: 0, pricePerStick: input.pricePerStick, brandId: input.brandId },
          ],
          // day 1's budget is the stated baseline (S13: the taper starts day 2)
          planHistory: [
            {
              fromDayKey: installDayKey,
              rate: PACE_RATE[input.pace],
              startBudget: input.countPerDay * 6,
            },
          ],
        },
      }));
    },
    [update],
  );

  const addCraving = useCallback(
    (outcome: 'survived' | 'smoked') => {
      const craving: Craving = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        outcome,
      };
      update((d) => ({ ...d, cravings: [...d.cravings, craving] }));
    },
    [update],
  );

  // Baseline edits are effective-dated at day granularity: today forward gets
  // the new number, history keeps its old one. Same-day edits collapse (last
  // write wins), and setting the value back to what was already in effect
  // leaves no record at all.
  const setCountPerDay = useCallback(
    (countPerDay: number) => {
      update((d) => {
        if (!d.profile) return d;
        const today = dayKey(Date.now());
        const history = d.profile.baselineHistory.filter((r) => r.fromDayKey !== today);
        // history is empty when today's record was the seed (install-day edit)
        if (!history.length || history[history.length - 1].countPerDay !== countPerDay) {
          history.push({ fromDayKey: today, countPerDay });
        }
        return { ...d, profile: { ...d.profile, countPerDay, baselineHistory: history } };
      });
    },
    [update],
  );

  // Brand switches re-price from this moment (BACKLOG P1): entries logged
  // before keep the old price. Dithering in the picker doesn't pile up
  // records — a same-day record that no entry was valued against is replaced
  // in place (the seed record is always preserved).
  const switchBrand = useCallback(
    (input: { brandId?: string; customBrandName?: string; pricePerStick: number }) => {
      update((d) => {
        const p = d.profile;
        if (!p) return d;
        if (
          input.brandId === p.brandId &&
          input.customBrandName === p.customBrandName &&
          input.pricePerStick === p.pricePerStick
        ) {
          return d;
        }
        const now = Date.now();
        const record: PriceRecord = {
          fromTimestamp: now,
          pricePerStick: input.pricePerStick,
          brandId: input.brandId,
        };
        const last = p.priceHistory[p.priceHistory.length - 1];
        const lastUnused =
          p.priceHistory.length > 1 &&
          dayKey(last.fromTimestamp) === dayKey(now) &&
          !d.entries.some((e) => e.timestamp >= last.fromTimestamp);
        const priceHistory = lastUnused
          ? [...p.priceHistory.slice(0, -1), record]
          : [...p.priceHistory, record];
        return {
          ...d,
          profile: {
            ...p,
            brandId: input.brandId,
            customBrandName: input.customBrandName,
            pricePerStick: input.pricePerStick,
            priceHistory,
          },
        };
      });
    },
    [update],
  );

  const addEntry = useCallback(
    (sixths: number, timestamp = Date.now(), backfilled = false) => {
      const entry: Entry = {
        id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        sixths,
        timestamp,
        ...(backfilled ? { backfilled: true } : {}),
      };
      update((d) => {
        const entries = [...d.entries, entry];
        // Did this cigarette hold the budget flat that was going to step down?
        // Only for a live "I just smoked" log: a backfill corrects the past and
        // must not pop a "your taper paused" sheet, and the signal is about the
        // day the smoke lands on, so it has to be today. Guard on the profile
        // too — no baseline/plan history means no budget chain to reason about.
        const today = dayKey(Date.now());
        if (d.profile && !backfilled && dayKey(timestamp) === today) {
          const { held, budget, wouldHaveBeen } = budgetHoldOnLog(
            d.entries,
            entries,
            today,
            d.profile.installDayKey,
            d.profile.baselineHistory,
            d.profile.planHistory,
          );
          // Fire once per stall episode: suppress if we already announced a hold
          // at this exact budget level (the level is stable for the whole stall).
          if (held && d.budgetHoldNoticedAt !== budget) {
            return {
              ...d,
              entries,
              budgetHoldNoticedAt: budget,
              pendingHoldNotice: { budget, wouldHaveBeen },
            };
          }
        }
        return { ...d, entries };
      });
    },
    [update],
  );

  const dismissHoldNotice = useCallback(() => {
    update((d) => (d.pendingHoldNotice ? { ...d, pendingHoldNotice: null } : d));
  }, [update]);

  const undoLast = useCallback(() => {
    update((d) => ({ ...d, entries: d.entries.slice(0, -1) }));
  }, [update]);

  const editEntry = useCallback(
    (id: string, sixths: number) => {
      update((d) => ({
        ...d,
        entries: d.entries.map((e) => (e.id === id ? { ...e, sixths } : e)),
      }));
    },
    [update],
  );

  const removeEntry = useCallback(
    (id: string) => {
      update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
    },
    [update],
  );

  // The plan is effective-dated like the baseline: a new rate applies from
  // today forward and past budgets keep the rate they were scored under.
  // Same-day changes collapse (last write wins), so dithering between presets
  // and dates doesn't pile up records. `startBudget` re-anchors to whatever
  // the budget is today, so a reschedule tapers from where the user actually
  // is rather than from an old, higher starting point.
  const setPlanRate = useCallback(
    (rate: number) => {
      update((d) => {
        if (!d.profile) return d;
        const planHistory = planHistoryWithRate(
          d.profile.planHistory,
          rate,
          dayKey(Date.now()),
          d.entries,
          d.profile.installDayKey,
          d.profile.baselineHistory,
        );
        // Same reference means the rate was unchanged — don't re-anchor the plan.
        if (planHistory === d.profile.planHistory) return d;
        return { ...d, profile: { ...d.profile, planHistory } };
      });
    },
    [update],
  );

  // Starts a fresh taper from where the user actually is. This is the only exit
  // from a zero budget, and it is deliberately explicit: the app can see the
  // contradiction (the plan says done, the logs say otherwise) but it does not
  // get to decide that someone has relapsed — same reasoning as the post-zero
  // confirmation tap, where the claim belongs to the party holding the evidence.
  //
  // Anchors on measured recent smoking, not the stale onboarding baseline and
  // not today's budget: the budget is zero (that is the whole problem) and the
  // baseline is a number the user stated months ago, before any of this.
  // Floored at ½ a cigarette so the anchor is never itself another zero.
  // Keeps the current pace — once the budget is off zero the ordinary preset
  // control comes back and can change it.
  const startNewTaper = useCallback(() => {
    update((d) => {
      if (!d.profile) return d;
      const today = dayKey(Date.now());
      const kept = d.profile.planHistory.filter((r) => r.fromDayKey !== today);
      const startBudget = Math.max(
        3,
        recentDailyAverageSixths(d.entries, today, d.profile.installDayKey),
      );
      return {
        ...d,
        profile: {
          ...d.profile,
          planHistory: [...kept, { fromDayKey: today, rate: PACE_RATE[d.profile.pace], startBudget }],
        },
      };
    });
  }, [update]);

  // Pace presets are one of the two doors onto the same value (§11.2): the
  // label is kept for display, the rate is what the math reads.
  const setPace = useCallback(
    (pace: Pace) => {
      update((d) => (d.profile ? { ...d, profile: { ...d.profile, pace } } : d));
      setPlanRate(PACE_RATE[pace]);
    },
    [update, setPlanRate],
  );

  // Records that the user has seen the celebration for a milestone, so it
  // fires once and then settles into earned state. Only ever moves forward:
  // the earned set is derived from longest-gap-ever, which never shrinks
  // (§9.1), so there is nothing to un-acknowledge.
  const ackMilestone = useCallback(
    (id: string) => {
      update((d) => (d.ackedMilestoneId === id ? d : { ...d, ackedMilestoneId: id }));
    },
    [update],
  );

  // The user accepting the post-zero offer for a specific clean run. Unlike
  // `ackMilestone` this is not monotonic: a relapse invalidates it by making
  // the stored day stop matching the live run, and a later run gets asked
  // again. There is deliberately no "decline" — the offer just keeps standing,
  // so a "no" is a state we never have to store or later un-store.
  const confirmPostZero = useCallback(
    (runStartDayKey: number) => {
      update((d) =>
        d.postZeroConfirmedFrom === runStartDayKey
          ? d
          : { ...d, postZeroConfirmedFrom: runStartDayKey },
      );
    },
    [update],
  );

  // Notification category toggles. Turning one off doesn't cancel anything
  // here — the next reconcile re-plans from these prefs and cancels what no
  // longer belongs, which keeps one code path responsible for the schedule.
  const setNotifPref = useCallback(
    (key: keyof NotifPrefs, on: boolean) => {
      update((d) => ({
        ...d,
        notifPrefs: { ...(d.notifPrefs ?? DEFAULT_NOTIF_PREFS), [key]: on },
      }));
    },
    [update],
  );

  const setAnnouncedMilestones = useCallback(
    (announcedMilestones: AnnouncedMilestone[]) => {
      update((d) => ({ ...d, announcedMilestones }));
    },
    [update],
  );

  // The one thing we can't undo — wipes storage and returns to onboarding.
  const resetAll = useCallback(() => {
    AsyncStorage.removeItem(KEY).catch(() => {});
    setData(EMPTY);
  }, []);

  return {
    data,
    loaded,
    completeSetup,
    addEntry,
    dismissHoldNotice,
    undoLast,
    editEntry,
    removeEntry,
    addCraving,
    setCountPerDay,
    switchBrand,
    setPace,
    setPlanRate,
    startNewTaper,
    ackMilestone,
    confirmPostZero,
    setNotifPref,
    setAnnouncedMilestones,
    resetAll,
  };
}
