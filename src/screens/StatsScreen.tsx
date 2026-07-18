// Stats screen — S5 time-range charts, S6 budget ring + tiles, S7 insight
// card, S8 month heatmap (shown in the Month view).

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Entry, budgetSixths, dayKey, entriesForDay, frac, totalSixths } from '../domain';
import {
  Bar,
  StatsRange,
  dayBars,
  heatCells,
  monthBars,
  pickInsight,
  tiles,
  underBudgetStreaks,
  weekBars,
} from '../stats';
import { useApp, useProfile } from '../AppContext';
import { haptic } from '../haptics';
import { ProfileButton } from '../ProfileButton';
import { useNav } from '../navigation';
import { insightCopy, streakCopy } from '../strings';
import { color, font, radius } from '../theme';
import { BRANDS } from '../brands';

export function StatsScreen() {
  const { data } = useApp();
  const profile = useProfile();
  const entries = data.entries;
  const nav = useNav();
  const [range, setRange] = useState<StatsRange>('week');

  const now = Date.now();
  const todayKey = dayKey(now);
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, profile.baselineHistory);
  const today = entriesForDay(entries, todayKey);
  const total = totalSixths(today);

  const t = tiles(
    range,
    entries,
    todayKey,
    profile.installDayKey,
    profile.baselineHistory,
    profile.priceHistory,
    now,
  );
  const insight = pickInsight(entries, todayKey, profile.installDayKey, budget, now);
  const streaks = underBudgetStreaks(entries, todayKey, profile.installDayKey, profile.baselineHistory);

  const bars =
    range === 'day'
      ? dayBars(today)
      : range === 'month'
        ? monthBars(entries, todayKey, profile.installDayKey)
        : weekBars(entries, todayKey, profile.installDayKey, budget, now);
  const chartTitle =
    range === 'day'
      ? 'Today by time of day'
      : range === 'month'
        ? 'Last 4 weeks — daily average'
        : 'This week — cigarettes per day';

  const brand = BRANDS.find((b) => b.id === profile.brandId);
  // nicotine row follows the selected range (day / 7d / 28d, like the charts)
  const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 28;
  const nicotineLabel =
    range === 'day' ? 'Nicotine today' : range === 'week' ? 'Nicotine this week' : 'Nicotine — last 4 weeks';
  const rangeSixths = (() => {
    let s = 0;
    for (let k = todayKey - rangeDays + 1; k <= todayKey; k++) {
      s += totalSixths(entriesForDay(entries, k));
    }
    return s;
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
          stats<Text style={{ color: color.accent }}>.</Text>
        </Text>
        <ProfileButton />
      </View>

      {/* segmented control (S5) */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        {(['day', 'week', 'month'] as const).map((r) => {
          const on = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => {
                haptic.select();
                setRange(r);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Show ${r} view`}
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: on ? color.accent : 'transparent',
                backgroundColor: on ? color.accentTint12 : color.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: font.medium,
                  fontSize: 13,
                  color: on ? color.accent300 : color.neutral500,
                  textTransform: 'capitalize',
                }}
              >
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* budget ring (S6) — Day only: it's a today-stat, repeating it on
          Week/Month added nothing and pushed the tiles below the fold */}
      {range === 'day' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.surface,
            borderRadius: radius.md,
            padding: 16,
            marginTop: 16,
            gap: 16,
          }}
        >
          <Ring fraction={budget > 0 ? Math.min(1, total / budget) : 0} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 24, color: color.text }}>
              {frac(total)} / {frac(budget)}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 2 }}>
              today vs adaptive budget
            </Text>
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: t.trendDown ? color.accent300 : color.neutral400,
                marginTop: 8,
              }}
            >
              {t.trendLine}
            </Text>
          </View>
        </View>
      )}

      {/* under-budget streak (BACKLOG P3) — Week/Month only: a streak is a
          multi-day stat. Unit is always days (a weekly/monthly-unit streak
          would read 0 for months). Fills the ring's slot under the segmented
          control so switching tabs keeps the layout even. "best" shows only
          when it beats current; at the record the accent color carries it
          and the line just pokes. */}
      {range !== 'day' && (
        <View
          style={{
            backgroundColor: color.surface,
            borderRadius: radius.md,
            padding: 16,
            marginTop: 16,
          }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
            Under-budget streak
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 24,
                color:
                  streaks.current > 0 && streaks.current >= streaks.best
                    ? color.accent300
                    : color.text,
              }}
            >
              {streaks.current} day{streaks.current === 1 ? '' : 's'}
            </Text>
            {streaks.best > streaks.current && (
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500 }}>
                best {streaks.best}
              </Text>
            )}
          </View>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.neutral400,
              lineHeight: 17,
              marginTop: 6,
            }}
          >
            {streakCopy(streaks.current, streaks.best)}
          </Text>
        </View>
      )}

      {/* bar chart (S5) */}
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 24, marginBottom: 10 }}>
        {chartTitle}
      </Text>
      {/* key by range so switching Day/Week/Month clears the selection */}
      <BarChart bars={bars} key={range} />

      {/* tiles (S6) — the set adapts to the selected range */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
        {t.tiles.map((tile) => (
          <Tile key={tile.label} label={tile.label} value={tile.value} accent={tile.accent} />
        ))}
      </View>

      {/* month heatmap (S8) */}
      {range === 'month' && (
        <>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 24, marginBottom: 10 }}>
            Last 28 days
          </Text>
          <Heatmap entries={entries} todayKey={todayKey} installDayKey={profile.installDayKey} budget={budget} />
        </>
      )}

      {/* nicotine intake for the selected range (S19) → nicotine database (S18) */}
      <Pressable
        onPress={() => nav.navigate('Nicotine')}
        accessibilityRole="button"
        accessibilityLabel={`${nicotineLabel} — open brands`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: pressed ? color.accentTint10 : color.surface,
          borderRadius: radius.md,
          padding: 16,
          marginTop: 8,
        })}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
            {nicotineLabel}
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text, marginTop: 2 }}>
            {brand ? `~${Math.round((rangeSixths / 6) * brand.nicotineMg)} mg` : 'pick your brand'}
          </Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300 }}>
          brands →
        </Text>
      </Pressable>

      {/* insight card (S7) */}
      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: color.accent,
          backgroundColor: color.surface,
          borderTopRightRadius: radius.md,
          borderBottomRightRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginTop: 24,
        }}
      >
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral300, lineHeight: 19 }}>
          {insightCopy(insight)}
        </Text>
      </View>
    </ScrollView>
  );
}

function Ring({ fraction }: { fraction: number }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110">
      <Circle cx={55} cy={55} r={r} stroke={color.neutral900} strokeWidth={8} fill="none" />
      <Circle
        cx={55}
        cy={55}
        r={r}
        stroke={color.accent}
        strokeWidth={8}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(fraction * circ).toFixed(1)} ${circ.toFixed(1)}`}
        transform="rotate(-90 55 55)"
      />
    </Svg>
  );
}

// Values reveal on touch (Apple Fitness pattern): tap a bar to see its
// number and highlight it; tap again to dismiss.
function BarChart({ bars }: { bars: Bar[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140 }}>
      {bars.map((b, i) => {
        const on = selected === i;
        const dimmed = selected != null && !on;
        return (
          <Pressable
            key={i}
            onPress={() => {
              haptic.select();
              setSelected(on ? null : i);
            }}
            accessibilityRole="button"
            // bar values are visually tap-to-reveal; VoiceOver gets them up front
            accessibilityLabel={`${b.label}: ${b.val}`}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
          >
            {/* kept in layout at opacity 0 so bars don't jump when revealed */}
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 11,
                color: color.accent300,
                marginBottom: 4,
                opacity: on ? 1 : 0,
              }}
            >
              {b.val}
            </Text>
            <View
              style={{
                alignSelf: 'stretch',
                height: `${b.h * 0.75}%`,
                borderRadius: radius.sm,
                backgroundColor: b.accent ? color.accent500 : color.neutral800,
                opacity: dimmed ? 0.45 : 1,
                borderWidth: on ? 1 : 0,
                borderColor: color.accent,
              }}
            />
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 10,
                color: on ? color.accent300 : color.neutral500,
                marginTop: 6,
              }}
            >
              {b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View
      style={{
        flexBasis: '48%',
        flexGrow: 1,
        backgroundColor: color.surface,
        borderRadius: radius.md,
        padding: 16,
      }}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>{label}</Text>
      <Text
        style={{
          fontFamily: font.medium,
          fontSize: 26,
          color: accent ? color.accent300 : color.text,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const HEAT_COLOR = {
  none: 'transparent',
  low: color.neutral900,
  mid: color.accent900,
  high: color.accent700,
  over: color.accent500,
} as const;

function Heatmap(props: { entries: Entry[]; todayKey: number; installDayKey: number; budget: number }) {
  const cells = heatCells(props.entries, props.todayKey, props.installDayKey, props.budget);
  // explicit rows of 7 — percentage-based wrapping breaks rows unevenly and
  // leaves ragged vertical space
  const rows = [0, 1, 2, 3].map((r) => cells.slice(r * 7, r * 7 + 7));
  return (
    <View>
      <View style={{ gap: 6 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 6 }}>
            {row.map((c) => (
              <View
                key={c.key}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: radius.sm,
                  backgroundColor: HEAT_COLOR[c.color],
                  borderWidth: c.color === 'none' ? 1 : 0,
                  borderColor: color.neutral900,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 10, color: color.neutral500 }}>less</Text>
        {(['low', 'mid', 'high', 'over'] as const).map((k) => (
          <View key={k} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: HEAT_COLOR[k] }} />
        ))}
        <Text style={{ fontFamily: font.regular, fontSize: 10, color: color.neutral500 }}>more</Text>
      </View>
    </View>
  );
}
