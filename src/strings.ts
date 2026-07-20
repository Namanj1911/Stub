// All user-facing feedback copy lives in this one table (NFR7). The app
// speaks in one voice — roast — by product decision (gentle mode removed).

import { frac } from './domain';

const TABLE = {
  undone: 'Undone. It never happened.',
  edited: 'Fixed. Revisionist history, but fine.',
  deleted: 'Deleted. We saw nothing.',
  budgetTorched: 'budget torched',
  // Log's caption once the plan reaches zero. The budget framing retires
  // there — "of a 0 budget · budget torched" printed the roast at a user who
  // had smoked nothing, which is the lecture design §10 bans. Neither line
  // may congratulate or scold: the mode is Goal's story to tell, and a slip
  // gets noted, not judged.
  taperDone: 'past the taper',
  taperDoneClean: 'nothing logged today',
  taperDoneLogged: 'on the record',
  // Profile's plan section at zero. Says nothing about restarting a taper:
  // verified 2026-07-20 that nothing in the app can lift the budget back off
  // zero — not a pace change, not a baseline edit — so any "you can start
  // again by…" line here would be a promise the app does not keep. See
  // BACKLOG P0 for the underlying one-way-door bug.
  planDone: 'The taper is done.',
  planDoneNote:
    "Your plan stepped the budget all the way down to zero, so there's no pace left to set. Goal has the rest of the story.",
  backfilled: 'Bar night, huh. Logged — stats recomputed.',
  backfillZero: 'Add zero? Bold strategy. Tap an amount first.',
  moneyBehind:
    "You're smoking above your baseline, so this is costing you extra. Goa is drifting further away, just so you know.",
  baselineNote: 'Applies from today — your history keeps its old numbers.',
  resetTitle: 'Burn it all down?',
  resetBody:
    "Every log, craving and rupee saved — gone. This is the one thing here we can't undo.",
  resetConfirm: 'Reset everything',
  exportNote: 'Your data lives only on this phone. Export it somewhere safe once in a while.',
  notifNote:
    "Scheduled on your phone, like an alarm — nothing leaves the device. We'll ask iOS for permission the first time there's actually something to say.",
} as const satisfies Record<string, string>;

export type StringKey = keyof typeof TABLE;

export function copy(key: StringKey): string {
  return TABLE[key];
}

// Log toast pools (BACKLOG P2 round 2): every log rolls a fresh roast from
// the pool for its budget state, so the second cigarette of the day doesn't
// hear the same line as the first. States are checked severity-first; a
// ⅓-shared log mixes in the "splitting the bill" pool as extra candidates.
const LOG_TOASTS = {
  // first log of the day, budget still comfortable
  firstOfDay: [
    "Day's open. Let's see if today's the day you embarrass the budget.",
    'First one logged. The scoreboard is watching now.',
    "And we're off. Slow start is a strategy — keep it.",
    'Logged. The day had a perfect record for a while there.',
  ],
  // comfortably within budget
  within: [
    'Logged. Still on plan — annoyingly responsible of you.',
    'Logged. The budget barely felt that one.',
    "Noted. At this pace you'll finish the day insufferably smug.",
    "Logged. Plenty of runway — don't take that as a challenge.",
  ],
  // one-ish cigarette left in the budget
  oneLeft: [
    'Logged. That leaves basically fumes for the rest of the day.',
    'One-ish left. Choose its moment wisely.',
    'Logged. The budget is down to its last life.',
    "That's the second-to-last call. Make the next one count — or don't have it.",
  ],
  // landed exactly on budget
  exact: [
    "Logged. That's the budget, to the drag. Walk away clean.",
    'Dead on budget. End on this and you win the day on a technicality.',
    'Budget: exactly spent. Anything more is officially freelancing.',
    "That's the whole allowance. The next one has no alibi.",
  ],
  // over budget, under 150%
  over: [
    'Over budget. Your lungs saw that, by the way.',
    'Logged, and over. The budget filed a complaint.',
    'That one was off the books. We logged it anyway — honesty hurts.',
    "Over the line. Tomorrow's you just sighed audibly.",
  ],
  // ≥150% of budget
  torched: [
    "Budget torched. At this point we're just doing archaeology.",
    "That's 150% and climbing. The budget has left the chat.",
    "Logged. The budget stopped watching a while ago — we didn't.",
    "We're deep in bonus territory now. Nobody's proud, but it's logged.",
  ],
  // ⅓-shared logs — mixed into whichever state pool applies
  shared: [
    "A third, logged. Splitting the bill with someone else's lungs.",
    'One-third. Communal damage — very generous of you.',
    'Logged the ⅓. Sharing is caring, technically still smoking.',
    "A polite third. The group discount doesn't apply to tar.",
  ],
} as const;

