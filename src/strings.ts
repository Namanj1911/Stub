// All user-facing feedback copy lives in this one table (NFR7). The app
// speaks in one voice — roast — by product decision (gentle mode removed).

const TABLE = {
  logOver: 'Over budget. Your lungs saw that, by the way.',
  logNear: 'Logged. That leaves basically fumes for the rest of the day.',
  logWithin: 'Logged. Still on plan — annoyingly responsible of you.',
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
    return `Light smoker. A Chill pace could have you done in about ${Math.ceil(countPerDay / 0.25)} weeks.`;
  if (countPerDay <= 12)
    return `About average for your age group. At a Steady pace, zero in roughly ${Math.ceil(countPerDay / 0.5)} weeks. Very doable.`;
  return `Heavy going. No panic — we taper, not cold turkey. Steady pace: about ${Math.ceil(countPerDay / 0.5)} weeks to zero.`;
}
