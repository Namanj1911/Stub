// First-launch welcome — one screen, not a carousel (owner decision
// 2026-07-22): the setup flow is already disguised onboarding (each step
// teaches a concept and the plan card is the payoff), so this screen's only
// job is the thesis. Shown before setup and never again; it is deliberately
// not persisted — profile==null is the gate, and App keeps a session flag so
// a mid-setup relaunch shows it again, which costs nothing.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { color, font, radius } from '../theme';

export function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, padding: 22, paddingTop: 16 }}>
      {/* same ambient glow the plan-ready card uses, scaled to the page */}
      <Svg
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        width="100%"
        height="100%"
      >
        <Defs>
          <RadialGradient id="welcomeGlow" cx="85%" cy="8%" rx="60%" ry="45%">
            <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={color.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="85%" cy="8%" rx="60%" ry="45%" fill="url(#welcomeGlow)" />
      </Svg>

      <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
        stub<Text style={{ color: color.accent }}>.</Text>
      </Text>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.medium, fontSize: 34, lineHeight: 42, color: color.text }}>
          You don't{'\n'}quit smoking.{'\n'}
          <Text style={{ color: color.accent300 }}>You run out{'\n'}of cigarettes.</Text>
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 15,
            lineHeight: 22,
            color: color.neutral400,
            marginTop: 18,
          }}
        >
          stub gives you a daily budget and shrinks it a little every week. No cold turkey, no
          lectures — just a number quietly heading for zero.
        </Text>
      </View>

      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 12,
          lineHeight: 17,
          color: color.neutral500,
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        Setup takes a minute. Everything stays on this phone — no account, no cloud.
      </Text>
      <Pressable
        onPress={onBegin}
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: color.accent,
          borderRadius: radius.md,
          padding: 16,
          alignItems: 'center',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.bg }}>Set me up</Text>
      </Pressable>
    </View>
  );
}
