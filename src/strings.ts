// All user-facing feedback copy lives in this one table (NFR7). The app
// speaks in one voice — roast — by product decision (gentle mode removed).

const TABLE = {
  undone: 'Undone. It never happened.',
  edited: 'Fixed. Revisionist history, but fine.',
  deleted: 'Deleted. We saw nothing.',
  budgetTorched: 'budget torched',
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
