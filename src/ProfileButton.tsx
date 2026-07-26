// Profile / settings entry point — lives top-right in every tab screen's
// header (user decision 2026-07-17: the "profile →" text link was too hidden).
// Redesigned 2026-07-26 (fresh-eyes UX finding #5): it used to be a ~24px
// person-mark in neutral500 that testers didn't clock as settings — yet pace,
// brand, data export and reset all live behind it. Now a settings gear, larger
// (22px) and brighter (neutral300), so it reads as "the knobs are here".

import React from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNav } from './navigation';
import { color } from './theme';

export function ProfileButton() {
  const nav = useNav();
  return (
    <Pressable
      onPress={() => nav.navigate('Profile')}
      hitSlop={12}
      accessibilityLabel="Open profile and settings"
      accessibilityRole="button"
      style={{ alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}
    >
      {({ pressed }) => (
        <Feather name="settings" size={22} color={pressed ? color.accent : color.neutral300} />
      )}
    </Pressable>
  );
}
