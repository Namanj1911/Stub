// The health-milestone medal (design/HEALTH_TIMELINE.md §9, gold treatment
// added on owner feedback 2026-07-19).
//
// A gold ring with a filled centre — the same circle-and-dot idiom as the
// Money tab icon, scaled up so it reads as an award rather than a bullet.
// Locked is the identical ring, hollow and grey: the shape you're playing for
// is visible from the start, it just isn't filled in yet.
//
// The three states carry the §4.1 distinction that the rest of the UI leans
// on, so they have to be tellable apart instantly:
//
//   reached — true on the live clock right now: bright gold, filled, haloed
//   earned  — banked in the record forever (§9.1): flat, dimmer metal
//   locked  — never cleared: hollow grey ring
//
// Gold is a sanctioned theme exception (see theme.ts) precisely so it can
// only ever mean "earned" — never use it for general emphasis.

import React from 'react';
import { View } from 'react-native';
import { MilestoneState } from './health';
import { color } from './theme';

export function Medal({ state, size = 18 }: { state: MilestoneState; size?: number }) {
  const locked = state === 'locked';
  const live = state === 'reached';
  const ring = locked ? color.neutral700 : live ? color.gold : color.goldDim;
  const inner = Math.round(size * 0.39);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
        // a live medal throws light; a banked one is flat metal
        ...(live
          ? {
              shadowColor: color.gold,
              shadowOpacity: 0.9,
              shadowRadius: size * 0.4,
              shadowOffset: { width: 0, height: 0 },
            }
          : null),
      }}
    >
      {!locked && (
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: ring,
          }}
        />
      )}
    </View>
  );
}