// Remember the last line shown so back-to-back logs never repeat verbatim —
// the repeat complaint is what created this pool in the first place.
let lastLogToast = '';

export function logToast(args: { priorTotal: number; budget: number; sixths: number }): string {
  const after = args.priorTotal + args.sixths;
  const state =
    after >= args.budget * 1.5
      ? 'torched'
      : after > args.budget
        ? 'over'
        : after === args.budget
          ? 'exact'
          : args.budget - after <= 6
            ? 'oneLeft'
            : args.priorTotal === 0
              ? 'firstOfDay'
              : 'within';
  const candidates: readonly string[] =
    args.sixths === 2 ? [...LOG_TOASTS[state], ...LOG_TOASTS.shared] : LOG_TOASTS[state];
  let line = candidates[Math.floor(Math.random() * candidates.length)];
  if (line === lastLogToast && candidates.length > 1) {
    line = candidates[(candidates.indexOf(line) + 1) % candidates.length];
  }
  lastLogToast = line;
  return line;
}

// S20 craving SOS copy — a pool per countdown stage; one is picked at random
// each session so repeat visitors don't memorize the script.
export const SOS_PROMPTS = {
  early: [
    'Get up. Drink a glass of water. Slowly.',
    'Go stand somewhere else. Cravings hate a change of scenery.',
    'Text someone back. You owe at least three people replies anyway.',
    'Ten slow breaths by a window. Yes, actually do it.',
    'Eat something small. Your brain is confusing hungry with smoky.',
  ],
  mid: [
    'Four counts in, hold four, four out. Repeat.',
    "Halfway. The craving already peaked — it just doesn't know it yet.",
    'Clench your fists for five seconds, release. Repeat until bored.',
    'Name five things you can see. Boring? Cravings hate boring.',
  ],
  late: [
    "Almost there. It's already weaker than it was.",
    "Under two minutes. You've outlasted worse than this.",
    "It's fading. Let it leave without a goodbye.",
  ],
} as const;

export function pickPrompts(): { early: string; mid: string; late: string } {
  const pick = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)];
  return {
    early: pick(SOS_PROMPTS.early),
    mid: pick(SOS_PROMPTS.mid),
    late: pick(SOS_PROMPTS.late),
  };
}

export function sosResult(
  outcome: 'survived' | 'smoked',
  weeklySurvived: number,
): { title: string; body: string } {
  if (outcome === 'survived') {
    return {
      title: `Craving: 0. You: ${weeklySurvived}.`,
      body: `That's ${weeklySurvived} outlasted this week. The craving is embarrassed for itself.`,
    };
  }
  return {
    title: 'Logged. No drama.',
    body: "It happens. We logged it against today's budget — honesty is the whole point.",
  };
}

// S7 insight card copy
export function insightCopy(
  insight:
    | { kind: 'danger'; window: string }
    | { kind: 'weekend'; over: string }
    | { kind: 'newUser' },
): string {
  switch (insight.kind) {
    case 'danger':
      return `Your danger zone is ${insight.window}. Plan literally anything else for that window.`;
    case 'weekend':
      return `Weekends are your weak spot — Saturdays average +${insight.over} over budget. Maybe don't be that guy this Saturday.`;
    case 'newUser':
      return `Not enough data to roast you properly yet. A week of honest logging fixes that.`;
  }
}

