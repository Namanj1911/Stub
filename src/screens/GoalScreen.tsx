// Goal screen — S9 pace picker, S10 quit date + glide path, S11 tomorrow's
// budget. The plan card sits on the deep-indigo section ground with a radial
// glow (the only place that ground is used, per the design system).

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import {
  PACE_RATE,
  Pace,
  baselineSixthsFor,
  budgetSixths,
  dayKey,
  frac,
  quitDate,
  tomorrowBudgetSixths,
  trailing7Totals,
  weeksToQuit,
} from '../domain';
import { useApp, useProfile } from '../AppContext';
import { haptic } from '../haptics';
import { ProfileButton } from '../ProfileButton';
import { color, font, radius } from '../theme';

const PACES: { id: Pace; name: string; rate: string; desc: string }[] = [
  { id: 'chill', name: 'Chill', rate: '−¼ a week', desc: 'Barely feel it. Slow and certain.' },
  { id: 'steady', name: 'Steady', rate: '−½ a week', desc: 'The sweet spot for most people.' },
  { id: 'beast', name: 'Beast', rate: '−1 a week', desc: 'Aggressive. For the impatient.' },
];

const PACE_LABEL: Record<Pace, string> = { chill: '¼', steady: '½', beast: '1' };

export function GoalScreen() {
  const { data, setPace } = useApp();
  const profile = useProfile();
  const entries = data.entries;
  const now = Date.now();
  const todayKey = dayKey(now);
  // Budget's pre-install fallback and quit-day progress measure against the
  // onboarding baseline; profile edits only redate the money math.
  const baseline = baselineSixthsFor(profile.baselineHistory, profile.installDayKey);
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, baseline);
  const avg7 =
    trailing7Totals(entries, todayKey + 1, profile.installDayKey, baseline).reduce((a, b) => a + b, 0) / 7;

  const pace = profile.pace;
  const rate = PACE_RATE[pace];
  const weeks = weeksToQuit(budget, pace);
  const quit = quitDate(budget, pace, now).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // glide path: weekly budgets to zero, max 8 bars, final bar "zero"
  const nBars = Math.min(8, weeks + 1);
  const glide = Array.from({ length: nBars }, (_, i) => {
    const v = Math.max(0, budget - rate * i);
    return {
      label: i === 0 ? 'now' : 'w' + i,
      val: v === 0 ? 'zero' : (v / 6).toFixed(1),
      h: Math.max(3, (v / budget) * 100),
      color: i === 0 ? color.accent500 : v === 0 ? color.accent300 : color.neutral800,
    };
  });

  const progress = Math.min(100, Math.max(0, Math.round((1 - budget / baseline) * 100)));
  const tomorrow = tomorrowBudgetSixths(budget, pace);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
          goal<Text style={{ color: color.accent }}>.</Text>
        </Text>
        <ProfileButton />
      </View>

      {/* pace picker (S9) */}
      <Text style={{ fontFamily: font.medium, fontSize: 17, color: color.text, marginTop: 20 }}>
        Your pace
      </Text>
      <View style={{ gap: 8, marginTop: 12 }}>
        {PACES.map((p) => {
          const selected = pace === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                haptic.select();
                setPace(p.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Set pace to ${p.name}, ${p.rate}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: selected ? color.accentTint10 : color.surface,
                borderWidth: 1,
                borderColor: selected ? color.accent : color.neutral800,
                borderRadius: radius.md,
                padding: 14,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
                  {p.name}{' '}
                  <Text style={{ color: selected ? color.accent300 : color.neutral500, fontSize: 13 }}>
                    {p.rate}
                  </Text>
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 2 }}>
                  {p.desc}
                </Text>
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral400 }}>
                {weeksToQuit(budget, p.id)} wks
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* plan card (S10) */}
      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: color.section,
          padding: 18,
          marginTop: 24,
          overflow: 'hidden',
        }}
      >
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          width="100%"
          height="100%"
        >
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="0%" rx="80%" ry="90%">
              <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={color.section} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="0%" rx="80%" ry="90%" fill="url(#glow)" />
        </Svg>

        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: color.accent300,
          }}
        >
          Last cigarette
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text, marginTop: 4 }}>
          {quit}
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 13,
            color: color.accent200,
            lineHeight: 19,
            marginTop: 10,
            opacity: 0.9,
          }}
        >
          Based on your last 7 days ({(avg7 / 6).toFixed(1)}/day), stepping down {PACE_LABEL[pace]} a
          week gets you to zero in {weeks} weeks. No cold turkey, no drama.
        </Text>

        {/* glide path */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100, marginTop: 18 }}>
          {glide.map((b, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <Text style={{ fontFamily: font.regular, fontSize: 9, color: color.accent300, marginBottom: 3 }}>
                {b.val}
              </Text>
              <View
                style={{
                  alignSelf: 'stretch',
                  height: `${b.h * 0.7}%`,
                  minHeight: 2,
                  borderRadius: radius.sm,
                  backgroundColor: b.color,
                }}
              />
              <Text style={{ fontFamily: font.regular, fontSize: 9, color: color.accent400, marginTop: 4 }}>
                {b.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* progress to quit day (S10) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: color.surface,
          borderRadius: radius.md,
          padding: 16,
          marginTop: 16,
        }}
      >
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral400 }}>
          Progress to quit day
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.accent300 }}>
          {progress}%
        </Text>
      </View>

      {/* tomorrow's budget (S11) */}
      <View
        style={{
          backgroundColor: color.surface,
          borderRadius: radius.md,
          padding: 16,
          marginTop: 8,
        }}
      >
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
          Tomorrow's budget
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text, marginTop: 4 }}>
          {frac(tomorrow)}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 4 }}>
          we'll nudge you at 80%
        </Text>
      </View>
    </ScrollView>
  );
}
