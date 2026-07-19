// Health-recovery timeline (design/HEALTH_TIMELINE.md, build step 3).
//
// The model, in one line: the always-growing number is *exposure avoided*,
// not *healing achieved*. Published recovery timelines key off time since the
// last cigarette, which in a reduction app resets every ~90 waking minutes
// (§2). So this module computes three different things, each honest about
// what it can claim:
//
//   §4.1 a short clock that resets, anchored by a longest-gap-ever that never does
//   §4.2 cumulative exposure avoided — pure arithmetic on the user's own logs
//   §4.3 the abstinence milestones, locked, with the plan's quit date on them
//
// What never resets (§9.1): longest-gap-ever and the cumulative totals. Those
// are statements about days that already happened; zeroing them to punish a
// slip would be the app falsifying history to make a point, and it breaks the
// same honesty rule that governs Money.

import { BRAND_AVERAGES, findBrand } from './brands';
import {
  BaselineRecord,
  Entry,
  PriceRecord,
  baselineSixthsFor,
  entriesForDay,
  priceRecordAtEndOfDay,
  totalSixths,
} from './domain';

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

// Deliberately NOT the FieldSource/SOURCES machinery from brands.ts (§6).
// That exists there because a printed MRP and an editorial nicotine estimate
// genuinely differ in confidence and cannot wear the same badge. Milestones
// have no such spread — every one of them comes from the same document, so
// they share one asOf, one source, one confidence, and the whole apparatus
// collapses to this constant plus one line of fine print.
//
// If we ever need a milestone this source doesn't cover, *that* is when
// per-field provenance earns its place. Not before.
export const MILESTONE_SOURCE = {
  title: 'Smoking Cessation: A Report of the Surgeon General',
  publisher: 'U.S. Department of Health and Human Services',
  asOf: '2020',
  url: 'https://www.hhs.gov/surgeongeneral/reports-and-publications/tobacco/index.html',
} as const;

// Not medical advice, and Stub is not a cessation treatment (§6, launch
// checklist). Shown wherever milestones are.
export const HEALTH_DISCLAIMER =
  'General information, not medical advice. Stub is a tracker, not a cessation treatment — talk to a doctor about quitting support.';

export type Milestone = {
  id: string;
  hours: number; // hours since the last cigarette
  label: string; // the clock reading, e.g. '20 minutes'
  body: string; // the claim, in the CDC's plainer phrasing of the SG report
  horizon: 'short' | 'long';
};

// Short horizon = the milestones that genuinely key off a *single* cigarette
// and are reachable inside a smoking day (§4.1). Everything past 24h assumes
// abstinence, so it lives in the locked section instead of quietly implying
// the user is failing at something they never signed up for.
export const MILESTONES: Milestone[] = [
  {
    id: '20min',
    hours: 1 / 3,
    label: '20 minutes',
    body: 'Heart rate and blood pressure drop.',
    horizon: 'short',
  },
  {
    id: '8h',
    hours: 8,
    label: '8 hours',
    body: 'Carbon monoxide in your blood is falling; oxygen is climbing back.',
    horizon: 'short',
  },
  {
    id: '12h',
    hours: 12,
    label: '12 hours',
    body: 'Carbon monoxide in your blood returns to a normal level.',
    horizon: 'short',
  },
  {
    id: '24h',
    hours: 24,
    label: '24 hours',
    body: 'Your risk of a heart attack begins to fall.',
    horizon: 'short',
  },
  {
    id: '2wk',
    hours: 24 * 14,
    label: '2 weeks to 3 months',
    body: 'Circulation improves and lung function increases.',
    horizon: 'long',
  },
  {
    id: '1yr',
    hours: 24 * 365,
    label: '1 year',
    body: 'Your excess risk of coronary heart disease is half a smoker’s.',
    horizon: 'long',
  },
  {
    id: '5yr',
    hours: 24 * 365 * 5,
    label: '5 years',
    body: 'Your risk of stroke can fall to close to that of a non-smoker.',
    horizon: 'long',
  },
];