// Money-tab temptation line (2f mockup's "That's an iPhone…" row) — a pool
// so the bait changes. Rolled once per app launch (module load), like the
// SOS prompts: same line all session, a fresh one next time the app opens.
const TEMPTATIONS: ((flights: number) => { line: string; emoji: string })[] = [
  (f) => ({ line: `That's an iPhone. Or ${f} Goa flight${f === 1 ? '' : 's'}.`, emoji: '✈️' }),
  (f) => ({
    line: `${f} Goa flight${f === 1 ? '' : 's'}. Window seat — you've earned the view.`,
    emoji: '🏖️',
  }),
  () => ({ line: "That's a PS5, the good controller, and zero regrets.", emoji: '🎮' }),
  () => ({ line: 'A Himalayan trek — with lungs that can actually do it.', emoji: '🏔️' }),
  () => ({ line: 'Every streaming service for a year. Popcorn included.', emoji: '🍿' }),
  () => ({ line: "A scooter down payment. Vroom beats cough, any day.", emoji: '🛵' }),
  () => ({ line: 'Front-row concert tickets. Plus the overpriced t-shirt.', emoji: '🎸' }),
];

const TEMPTATION_ROLL = Math.floor(Math.random() * TEMPTATIONS.length);

export function moneyTemptation(flights: number): { line: string; emoji: string } {
  return TEMPTATIONS[TEMPTATION_ROLL](Math.max(1, flights));
}

// Under-budget streak card (BACKLOG P3): one line per streak state. Rolled
// once per launch (module load), like the temptation pool — the line stays
// put while the user pokes around Stats, and changes next app open.
//
// Declutter rule (owner feedback 2026-07-17): the card already shows the
// numbers, so lines never restate them. The one exception is the broken
// state, where the card shows 0 and the dead streak's length IS the roast.
const STREAK_LINES: Record<
  'none' | 'broken' | 'building' | 'record',
  ((best: number) => string)[]
> = {
  // never had a streak — new user or rough start
  none: [
    () => 'One day under budget starts the counter. Today qualifies, technically.',
    () => 'No streak yet. The counter is ready when you are.',
    () => 'Nothing to defend yet. Finish today under budget and that changes.',
  ],
  // current 0, best > 0 — the streak broke; this is the roast the backlog asked for
  broken: [
    (b) => `The last streak lived ${d(b)}. Avenge it.`,
    (b) => `You've done ${d(b)} straight before. That person is still in there.`,
    (b) => `${cap(d(b))}, then nothing. The scoreboard remembers.`,
    (b) => `A ${d(b)} run, gone. Even the heatmap looked away.`,
  ],
  // alive but short of the record
  building: [
    () => 'Past you is still winning. Go embarrass them.',
    () => 'Your record is watching nervously.',
    () => 'Keep it boring — boring is how records fall.',
  ],
  // at the personal best — the accent color says "record", the line just pokes
  record: [
    () => "Your best run ever. Don't get sentimental about it.",
    () => 'This is the record. Every day from here is new territory.',
    () => "The budget is starting to trust you. Don't make it weird.",
  ],
};

const d = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const STREAK_ROLL = Math.random();

export function streakCopy(current: number, best: number): string {
  const state =
    best === 0 ? 'none' : current === 0 ? 'broken' : current < best ? 'building' : 'record';
  const pool = STREAK_LINES[state];
  return pool[Math.floor(STREAK_ROLL * pool.length)](best);
}

