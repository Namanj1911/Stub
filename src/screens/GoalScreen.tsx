// Goal screen — S10 quit date + glide path. This is the *narrative* screen:
// where the taper is going, and (once the timeline lands) what the body gets
// for it. Configuration lives on Profile — the S9 pace picker moved there,
// and S11's tomorrow's-budget moved to Log. See design/HEALTH_TIMELINE.md §5.
//
// The plan card sits on the deep-indigo section ground with a radial glow
// (the only place that ground is used, per the design system).

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import {
  baselineSixthsFor,
  budgetSixths,
  currentPlanRate,
  dayKey,
  frac,
  quitDateAtRate,
  trailing7Totals,
  weeksToQuitAtRate,
} from '../domain';
import { useApp, useProfile } from '../AppContext';
import { ProfileButton } from '../ProfileButton';
import { useNav } from '../navigation';
import { color, font, radius } from '../theme';

export function GoalScreen() {
  const { data } = useApp();
  const profile = useProfile();
  const nav = useNav();
  const entries = data.entries;
  const now = Date.now();
  const todayKey = dayKey(now);
  // Quit-day progress and the 7-day-average fallback measure against the
  // onboarding baseline; the budget itself follows the dated history.
  const baseline = baselineSixthsFor(profile.baselineHistory, profile.installDayKey);
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, profile.baselineHistory, profile.planHistory);
  const avg7 =
    trailing7Totals(entries, todayKey + 1, profile.installDayKey, baseline).reduce((a, b) => a + b, 0) / 7;

  // the plan's rate is canonical (§11.2) — it may not match any preset, so
  // the glide path and date read it rather than the pace label
  const rate = currentPlanRate(profile.planHistory);
  const weeks = weeksToQuitAtRate(budget, rate);
  const quit = quitDateAtRate(budget, rate, now).toLocaleDateString('en-IN', {
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

      {/* plan card (S10) — now also carries progress-to-quit-day, which used
          to be a full-width card of its own rendering a single number */}
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
        {/* the date is the second door onto the plan control (§5.3): config
            lives on Profile, but "change my quit date" has to be reachable
            where the date is actually shown */}
        <Pressable
          onPress={() => nav.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel={`Last cigarette ${quit}. Change your plan`}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text, marginTop: 4 }}>
            {quit}{' '}
            <Text style={{ fontSize: 15, color: color.accent300 }}>change</Text>
          </Text>
        </Pressable>
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
          Based on your last 7 days ({(avg7 / 6).toFixed(1)}/day), stepping down {frac(rate)} a
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
        {/* progress to quit day (S10) — folded in below the glide path it
            summarises, on a hairline divider */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: 'rgba(233, 233, 237, 0.12)',
            marginTop: 18,
            paddingTop: 14,
          }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent200 }}>
            Progress to quit day
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
            {progress}%
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
