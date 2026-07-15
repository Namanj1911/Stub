// Money saved — S21, per the 2f mockup. Savings = (baseline − actual) × stick
// price, updated daily. Users who set up before the price step existed get an
// inline price stepper instead of silent wrong math.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { BRANDS } from '../brands';
import {
  Entry,
  PACE_RATE,
  budgetSixths,
  dayKey,
  entriesForDay,
  quitDate,
  totalSixths,
  weeksToQuit,
} from '../domain';
import { Profile } from '../store';
import { color, font, radius } from '../theme';

const GOA_FLIGHT = 4500; // ₹, one way — aspirational goal from the 2f mockup

const inr = (n: number) => Math.round(n).toLocaleString('en-IN');

export function MoneyScreen({
  profile,
  entries,
  setPricePerStick,
}: {
  profile: Profile;
  entries: Entry[];
  setPricePerStick: (p: number) => void;
}) {
  if (profile.pricePerStick == null) {
    return <SetPrice setPricePerStick={setPricePerStick} />;
  }

  const price = profile.pricePerStick;
  const now = Date.now();
  const todayKey = dayKey(now);
  const baseline = profile.countPerDay * 6; // sixths/day
  const perSixth = price / 6;

  // cumulative daily savings since install (today counts as it stands)
  let saved = 0;
  let savedWeek = 0;
  for (let k = profile.installDayKey; k <= todayKey; k++) {
    const daySaved = (baseline - totalSixths(entriesForDay(entries, k))) * perSixth;
    saved += daySaved;
    if (k > todayKey - 7) savedWeek += daySaved;
  }
  const daysIn = todayKey - profile.installDayKey + 1;

  // Goa flight goal
  const pct = Math.max(0, Math.min(100, (saved / GOA_FLIGHT) * 100));
  const weeklyRate = daysIn >= 7 ? savedWeek : (saved / daysIn) * 7;
  const weeksAway = saved >= GOA_FLIGHT ? 0 : weeklyRate > 0 ? Math.ceil((GOA_FLIGHT - saved) / weeklyRate) : null;
  const goaLine =
    weeksAway === 0
      ? `₹${inr(saved)} of ₹${inr(GOA_FLIGHT)} — covered. Book it.`
      : weeksAway != null
        ? `₹${inr(saved)} of ₹${inr(GOA_FLIGHT)} — about ${weeksAway} week${weeksAway === 1 ? '' : 's'} away at this pace.`
        : `₹${inr(saved)} of ₹${inr(GOA_FLIGHT)}.`;

  // projections: budget tapers weekly from here to zero
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, baseline);
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
  const brand = BRANDS.find((b) => b.id === profile.brandId);

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
        {brand ? ` · ${brand.name} ${brand.variant} at ₹${price}` : ` · ₹${price} a stick`}
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
          ₹{inr(saved)}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300, marginTop: 4 }}>
          ₹{inr(savedWeek)} this week · {daysIn} day{daysIn === 1 ? '' : 's'} in
        </Text>
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
        Savings = (baseline − actual) × your stick price, updated daily.
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

// One-time prompt for profiles created before onboarding collected price.
function SetPrice({ setPricePerStick }: { setPricePerStick: (p: number) => void }) {
  const [price, setPrice] = React.useState(18);
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, padding: 22 }}>
      <Text style={{ fontFamily: font.medium, fontSize: 30, lineHeight: 37, color: color.text, marginTop: 36 }}>
        What's one stick{'\n'}costing you?
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.neutral500, marginTop: 10 }}>
        Loose or from a pack — the average price you actually pay. This unlocks your savings.
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 38 }}>
        <PriceButton label="−" onPress={() => setPrice((p) => Math.max(5, p - 1))} />
        <View style={{ alignItems: 'center', minWidth: 130 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 64, color: color.text }}>₹{price}</Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: color.neutral500,
              marginTop: 6,
            }}
          >
            per stick
          </Text>
        </View>
        <PriceButton label="+" onPress={() => setPrice((p) => Math.min(60, p + 1))} />
      </View>
      <Pressable
        onPress={() => setPricePerStick(price)}
        style={({ pressed }) => ({
          backgroundColor: color.accent,
          borderRadius: radius.md,
          padding: 16,
          alignItems: 'center',
          marginTop: 38,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.bg }}>
          Show me the money
        </Text>
      </Pressable>
    </View>
  );
}

function PriceButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: pressed ? color.accent : color.neutral800,
        backgroundColor: color.surface,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 24, color: color.text, lineHeight: 28 }}>
        {label}
      </Text>
    </Pressable>
  );
}