export const SHORT_MILESTONES = MILESTONES.filter((m) => m.horizon === 'short');
export const LONG_MILESTONES = MILESTONES.filter((m) => m.horizon === 'long');

const HOUR_MS = 3_600_000;

// ---------------------------------------------------------------------------
// §4.1 — the two clocks
// ---------------------------------------------------------------------------

export type Gaps = {
  sinceLast: number | null; // ms since the last logged smoke; null = nothing logged
  longestEver: number; // ms — the record, including the still-open gap
  longestIsLive: boolean; // true when the current gap *is* the record
};

// All-time longest gap between smokes — the tiles' today-only calc (stats.ts
// `tiles('day')`) widened to the whole history. The still-open gap counts, so
// the record can be broken live rather than only in hindsight; that's the
// point of the section (§4.1 — your record is the ceiling, not the reset).
//
// Gaps are measured between logged smokes only. We deliberately don't count
// "install day → first smoke" as a gap: we weren't watching yet, and a fresh
// install would otherwise open with a fake record.
export function gaps(entries: Entry[], now: number): Gaps {
  if (!entries.length) return { sinceLast: null, longestEver: 0, longestIsLive: false };
  const ts = entries.map((e) => e.timestamp).sort((a, b) => a - b);
  let longestClosed = 0;
  for (let i = 1; i < ts.length; i++) {
    longestClosed = Math.max(longestClosed, ts[i] - ts[i - 1]);
  }
  const sinceLast = Math.max(0, now - ts[ts.length - 1]);
  return {
    sinceLast,
    longestEver: Math.max(longestClosed, sinceLast),
    longestIsLive: sinceLast >= longestClosed,
  };
}

// ---------------------------------------------------------------------------
// §4.2 — cumulative exposure avoided
// ---------------------------------------------------------------------------

export type Avoided = {
  sixths: number; // avoided sixths — our existing counterfactual unit
  cigarettes: number;
  nicotineMg: number;
  tarMg: number;
  estimated: boolean; // any day valued at dataset averages → the whole total is soft
};

// Exposure avoided since install, valued against the effective-dated baseline
// exactly the way computeSavings() values money (§4.2) — same loop, same
// window, same day-by-day effective dating, different multiplier.
//
// Counting starts at install day, consistent with Money and the P0 display
// rule: we only ever do arithmetic on days we actually watched.
//
// Deliberately NOT clamped per day. A day spent above your stated baseline
// subtracts, exactly as it does in Money — clamping would quietly hide
// over-baseline days behind a number that only ever goes up, which is the
// same lie in the other direction. The screen handles a net-negative total in
// words; it does not get rounded away here.
export function cumulativeAvoided(
  entries: Entry[],
  baselineHistory: BaselineRecord[],
  priceHistory: PriceRecord[],
  installDayKey: number,
  todayKey: number,
): Avoided {
  let sixths = 0;
  let nicotineMg = 0;
  let tarMg = 0;
  let estimated = false;

  for (let k = installDayKey; k <= todayKey; k++) {
    const avoided = baselineSixthsFor(baselineHistory, k) - totalSixths(entriesForDay(entries, k));
    if (avoided === 0) continue;
    // The brand in effect by that evening — avoided smokes have no timestamp
    // of their own, so they're valued at what the user was smoking that day
    // (brand switches are effective-dated in priceHistory, same as prices).
    const brand = findBrand(priceRecordAtEndOfDay(priceHistory, k).brandId);
    if (!brand) estimated = true;
    const perStickNicotine = brand?.nicotineMg ?? BRAND_AVERAGES.nicotineMg;
    const perStickTar = brand?.tarMg ?? BRAND_AVERAGES.tarMg;
    sixths += avoided;
    nicotineMg += (avoided / 6) * perStickNicotine;
    tarMg += (avoided / 6) * perStickTar;
  }

  return { sixths, cigarettes: sixths / 6, nicotineMg, tarMg, estimated };
}

// ---------------------------------------------------------------------------
// Milestone resolution + achievement state
// ---------------------------------------------------------------------------

