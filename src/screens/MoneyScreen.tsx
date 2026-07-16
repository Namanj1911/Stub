// Money saved — S21, per the 2f mockup. Savings = (baseline − actual) × stick
// price, valued through the dated histories (BACKLOG P1): each smoke at the
// price in effect when it was lit, each day's avoided smokes at that day's
// baseline and ending price. Deliberately approximate — pack MRP, never the
// user's street price.

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { DATASET_AS_OF, brandInfo } from '../brands';
import {
  PACE_RATE,
  baselineSixthsFor,
  budgetSixths,
  computeSavings,
  dayKey,
  quitDate,
  weeksToQuit,
} from '../domain';
import { copy } from '../strings';
import { useApp, useProfile } from '../AppContext';
import { color, font, radius } from '../theme';

const GOA_FLIGHT = 4500; // ₹, one way — aspirational goal from the 2f mockup

const inr = (n: number) => Math.abs(Math.round(n)).toLocaleString('en-IN');
// negative savings display honestly (roast, not clamp) — '−₹84'
const inrSigned = (n: number) => (n < 0 ? '−₹' : '₹') + inr(n);

export function MoneyScreen() {
  const { data } = useApp();
  const profile = useProfile();
  const entries = data.entries;

  const price = profile.pricePerStick; // current, for projections + header
  const now = Date.now();
  const todayKey = dayKey(now);
  const baseline = profile.countPerDay * 6; // current baseline, for projections
  const perSixth = price / 6;

  const { saved, savedWeek } = computeSavings(
    entries,
    profile.baselineHistory,
    profile.priceHistory,
    profile.installDayKey,
    todayKey,
  );
  const daysIn = todayKey - profile.installDayKey + 1;

  // Goa flight goal
  const pct = Math.max(0, Math.min(100, (saved / GOA_FLIGHT) * 100));
  const weeklyRate = daysIn >= 7 ? savedWeek : (saved / daysIn) * 7;
  const weeksAway = saved >= GOA_FLIGHT ? 0 : weeklyRate > 0 ? Math.ceil((GOA_FLIGHT - saved) / weeklyRate) : null;
  const goaLine =
    weeksAway === 0
      ? `${inrSigned(saved)} of ₹${inr(GOA_FLIGHT)} — covered. Book it.`
      : weeksAway != null
        ? `${inrSigned(saved)} of ₹${inr(GOA_FLIGHT)} — about ${weeksAway} week${weeksAway === 1 ? '' : 's'} away at this pace.`
        : `${inrSigned(saved)} of ₹${inr(GOA_FLIGHT)}.`;

  // projections: budget tapers weekly from here to zero. The budget's
  // pre-install fallback is the onboarding baseline, not today's.
  const budget = budgetSixths(
    entries,
    todayKey,
    profile.installDayKey,
    baselineSixthsFor(profile.baselineHistory, profile.installDayKey),
  );
  const rate = PACE_RATE[profile.pace];
  const weeks = weeksToQuit(budget, profile.pace);
  let byQuitDay = saved;
  for (let w = 0; w < weeks; w++) {
    byQuitDay += (baseline - Math.max(0, budget - rate * w)) * perSixth * 7;
  }
  const quitDay = quitDate(budget, profile.pace, now).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  const oneYear = profile.countPerDay * price * 365;
  const flights = Math.floor(oneYear / GOA_FLIGHT);
  const brand = brandInfo(profile.brandId, profile.customBrandName);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
    >
      <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
        Back in your pocket<Text style={{ color: color.accent }}>.</Text>
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 2 }}>
        vs your {profile.countPerDay}-a-day baseline
        {brand ? ` · ${brand.label} at ${brand.estimated ? '~' : ''}₹${price}` : ` · ~₹${price} a stick`}
      </Text>

      {/* hero card */}
      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: color.section,
          padding: 22,
          marginTop: 18,
          overflow: 'hidden',
        }}
      >
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          width="100%"
          height="100%"
        >
          <Defs>
            <RadialGradient id="moneyGlow" cx="80%" cy="0%" rx="70%" ry="80%">
              <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={color.section} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="80%" cy="0%" rx="70%" ry="80%" fill="url(#moneyGlow)" />
        </Svg>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: color.neutral400,
          }}
        >
          Saved since you started
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 44, letterSpacing: -1, color: color.text, marginTop: 6 }}>
          {inrSigned(saved)}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300, marginTop: 4 }}>
          {inrSigned(savedWeek)} this week · {daysIn} day{daysIn === 1 ? '' : 's'} in
        </Text>
        {saved < 0 && (
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral400, marginTop: 8, lineHeight: 17 }}>
            {copy('moneyBehind')}
          </Text>
        )}
      </View>

      {/* Goa flight goal */}
      <View
        style={{
          backgroundColor: color.surface,
          borderRadius: radius.lg,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginTop: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral400 }}>
            Goa flight, one way
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.accent300 }}>
            {Math.round(pct)}%
          </Text>
        </View>
        <View
          style={{
            height: 6,
            borderRadius: radius.pill,
            backgroundColor: color.neutral900,
            marginTop: 10,
            overflow: 'hidden',
          }}
        >
          <View style={{ width: `${pct}%`, height: 6, backgroundColor: color.accent }} />
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 8 }}>
          {goaLine}
        </Text>
      </View>

      {/* projections */}
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 12,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: color.neutral500,
          marginTop: 16,
        }}
      >
        If you stay on plan
      </Text>
      <View style={{ gap: 8, marginTop: 10 }}>
        <ProjectionRow value={`₹${inr(byQuitDay)}`}>
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: color.text }}>
            By quit day <Text style={{ fontSize: 12, color: color.neutral500 }}>· {quitDay}</Text>
          </Text>
        </ProjectionRow>
        <ProjectionRow value={`₹${inr(oneYear)}`}>
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: color.text }}>
            One year smoke-free
          </Text>
        </ProjectionRow>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: color.surface,
            borderWidth: 1,
            borderColor: color.neutral800,
            borderRadius: radius.md,
            paddingVertical: 13,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: color.neutral300 }}>
            That's an iPhone. Or {flights} Goa flights.
          </Text>
          <Text style={{ fontSize: 16 }}>✈️</Text>
        </View>
      </View>

      <Text style={{ fontFamily: font.regular, fontSize: 11, color: color.neutral600, marginTop: 24 }}>
        Savings = (baseline − actual) × your brand's MRP per stick, updated daily. Baseline and
        brand changes count from when you made them — history keeps its old numbers. MRPs as of{' '}
        {DATASET_AS_OF}.
      </Text>
    </ScrollView>
  );
}

function ProjectionRow({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: color.surface,
        borderRadius: radius.md,
        paddingVertical: 13,
        paddingHorizontal: 16,
      }}
    >
      {children}
      <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>{value}</Text>
    </View>
  );
}
