// Persistent profile entry point — lives top-right in every tab screen's
// header (user decision 2026-07-17: the "profile →" text link was too
// hidden). A person-mark in the tab icons' geometric outline family:
// head circle over a shoulders arc, 1.5px strokes.

import React from 'react';
import { Pressable, View } from 'react-native';
import { useNav } from './navigation';
import { color } from './theme';

export function ProfileButton() {
  const nav = useNav();
  return (
    <Pressable
      onPress={() => nav.navigate('Profile')}
      hitSlop={12}
      accessibilityLabel="Open profile"
      accessibilityRole="button"
      style={{ alignItems: 'center', justifyContent: 'flex-end', width: 24, height: 24 }}
    >
      {({ pressed }) => {
        const stroke = pressed ? color.accent : color.neutral500;
        return (
          <>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 4.5,
                borderWidth: 1.5,
                borderColor: stroke,
                marginBottom: 1,
              }}
            />
            <View
              style={{
                width: 17,
                height: 8,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderWidth: 1.5,
                borderBottomWidth: 0,
                borderColor: stroke,
              }}
            />
          </>
        );
      }}
    </Pressable>
  );
}
