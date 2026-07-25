import { useEffect, useRef } from 'react';

import { haptic } from './haptics';

// Hold-to-repeat for stepper buttons (Setup count/day, Profile baseline). A tap
// fires once; holding repeats after a short delay so reaching a far number
// (a pack a day, 20) isn't ~11 one-handed taps. Added from user testing
// 2026-07-26. Haptic on the initial press only — a tick per repeat would be a
// buzz storm (haptics vocabulary rule: nothing per-tick).
//
// onPress is held in a ref refreshed every render, so each repeat calls the
// LATEST callback. That is load-bearing because the two callers differ: Setup
// uses functional setState (self-correcting), but Profile's onPress reads
// profile.countPerDay from the current render's closure — a stale closure would
// set the same number every tick instead of ramping. The ref makes both ramp,
// since setCountPerDay commits a re-render well within the repeat interval.
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 90;

export function useHoldRepeat(onPress: () => void): {
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  };

  // clear timers if the button unmounts mid-hold (e.g. the step advances)
  useEffect(() => stop, []);

  const start = () => {
    haptic.select();
    onPressRef.current();
    holdTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => onPressRef.current(), REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  return { onPressIn: start, onPressOut: stop };
}
