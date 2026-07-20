// Test runner for the pure domain modules (BACKLOG finding #11).
//
// Deliberately NOT jest-expo. Everything under test here — domain, postzero,
// notificationPlan, the push copy in strings — is plain TypeScript with no
// React Native imports; notificationPlan's only dependency on the store is an
// `import type`, which erases. Pulling in the RN transform stack would buy
// nothing and cost startup time on every run. If component or hook tests ever
// land, that is the moment to switch presets, not before.
//
// TZ IS NOT INCIDENTAL. domain.dayKey() shifts by 4 hours and then by
// getTimezoneOffset(), so every day-key in the suite depends on the zone the
// runner happens to be in — as do the notification hour gates (quiet hours,
// the 8pm evening gate). Left unset, these tests would mean something
// different on the owner's machine than in any other environment, and the
// half-hour offset is the case most likely to expose a boundary bug. Pinned to
// the zone the app is actually used in.
process.env.TZ = 'Asia/Kolkata';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