// Tomorrow's-budget nudge on Log (design/HEALTH_TIMELINE.md §13). The caption
// itself is always visible; this line only appears once today's budget is
// ≥80% spent, which is when tomorrow stops being trivia. Rolled once per
// launch like the temptation pool.
//
// Same declutter rule as the streak card: the caption already prints
// tomorrow's number, so no line restates it.
const TOMORROW_NUDGES = [
  'Tomorrow starts lower. Sleep on it.',
  "That's tomorrow's ceiling. It doesn't negotiate.",
  'Tomorrow already has opinions about today.',
  'The number goes down from here. That was the whole idea.',
];

const TOMORROW_ROLL = Math.floor(Math.random() * TOMORROW_NUDGES.length);

export function tomorrowNudge(): string {
  return TOMORROW_NUDGES[TOMORROW_ROLL];
}

// ---------------------------------------------------------------------------
// Health timeline (design/HEALTH_TIMELINE.md §8) — TONE RULE, read before
// adding a line below:
//
//   Roast the behaviour, never the disease. No cancer punchlines, no
//   tombstones, no "your lungs look like a barbecue". The joke is always
//   about the user's choices, never about what those choices might do to
//   them. Fear is what every other quit app sells; we don't.
//
// Second rule, from §4.1: congratulate the distance covered, never mourn the
// reset. No line here may imply the user wrecked anything by logging — that
// would invert the app's own "never blocks logging" principle, and SOS
// already owns the "you were doing so well" beat. The reset is quiet
// (decision 2); nothing fires when the clock goes back to zero.
//
// All pools roll once per launch at module load, like TEMPTATIONS and
// STREAK_LINES: the line holds still while the user reads the screen, and
// changes next time the app opens.

const HEALTH_CLOCK_LINES: Record<'none' | 'building' | 'record', string[]> = {
  // nothing logged yet — the clock has no anchor
  none: [
    'Log a smoke and the clock starts. That is the only way this screen gets interesting.',
    'No logs yet, so no clock yet. The body is waiting on you either way.',
  ],
  // clock running, short of the personal best
  building: [
    'The clock is running. It has done better — go remind it.',
    'Nothing required here. That is the entire trick.',
    'Every minute here is a minute your blood pressure gets to itself.',
    'This is the part that counts. Nothing to do, which is the good news.',
    // no line in this pool may presume elapsed time: it also shows at 0m,
    // immediately after a log, where "still going" read as nonsense (owner, on
    // device). The reset stays quiet (decision 2) — the copy simply must not
    // trip over it.
    'Boring is exactly what this number wants from you.',
  ],
  // the live gap IS the record
  record: [
    'This is the longest you have gone. Right now. Keep sitting there.',
    'New territory. Past you never made it this far.',
    'Record in progress. No pressure, but the scoreboard is awake.',
  ],
};

const HEALTH_CLOCK_ROLL = Math.random();

export function healthClockCopy(state: 'none' | 'building' | 'record'): string {
  const pool = HEALTH_CLOCK_LINES[state];
  return pool[Math.floor(HEALTH_CLOCK_ROLL * pool.length)];
}

// The cumulative section (§4.2) — the one number that only goes up. It makes
// no medical claim at all, so the copy shouldn't either: it's arithmetic on
// the user's own logs, and that's the joke.
const AVOIDED_LINES = [
  'Nothing here is a medical claim — it is just the arithmetic on what you did not smoke.',
  'This number never resets. It happened, and the app is not going to pretend otherwise.',
  'Not healing, just absence. Absence is still the whole point.',
  'Every one of these is a cigarette you thought about and skipped. They add up quietly.',
];

const AVOIDED_ROLL = Math.floor(Math.random() * AVOIDED_LINES.length);

export function avoidedCopy(): string {
  return AVOIDED_LINES[AVOIDED_ROLL];
}

// Mirrors `moneyBehind`: above baseline means the counterfactual runs the
// other way, and we say so plainly instead of clamping the number to zero.
export const healthBehind =
  "You're smoking above your baseline right now, so there's nothing banked yet. It starts counting the moment you're under.";

