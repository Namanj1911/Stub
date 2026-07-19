// Local scheduled notifications — delivery half (S15 budget nudge, S17
// milestones, milestone roasts). What to send and when lives next door in
// notificationPlan.ts; this file is the part that talks to the OS.
//
// `reconcile()` cancels every scheduled notification and rebuilds the whole
// schedule from the store. It is idempotent, and running it more often is
// always safe — which is why it hangs off the store's data object rather than
// being called from individual actions. There is no code path to forget,
// because every path ends in a store write.
//
// That matters more than it sounds: the OS fires these while our JS is dead,
// so a scheduled claim can never be re-checked at delivery time. Cancelling
// eagerly on every change is the only mechanism we have for un-saying
// something that stopped being true.
//
// Everything here is local. No server, no push token, so it works in Expo Go
// for prototyping (SDK 54 removed *remote* push from Expo Go on Android;
// local scheduling is untouched) — design/GO_LIVE.md §7.3.

import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import {
  planNotifications,
  type AnnouncedMilestone,
  type PlannedNotification,
} from './notificationPlan';
import { budgetNudgeCopy, milestonePushCopy } from './strings';
import type { AppData } from './store';

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

// Banners while the app is foregrounded: a nudge scheduled 45 minutes ago can
// legitimately land while the user is staring at the Log screen, and silently
// swallowing it would make the feature look broken during testing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelReady = false;

async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Nudges and milestones',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
  channelReady = true;
}

// Ask only when we have something to send. A permission prompt on first
// launch, before the app has demonstrated it has anything worth saying, is
// the single easiest way to get permanently denied — and on iOS "denied" is
// forever, since canAskAgain goes false after one refusal.
async function ensurePermission(wantsToSchedule: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!wantsToSchedule || !current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.status === 'granted';
}

// One reconcile at a time. Store writes can land in bursts (logging fires
// several in a row), and two interleaved cancel-then-schedule passes would
// happily cancel each other's work.
let running: Promise<unknown> = Promise.resolve();
let lastSignature: string | null = null;

// Dev previews are scheduled seconds out, and the first thing a tester does
// is background the app to watch the lock screen — which fires a foreground
// reconcile whose cancelAll would eat the preview before it ever lands.
// Reconcile stands down briefly after a preview.
let previewUntil = 0;

function signature(planned: PlannedNotification[]): string {
  return JSON.stringify(planned.map((n) => [n.id, n.fireAt, n.title, n.body]));
}

// Returns the milestone bookkeeping to persist, or null when nothing changed.
export async function reconcile(
  data: AppData,
  now = Date.now(),
): Promise<AnnouncedMilestone[] | null> {
  if (!supported) return null;
  if (now < previewUntil) return null;

  const planned = planNotifications(data, now);
  const sig = signature(planned);
  if (sig === lastSignature) return null;

  const granted = await ensurePermission(planned.length > 0);
  if (!granted) {
    // Nothing of ours can be pending if we were never granted, but a
    // revoked permission mid-life leaves orphans. Cheap to be sure.
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    lastSignature = sig;
    return null;
  }

  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of planned) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: n.title,
        body: n.body,
        data: { screen: n.screen, id: n.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(n.fireAt),
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
    });
  }
  lastSignature = sig;

  // Delivered records are permanent (that's what makes "first ever" hold).
  // Pending records that are no longer planned get dropped, so a broken
  // streak can legitimately re-earn its push later.
  const prior = data.announcedMilestones ?? [];
  const delivered = prior.filter((a) => a.fireAt <= now);
  const pending = planned.filter((n) => n.milestone).map((n) => ({ id: n.id, fireAt: n.fireAt }));
  const next = [...delivered.filter((d) => !pending.some((x) => x.id === d.id)), ...pending];

  const changed = JSON.stringify(next) !== JSON.stringify(prior);
  return changed ? next : null;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

// Reconcile on every store change and on every return to foreground. The
// foreground pass matters for bookkeeping as much as scheduling: a push
// delivered while the app was closed only becomes "delivered" in our records
// when we next look at the clock.
export function useNotificationSync(
  data: AppData,
  setAnnounced: (list: AnnouncedMilestone[]) => void,
) {
  const save = useRef(setAnnounced);
  save.current = setAnnounced;
  const latest = useRef(data);
  latest.current = data;

  const run = useRef(() => {
    running = running
      .then(() => reconcile(latest.current))
      .then((next) => {
        if (next) save.current(next);
      })
      .catch(() => {}); // a denied/unavailable notification stack must never break the app
  });

  useEffect(() => {
    run.current();
  }, [data]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      lastSignature = null; // time has passed; re-evaluate from scratch
      run.current();
    });
    return () => sub.remove();
  }, []);
}

// Dev-only. The real triggers are a 45-minute wait and 9am tomorrow, so
// without this there is no way to see a notification actually arrive inside a
// testing session — and design/GO_LIVE.md's splash post-mortem is explicit
// that config-level checks are not verification. Fires one of each category
// 10 seconds out, using the real copy generators, so what lands on the lock
// screen is exactly what a real nudge would look like.
//
// __DEV__ is false in any release build, so this cannot ship.
export async function sendPreviewNotifications(): Promise<boolean> {
  if (!__DEV__ || !supported) return false;
  if (!(await ensurePermission(true))) return false;
  await ensureChannel();
  previewUntil = Date.now() + 45_000;
  lastSignature = null; // the real schedule gets rebuilt once the window closes

  const samples = [
    { ...budgetNudgeCopy(9, Date.now()), screen: 'Log' },
    { ...(milestonePushCopy('first-clean-day') ?? { title: '', body: '' }), screen: 'Stats' },
  ];
  for (let i = 0; i < samples.length; i++) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: samples[i].title,
        body: samples[i].body,
        data: { screen: samples[i].screen, id: 'preview' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10 + i * 5,
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
    });
  }
  return true;
}

// Tap handling. The response can arrive before navigation is ready (a cold
// launch from a notification), so the caller passes a "go here when you can"
// callback rather than a navigate() we'd have to time correctly.
export function useNotificationTaps(go: (screen: string) => void) {
  const target = useRef(go);
  target.current = go;

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (typeof screen === 'string') target.current(screen);
    });
    return () => sub.remove();
  }, []);
}
