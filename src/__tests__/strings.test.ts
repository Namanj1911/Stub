// Push copy: deterministic per notification, and actually spread across the
// pool.
//
// Determinism and spread are tested separately, because they fail differently.
// Determinism is what the scheduler needs — a copy generator that rolls per
// call defeats reconcile()'s change-detection and rewrites pushes already
// sitting in the OS queue. Spread is what the *writing* needs, and it is the
// one that fails silently: a hash that is merely deterministic can map a whole
// pool onto one line, deleting copy nobody will ever see, with nothing about
// the app looking broken.
//
// ON THE FINALIZER, AND A CORRECTION (2026-07-20).
//
// pick() runs FNV-1a with Math.imul and then murmur3's finalizer. The comment
// in strings.ts credits the finalizer alone: "without the avalanche only two
// of the four nudge lines were reachable, split 910/3090 over 4000 seeds".
// Measured over 4000 real-shaped seeds, the two steps interact differently:
//
//   Math.imul   finalizer   distribution over the 4 nudge lines
//   ---------   ---------   -----------------------------------
//   yes         yes          964 / 1018 / 1031 /  987
//   yes         no           999 /  986 / 1012 / 1003
//   no          yes         1022 /  989 /  948 / 1041
//   no          no          3994 /    2 /    4 /    0   <— the collapse
//
// Only losing *both* breaks the pool; either step alone is enough to spread
// it. So the collapse recorded in the backlog was real, but its attribution
// was not: the without-finalizer baseline is even, and Math.imul is doing at
// least as much of the work. The likeliest history is that the "before" code
// had neither — a plain `*`, which overflows float64 and destroys the low bits
// the `% 4` index reads — and both were added in the same edit.
//
// Both stay: they are five cheap lines and the redundancy is the point, since
// either one failing alone is now survivable. But no test here can catch the
// removal of the finalizer on its own, because on its own it changes nothing.
// These assert the *property* — every line reachable, none dominant — which is
// what actually protects the copy.

import { budgetNudgeCopy, milestonePushCopy } from '../strings';
import { INSTALL_KEY as I, atLocalHour } from './fixtures';

// Realistic seeds, in the exact shape notificationPlan builds them:
// `${id}:${fireAt}` over consecutive day keys. The consecutive part matters —
// adjacent keys differ only in their last character or two, which is precisely
// the case a weak avalanche fails to separate.
function nudgeSeeds(count: number): { seed: string; fireAt: number }[] {
  const out = [];
  for (let n = 0; n < count; n++) {
    const key = I + n;
    const fireAt = atLocalHour(key, 15, 45);
    out.push({ seed: `nudge-${key}:${fireAt}`, fireAt });
  }
  return out;
}

describe('push copy is deterministic', () => {
  it('gives the same line for the same seed, every time', () => {
    const { seed, fireAt } = nudgeSeeds(1)[0];
    const first = budgetNudgeCopy(6, fireAt, seed);
    for (let i = 0; i < 100; i++) {
      expect(budgetNudgeCopy(6, fireAt, seed)).toEqual(first);
    }
  });

  it('gives the same line for the same milestone and fire time', () => {
    const seed = `quit-day:${atLocalHour(I, 9)}`;
    const first = milestonePushCopy('quit-day', seed);
    for (let i = 0; i < 100; i++) {
      expect(milestonePushCopy('quit-day', seed)).toEqual(first);
    }
  });

  it('gives a different occasion different words — same milestone, later run', () => {
    // A streak broken and re-earned should not read identically the second
    // time. The seed carries fireAt precisely so it doesn't.
    const bodies = new Set<string>();
    for (let n = 0; n < 200; n++) {
      bodies.add(milestonePushCopy('streak-7', `streak-7:${atLocalHour(I + n, 9)}`)!.body);
    }
    expect(bodies.size).toBeGreaterThan(1);
  });
});

describe('push copy reaches its whole pool', () => {
  // Holding the remaining count and the fire *hour* constant means `left` and
  // `when` are identical across every call, so the only thing that can differ
  // in the rendered body is which line was picked. Distinct bodies = distinct
  // lines reached.
  it('draws all four nudge lines, without a heavily favoured one', () => {
    const counts = new Map<string, number>();
    const seeds = nudgeSeeds(4000);
    for (const { seed, fireAt } of seeds) {
      const { body } = budgetNudgeCopy(6, fireAt, seed);
      counts.set(body, (counts.get(body) ?? 0) + 1);
    }

    expect(counts.size).toBe(4);

    // Reachable is not the same as usable. An even split is 25% each and the
    // observed spread is ~24–26%; 15% is loose enough not to be brittle and
    // tight enough to catch a pool collapsing toward one line. The imul
    // regression lands at 99.9%/0.05%/0.1%/0%, so this catches it twice over.
    for (const n of counts.values()) {
      expect(n / seeds.length).toBeGreaterThan(0.15);
    }
  });

  it('draws all three lines of each milestone pool', () => {
    for (const id of ['first-under-budget', 'first-clean-day', 'quit-day']) {
      const bodies = new Set<string>();
      for (let n = 0; n < 2000; n++) {
        bodies.add(milestonePushCopy(id, `${id}:${atLocalHour(I + n, 9)}`)!.body);
      }
      expect(bodies.size).toBe(3);
    }
  });

  it('draws both lines of each streak pool', () => {
    for (const n of [3, 7, 14, 30]) {
      const id = `streak-${n}`;
      const bodies = new Set<string>();
      for (let d = 0; d < 2000; d++) {
        bodies.add(milestonePushCopy(id, `${id}:${atLocalHour(I + d, 9)}`)!.body);
      }
      expect(bodies.size).toBe(2);
    }
  });

  it('separates seeds that differ only in their final digits', () => {
    // The narrowest version: identical prefix, adjacent fire times. Seeds this
    // close are what a run of consecutive days actually produces, and a hash
    // with a weak avalanche maps long stretches of them onto one line.
    const bodies = new Set<string>();
    const fireAt = atLocalHour(I, 15, 45);
    for (let n = 0; n < 40; n++) {
      bodies.add(budgetNudgeCopy(6, fireAt, `nudge-${I}:${fireAt + n}`).body);
    }
    expect(bodies.size).toBe(4);
  });
});

describe('nudge copy renders the remaining count as English', () => {
  const fireAt = atLocalHour(I, 15, 45);
  const seed = `nudge-${I}:${fireAt}`;

  it('says "1 cigarette", never "1 cigarettes"', () => {
    expect(budgetNudgeCopy(6, fireAt, seed).body).toContain('1 cigarette');
    expect(budgetNudgeCopy(6, fireAt, seed).body).not.toContain('1 cigarettes');
  });

  it('reads a bare fraction as "½ of a cigarette"', () => {
    expect(budgetNudgeCopy(3, fireAt, seed).body).toContain('½ of a cigarette');
  });

  it('pluralises above a whole one', () => {
    expect(budgetNudgeCopy(9, fireAt, seed).body).toContain('1½ cigarettes');
  });
});

describe('milestonePushCopy', () => {
  it('returns null for an unknown id rather than inventing copy', () => {
    expect(milestonePushCopy('not-a-milestone', 'x')).toBeNull();
    expect(milestonePushCopy('streak-5', 'x')).toBeNull(); // not a threshold
  });

  it('titles a streak with its own length', () => {
    expect(milestonePushCopy('streak-14', 'x')!.title).toBe('14 days under budget');
  });
});