// Milestone celebration (§9). In-app only this phase — no push until the dev
// build — so it has to feel earned when the user opens the app and finds it
// waiting. Rolled per launch like everything else here.
const MILESTONE_CELEBRATIONS = [
  'Earned. Your body did the work; you just stayed out of its way.',
  'That one is yours now. It does not un-happen.',
  'Milestone cleared. Quietly impressive, which is the best kind.',
  'Logged in the good column for once.',
];

const CELEBRATION_ROLL = Math.floor(Math.random() * MILESTONE_CELEBRATIONS.length);

export function milestoneCelebration(): string {
  return MILESTONE_CELEBRATIONS[CELEBRATION_ROLL];
}

// ---------------------------------------------------------------------------
// Post-zero mode (design/HEALTH_TIMELINE.md §10, §12)
//
// The §8 tone rule still holds, plus one that only applies here: **a relapse
// gets no lecture and no ceremony.** §10 is explicit — the app notes it and
// moves on. There is no "start over" screen, no streak-broken theatre, and
// nothing that treats the user as having failed. §9.2's "notify on gain, stay
// silent on loss" is the same instinct; this is its in-app half.
//
// That is also why relapseNote() exists at all. Without it a post-zero slip
// falls through to LOG_TOASTS, where a budget of zero puts it straight into
// the 'torched' pool — "budget torched, we're just doing archaeology" — which
// is a lecture, delivered at the user's lowest moment, about a budget that no
// longer exists. Exactly the fear-selling §8 bans.

// The in-between state: the plan has reached zero but the seven days that
// earn the mode haven't been lived yet (§12).
// Same declutter rule as STREAK_LINES and the tomorrow nudge: the card
// already prints the number and the 5/7 progress, so no line may restate
// either. "Budget: zero. …" under a card headed BUDGET / Zero read as an
// echo (owner's screen, on device).
const ARRIVED_LINES = [
  'The plan did its part. The rest is just days.',
  'The taper has landed. Nothing left to ration.',
  'On paper you are done. Living it is the other half.',
  'The number finally ran out of room. Go be boring for a while.',
];

const ARRIVED_ROLL = Math.floor(Math.random() * ARRIVED_LINES.length);

export function arrivedCopy(): string {
  return ARRIVED_LINES[ARRIVED_ROLL];
}

const SMOKE_FREE_LINES: Record<'fresh' | 'building' | 'record', string[]> = {
  // just flipped — the mode is new
  fresh: [
    'Seven days clean. The app has changed its job description.',
    'You are out of the taper and into the part nobody warned you about: normal.',
    'Mode switched. You are not quitting any more — you quit.',
  ],
  // running, short of the personal best
  building: [
    'The counter is doing its favourite thing: going up.',
    'Still clean. Past you is somewhere back there, impressed.',
    'Nothing to ration, nothing to spend. Just days.',
  ],
  // at the personal best
  record: [
    'Longest you have ever gone. The record is yours to keep breaking.',
    'New territory, one boring day at a time.',
    'This is the furthest you have been. Keep walking.',
  ],
};

// The offer (src/postzero.ts): seven clean days are on the board and the app
// is asking the user to confirm the mode rather than declaring it. Two rules,
// both from why the offer exists at all. No line may congratulate — the days
// are not in evidence until the user says they are, and celebrating first
// would be the same assumption in a friendlier voice. And no line may
// pressure: not confirming is a legitimate answer, including "I smoked and
// didn't log it", which is exactly the honesty this question is fishing for.
const OFFER_LINES = [
  'Seven days with nothing logged. Only you know if that is the whole story — if it is, say so.',
  'The log has been empty for a week. Your call whether that means what it looks like.',
  'Seven clean days on paper. We are not going to assume it for you.',
  'A week without a cigarette, if the log is telling the truth. Is it?',
];

const OFFER_ROLL = Math.floor(Math.random() * OFFER_LINES.length);

export function postZeroOfferCopy(): string {
  return OFFER_LINES[OFFER_ROLL];
}