// 'reached' — true right now, on the live clock.
// 'earned'  — the record cleared it once; permanent, because the record is
//             permanent (§9.1). This is what makes a resetting clock bearable.
// 'locked'  — never cleared.
export type MilestoneState = 'reached' | 'earned' | 'locked';

export type ResolvedMilestone = Milestone & { state: MilestoneState };

// The two horizons bank differently, and the difference is the §9.1 table.
//
// Short horizon banks permanently. Those milestones key off a *single*
// cigarette, so clearing one is a fact about a day that already happened —
// a record, and records don't un-happen.
//
// Long horizon does NOT bank. Those are claims about *sustained* abstinence
// ("circulation has improved", "excess coronary risk is halved"), and they
// are only true while the abstinence is. Someone whose record fortnight was
// last year, smoking daily since, has not halved anything. So a relapse
// relocks them (§9.1 row 4, §10) — which is also exactly what post-zero mode
// needs, and it means a long-horizon row is only ever live or locked, never
// banked.
//
// Phase 1 had both horizons banking off the record. That was wrong for the
// long horizon and would have quietly printed a medical claim the user's
// current behaviour no longer supports.
export function resolveMilestones(g: Gaps): ResolvedMilestone[] {
  return MILESTONES.map((m) => {
    const ms = m.hours * HOUR_MS;
    if (g.sinceLast != null && g.sinceLast >= ms) return { ...m, state: 'reached' as const };
    if (m.horizon === 'short' && g.longestEver >= ms) return { ...m, state: 'earned' as const };
    return { ...m, state: 'locked' as const };
  });
}

// The milestone the live clock is currently standing on, and the one it's
// walking toward. `current` is null before the first 20 minutes are up (and
// before anything is logged at all).
export function liveMilestones(resolved: ResolvedMilestone[]): {
  current: ResolvedMilestone | null;
  next: ResolvedMilestone | null;
} {
  const short = resolved.filter((m) => m.horizon === 'short');
  const reached = short.filter((m) => m.state === 'reached');
  const current = reached.length ? reached[reached.length - 1] : null;
  return {
    current,
    next: resolved.find((m) => m.state !== 'reached') ?? null,
  };
}

// The furthest milestone currently standing, banked or live — what the
// celebration acknowledges.
export function furthestEarned(resolved: ResolvedMilestone[]): ResolvedMilestone | null {
  const earned = resolved.filter((m) => m.state !== 'locked');
  return earned.length ? earned[earned.length - 1] : null;
}

// Milestones are ordered by `hours`, so position in MILESTONES is a rank.
// Unknown/absent ids rank below everything, which makes "never acknowledged
// anything" compare correctly against the first milestone.
//
// This exists because the acked milestone has to be a **high-water mark**,
// not an equality check. `furthestEarned` can move *backwards* — a relapse
// relocks the long horizon, dropping it from, say, 2 weeks to 24 hours — and
// an `earned.id !== ackedId` test reads that regression as something new to
// celebrate. The app would then congratulate the user seconds after they
// slipped, which is the ceremony §10 explicitly bans and the fear-adjacent
// tone §8 bans. Compare ranks, and only ever move forward.
export function milestoneRank(id?: string): number {
  if (!id) return -1;
  return MILESTONES.findIndex((m) => m.id === id);
}

// The furthest milestone that is *permanently* banked. Only the short horizon
// qualifies: long-horizon marks relock on a relapse, so any copy promising
// "that one's yours forever" must ask this rather than furthestEarned(), or
// it will promise permanence about a claim that expires the next time the
// user smokes.
export function furthestBanked(resolved: ResolvedMilestone[]): ResolvedMilestone | null {
  const banked = resolved.filter((m) => m.horizon === 'short' && m.state !== 'locked');
  return banked.length ? banked[banked.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// Durations here span 20 minutes to (hopefully) weeks, so fmtSince()'s
// "127h 3m" would stop being readable well before the interesting part.
export function fmtDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// mg totals run from single digits to thousands over a long taper.
export function fmtMg(mg: number): string {
  if (mg >= 1000) return `${(mg / 1000).toFixed(1)} g`;
  return `${Math.round(mg)} mg`;
}
