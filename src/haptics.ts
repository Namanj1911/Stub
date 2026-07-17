// Haptics vocabulary — BACKLOG P2 round 2. One semantic mapping applied
// app-wide so feel is consistent, not per-screen. Screens import these
// verbs, never expo-haptics directly.
//
//   logged      light impact          something entered the log
//   select      selection tick        a choice or value changed
//   destructive warning notification  deletes / resets
//   emergency   medium impact         SOS entry points — heavier than a log tap
//   survived    success notification  craving outlasted

import * as Haptics from 'expo-haptics';

export const haptic = {
  logged: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  select: () => Haptics.selectionAsync(),
  destructive: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  emergency: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  survived: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