const SMOKE_FREE_ROLL = Math.random();

export function smokeFreeCopy(streakDays: number, bestDays: number): string {
  const state = streakDays <= 8 ? 'fresh' : streakDays >= bestDays ? 'record' : 'building';
  const pool = SMOKE_FREE_LINES[state];
  return pool[Math.floor(SMOKE_FREE_ROLL * pool.length)];
}

// A relapse, logged. Honest, unbothered, and over in one line — the app
// notices and carries on. No line here may scold, mourn a streak, or suggest
// starting over; the cumulative totals and the money didn't reset, and
// neither should the tone.
const RELAPSE_LINES = [
  'Logged. The streak resets; nothing else does.',
  'Noted, and moving on. Your totals are untouched.',
  'Logged. One cigarette is one cigarette — not a verdict.',
  'On the record. Tomorrow is still available.',
];

let lastRelapseLine = '';

export function relapseNote(): string {
  let line = RELAPSE_LINES[Math.floor(Math.random() * RELAPSE_LINES.length)];
  if (line === lastRelapseLine && RELAPSE_LINES.length > 1) {
    line = RELAPSE_LINES[(RELAPSE_LINES.indexOf(line) + 1) % RELAPSE_LINES.length];
  }
  lastRelapseLine = line;
  return line;
}

// Brand-switch roast (BACKLOG P1): the app noticed, and has opinions.
export function brandSwitchRoast(
  prev: { nicotineMg: number; estimated: boolean } | null,
  next: { label: string; nicotineMg: number; estimated: boolean },
): string {
  if (next.estimated) {
    return `No lab data for ${next.label}, so we'll assume it's average. Statistically, it is.`;
  }
  if (!prev || prev.estimated) {
    return `${next.label} it is. Now the nicotine math is real, not average.`;
  }
  const delta = Math.round(((next.nicotineMg - prev.nicotineMg) / prev.nicotineMg) * 100);
  if (delta > 5) {
    return `${next.label} packs ${delta}% more nicotine per stick. Bold choice for someone quitting.`;
  }
  if (delta < -5) {
    return `${Math.abs(delta)}% less nicotine per stick. Sneaky downgrade — we respect it.`;
  }
  return 'Same nicotine, different wrapper. A lateral move, but noted.';
}

// Onboarding reaction card (parameterised, so kept as a function)
export function setupReaction(countPerDay: number): string {
  if (countPerDay <= 5)
    return `Light smoker. A Chill pace could have you done in about ${Math.ceil(countPerDay / 0.5)} weeks.`;
  if (countPerDay <= 12)
    return `About average for your age group. At a Steady pace, zero in roughly ${Math.ceil(countPerDay / 1)} weeks. Very doable.`;
  return `Heavy going. No panic — we taper, not cold turkey. Steady pace: about ${Math.ceil(countPerDay / 1)} weeks to zero.`;
}

// ---------------------------------------------------------------------------
// Notifications (SPEC S15/S17) — TONE RULE, read before adding a line.
//
// Push copy has constraints nothing else in this table has:
//
// 1. It lands out of context. No line may refer to what's on screen ("the
//    card above", "that number") — there is no screen.
// 2. It lands *later* than the moment that earned it (the nudge fires 45
//    minutes after the crossing log; milestones fire the next morning). So
//    nothing may claim to be live: no "right now", no "just then".
// 3. Someone else may read it over a shoulder, on a lock screen, in public.
//    That rules out the blunter end of the roast register — "your lungs saw
//    that" is fine in-app and would be genuinely embarrassing on a lock
//    screen next to the user's name. Roast the budget, not the smoker.
// 4. Two lines, max. iOS truncates a collapsed banner hard.
//
// Rolled per call rather than per launch: unlike the in-app pools, two
// notifications of the same kind are days apart, so a repeat is invisible.

