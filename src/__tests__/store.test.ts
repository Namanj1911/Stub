// The load path's one pure decision: is this stored string ours, or not (R5)?
//
// "Not ours" used to be treated as "no data": onboarding appeared and the
// first write replaced whatever was there. readStored() is what now tells the
// two apart, so the cases below are the ones where a wrong answer costs the
// user their history — and the ones where a wrong answer would lock a healthy
// install out as "damaged".
//
// store.ts imports AsyncStorage, which has no implementation under node. It is
// only touched inside the hook, so an empty stand-in is enough here.
jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { readStored, rescueKey } from '../store';
import { INSTALL_KEY as I, smoke } from './fixtures';

const profile = {
  countPerDay: 10,
  pace: 'steady',
  installDayKey: I,
  pricePerStick: 20,
  baselineHistory: [{ fromDayKey: I, countPerDay: 10 }],
  priceHistory: [{ fromTimestamp: 0, pricePerStick: 20 }],
  planHistory: [{ fromDayKey: I, rate: 6, startBudget: 60 }],
};

describe('readStored', () => {
  it('reads back what the app writes', () => {
    const entries = [smoke(I, 1), smoke(I + 1, 2)];
    const stored = readStored(JSON.stringify({ profile, entries, cravings: [] }));
    expect(stored?.entries).toEqual(entries);
    expect(stored?.profile?.installDayKey).toBe(I);
  });

  it('accepts a store from before cravings existed — old is not damaged', () => {
    const stored = readStored(JSON.stringify({ profile: null, entries: [] }));
    expect(stored).not.toBeNull();
    expect(stored?.cravings).toEqual([]);
  });

  it('refuses a string cut off mid-write', () => {
    const whole = JSON.stringify({ profile, entries: [smoke(I, 1)], cravings: [] });
    expect(readStored(whole.slice(0, whole.length - 20))).toBeNull();
  });

  it('refuses JSON that parses but is not a store', () => {
    for (const raw of ['null', '[]', '"stub"', '42']) expect(readStored(raw)).toBeNull();
  });

  it('refuses a store whose history is not a list', () => {
    expect(readStored(JSON.stringify({ profile, entries: {}, cravings: [] }))).toBeNull();
    expect(readStored(JSON.stringify({ profile, entries: [], cravings: 'x' }))).toBeNull();
    expect(readStored(JSON.stringify({ profile: 7, entries: [] }))).toBeNull();
  });
});

describe('rescueKey', () => {
  it('gives each failure its own key, so a second one cannot replace the first copy', () => {
    expect(rescueKey(1000)).not.toBe(rescueKey(2000));
  });

  it('sits under the main key, where reset sweeps it up', () => {
    expect(rescueKey(1000).startsWith('stub/v1/')).toBe(true);
  });
});
