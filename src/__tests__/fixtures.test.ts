// The fixtures invert domain.dayKey() with arithmetic. If that inversion is
// wrong every scenario in the suite is silently off by a day, and the failures
// would surface as confusing budget numbers rather than as "the helper is
// broken". These tests keep that mistake local.

import { dayKey } from '../domain';
import { INSTALL_KEY, atLocalHour, startOfDayKey } from './fixtures';

describe('day-key fixtures', () => {
  it('pins the timezone, so hour-of-day gates mean the same thing everywhere', () => {
    // Not an assertion about correctness — an assertion that jest.config.js is
    // in effect. The notification tests below are all hour-gated (quiet hours
    // 22:00–09:00, the 8pm evening gate), and a runner in UTC would exercise
    // entirely different branches while still reporting green.
    expect(process.env.TZ).toBe('Asia/Kolkata');
    expect(new Date(startOfDayKey(INSTALL_KEY)).getTimezoneOffset()).toBe(-330);
  });

  it('round-trips every local hour of a day back to the same key', () => {
    for (let hour = 4; hour < 28; hour++) {
      expect(dayKey(atLocalHour(INSTALL_KEY, hour))).toBe(INSTALL_KEY);
    }
  });

  it('starts a day key at 4am local, not midnight', () => {
    const start = new Date(startOfDayKey(INSTALL_KEY));
    expect(start.getHours()).toBe(4);
    expect(start.getMinutes()).toBe(0);
  });

  it('puts a 1am cigarette on the previous evening (NFR3)', () => {
    // The whole point of the 4am boundary: a smoke at 1am belongs to the night
    // that is still going, not to the day that just started on the calendar.
    const oneAm = atLocalHour(INSTALL_KEY, 25);
    expect(new Date(oneAm).getHours()).toBe(1);
    expect(dayKey(oneAm)).toBe(INSTALL_KEY);

    // ...and 4am the same morning has already rolled over.
    const fourAm = atLocalHour(INSTALL_KEY + 1, 4);
    expect(new Date(fourAm).getHours()).toBe(4);
    expect(dayKey(fourAm)).toBe(INSTALL_KEY + 1);
    expect(dayKey(fourAm - 1)).toBe(INSTALL_KEY);
  });

  it('rejects hours outside the day-key window rather than silently sliding', () => {
    expect(() => atLocalHour(INSTALL_KEY, 3)).toThrow();
    expect(() => atLocalHour(INSTALL_KEY, 28)).toThrow();
  });
});