const NUDGE_LINES: ((left: string, when: string) => string)[] = [
  (left, when) => `${left} left, and it's only ${when}.`,
  (left, when) => `It's ${when}. You've got ${left} to last the evening.`,
  (left) => `${left} left in the budget. The day is not over.`,
  (left, when) => `${when}, ${left} to go. Pace yourself or don't — we'll log it either way.`,
];

const roll = <T,>(pool: T[]): T => pool[Math.floor(Math.random() * pool.length)];

// "3pm" / "11am" — the hour is the point ("it's only 3pm"), minutes are noise.
function fmtHour(timestamp: number): string {
  const h = new Date(timestamp).getHours();
  const suffix = h < 12 ? 'am' : 'pm';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

// S15 budget nudge. `remainingSixths` is what's left when the push is
// *scheduled*; it can only have shrunk by the time it lands, so the copy says
// "left" rather than promising an exact remaining count on arrival.
export function budgetNudgeCopy(
  remainingSixths: number,
  fireAt: number,
): { title: string; body: string } {
  // frac() renders sixths as ⅓/½/1½ etc. A bare fraction reads wrong with a
  // plural noun ("½ cigarettes"), so anything under a whole one gets "a".
  const left =
    remainingSixths === 6
      ? '1 cigarette'
      : remainingSixths < 6
        ? `${frac(remainingSixths)} of a cigarette`
        : `${frac(remainingSixths)} cigarettes`;
  return { title: 'Budget check', body: roll(NUDGE_LINES)(left, fmtHour(fireAt)) };
}

// S17 milestones + the milestone roasts (BACKLOG "Later", decided 2026-07-17).
// Deliberately a short list — the backlog's word is "personal, not badge
// spam". Each of these fires at most once, ever.
//
// The praise is real; the roast is the chaser. Getting that order wrong
// (roast first) reads as sarcasm about the achievement itself, which is the
// one thing a milestone push must not do.
const MILESTONE_PUSH: Record<string, { title: string; lines: string[] }> = {
  'first-under-budget': {
    title: 'First day under budget',
    lines: [
      'You finished a day inside the number. Once is an accident — do it again.',
      "That's one day the budget didn't lose. Only one, mind you.",
      'Under budget, first time. The bar is on the floor and you cleared it — good.',
    ],
  },
  'first-clean-day': {
    title: 'A smoke-free day',
    lines: [
      'A whole day, nothing logged. Your lungs would like this in writing.',
      "Zero. Not 'nearly zero' — zero. That one goes on the record.",
      'Nothing logged all day. Suspicious. Excellent, but suspicious.',
    ],
  },
  'quit-day': {
    title: 'The budget hit zero',
    lines: [
      'Your plan has run out of cigarettes to give you. That was the whole point.',
      "Budget: zero. The taper is done — now it's just you and the habit.",
      'Zero budget from here. Everything after this is yours to keep.',
    ],
  },
};

const STREAK_PUSH: Record<number, string[]> = {
  3: [
    'Three days under budget. Long enough to stop being luck.',
    "Three straight. That's a pattern forming, whether you meant it or not.",
  ],
  7: [
    'A full week under budget. The budget has stopped arguing.',
    'Seven days straight. Statistically, you are now a different smoker.',
  ],
  14: [
    'Two weeks under budget. This is just how you smoke now, apparently.',
    'Fourteen days. The streak is starting to look like a personality trait.',
  ],
  30: [
    'Thirty days under budget. At some point we have to admit this is deliberate.',
    'A month straight. The app is running out of ways to be surprised.',
  ],
};

export function milestonePushCopy(id: string): { title: string; body: string } | null {
  const streak = id.match(/^streak-(\d+)$/);
  if (streak) {
    const n = Number(streak[1]);
    const pool = STREAK_PUSH[n];
    if (!pool) return null;
    return { title: `${n} days under budget`, body: roll(pool) };
  }
  const m = MILESTONE_PUSH[id];
  return m ? { title: m.title, body: roll(m.lines) } : null;
}
