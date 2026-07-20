// Shared fixture builders for the domain suite.
//
// Everything here exists to make a test read as a *scenario* ("installed on
// day I smoking 10 a day, relapsed on day I+30") rather than as a wall of
// epoch milliseconds. The day-key arithmetic is the fiddly part and it is
// solved once, here.

import type { BaselineRecord, Entry, PlanRecord, PriceRecord } from '../domain';
import { dayKey } from '../domain';
// Type-only: store.ts imports AsyncStorage and react at module scope, and
// these erase at compile time so the suite never loads either.
import type { AppData, Profile } from '../store';

// The first instant belonging to a day key.
//
// Inverts domain.dayKey(): that function shifts by 4 hours and then by the
// zone offset, so a key's first instant is `key` whole days from the epoch,
// plus 4 hours, minus the offset. Derived from getTimezoneOffset() rather than
// hardcoding +5:30 so this stays correct if jest.config.js ever repins the
// zone — but note it assumes a zone without DST, which is why the config picks
// one. `atLocalHour` round-trips through dayKey in fixtures.test.ts, so a
// broken assumption fails loudly and in one place instead of skewing every
// scenario by a day.
export function startOfDayKey(key: number): number {
  const offsetMinutes = new Date(key * 86_400_000).getTimezoneOffset();
  return key * 86_400_000 + 4 * 3_600_000 + offsetMinutes * 60_000;
}

// A timestamp inside `key` at a given local hour. Hours run 4..27, matching
// the 4am day boundary: hour 25 is 1am the following calendar morning, which
// still belongs to `key`.
export function atLocalHour(key: number, hour: number, minute = 0): number {
  if (hour < 4 || hour >= 28) throw new Error(`hour ${hour} is outside day-key ${key} (4..27)`);
  return startOfDayKey(key) + (hour - 4) * 3_600_000 + minute * 60_000;
}

// A fixed day key to anchor scenarios on, so no test depends on the real
// clock. 20600 is in early 2026 — recent enough that dates read sensibly in a
// failure message, fixed enough that the suite means the same thing next year.
export const INSTALL_KEY = 20_600;

let entrySeq = 0;

// `cigarettes` is in whole cigarettes for readability; entries are stored in
// sixths (NFR2). Fractional amounts are expressible: smoke(k, 0.5) is ½.
export function smoke(key: number, cigarettes: number, hour = 12): Entry {
  return {
    id: `e${entrySeq++}`,
    sixths: Math.round(cigarettes * 6),
    timestamp: atLocalHour(key, hour),
  };
}

// A run of days each smoking the same amount, from `fromKey` for `days` days.
export function smokeDaily(fromKey: number, days: number, cigarettes: number, hour = 12): Entry[] {
  const out: Entry[] = [];
  for (let k = fromKey; k < fromKey + days; k++) out.push(smoke(k, cigarettes, hour));
  return out;
}

export function baseline(countPerDay: number, fromDayKey = INSTALL_KEY): BaselineRecord {
  return { fromDayKey, countPerDay };
}

// `startBudget` in sixths, matching PlanRecord.
export function plan(fromDayKey: number, rate: number, startBudget: number): PlanRecord {
  return { fromDayKey, rate, startBudget };
}

const PRICE: PriceRecord[] = [{ fromTimestamp: 0, pricePerStick: 20 }];

// A complete AppData for the notification planner, which needs a whole store
// object rather than loose arguments.
export function appData(opts: {
  entries?: Entry[];
  baselineHistory?: BaselineRecord[];
  planHistory?: PlanRecord[];
  installDayKey?: number;
  announcedMilestones?: AppData['announcedMilestones'];
  notifPrefs?: AppData['notifPrefs'];
}): AppData {
  const installDayKey = opts.installDayKey ?? INSTALL_KEY;
  const profile: Profile = {
    countPerDay: 10,
    pace: 'steady',
    pricePerStick: 20,
    installDayKey,
    baselineHistory: opts.baselineHistory ?? [baseline(10, installDayKey)],
    priceHistory: PRICE,
    planHistory: opts.planHistory ?? [],
  };
  return {
    profile,
    entries: opts.entries ?? [],
    cravings: [],
    announcedMilestones: opts.announcedMilestones,
    notifPrefs: opts.notifPrefs,
  };
}

// Re-exported so scenarios can assert against the same day-key function the
// app uses, rather than a test-local copy of the rule.
export { dayKey };
