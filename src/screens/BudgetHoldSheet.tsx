// The budget-holding sheet: a bottom sheet that rises the moment a logged
// cigarette holds the budget flat that was about to step down (domain
// budgetHoldOnLog, fired in store.addEntry). Its whole reason to exist is
// honesty — the adaptive budget follows the 7-day average down, so when the
// average stops falling the number goes flat, and without a word for it that
// flat number reads as a broken promise. This names the moment instead of
// letting the user discover it as a bug.
//
// Rendered once at the app root (App.tsx), not per screen, so it can appear
// over whatever tab the user logged from. Everything it needs is frozen into
// the `notice` payload at log time, so its copy can't drift as more is logged.
//
// Built on RN's Animated + Modal rather than a sheet library: no reanimated or
// gesture-handler in the tree (Expo Go SDK 54 constraint), and the motion here
// is a single spring, not a draggable sheet.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { haptic } from '../haptics';
import type { HoldNotice } from '../store';
import { budgetHoldCopy } from '../strings';
import { color, font, radius, space } from '../theme';

export function BudgetHoldSheet({
  notice,
  onDismiss,
}: {
  notice: HoldNotice | null;
  onDismiss: () => void;
}) {
  const { height } = useWindowDimensions();
  // Start off-screen; the entrance springs it to 0. Backdrop fades in parallel.
  const translateY = useRef(new Animated.Value(height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const visible = notice != null;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(height);
    backdrop.setValue(0);
    haptic.select();
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }),
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, height]);

  // Slide out, then clear the store's pending notice at the end so the content
  // stays mounted through the exit animation.
  const close = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss();
    });
  };

  if (!visible) return null;
  const text = budgetHoldCopy(notice.budget, notice.wouldHaveBeen);

  return (
    <Modal visible transparent statusBarTranslucent onRequestClose={close} animationType="none">
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            ...StyleSheetAbsolute,
            backgroundColor: '#000',
            opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
          }}
        >
          {/* tapping the dimmed area outside the card dismisses too */}
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Dismiss" />
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ translateY }],
            backgroundColor: color.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderTopWidth: 1,
            borderColor: color.divider,
            paddingHorizontal: space.s8,
            paddingTop: space.s4,
            paddingBottom: space.s8 * 2,
          }}
        >
          {/* grabber */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: radius.pill,
              backgroundColor: color.neutral700,
              marginBottom: space.s6,
            }}
          />

          {/* budget → held/would visual: the flat number, and the step it held off */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.s4, marginBottom: space.s4 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.accent300 }}>
              {text.title}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 14,
              lineHeight: 21,
              color: color.text,
              marginBottom: space.s8,
            }}
          >
            {text.body}
          </Text>

          <Pressable
            onPress={close}
            style={({ pressed }) => ({
              backgroundColor: pressed ? color.accent600 : color.accent500,
              borderRadius: radius.md,
              paddingVertical: space.s4,
              alignItems: 'center',
            })}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.accent100 }}>
              {text.cta}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Inline to avoid pulling StyleSheet in for one absolute-fill; RN treats a plain
// object the same here.
const StyleSheetAbsolute = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
