// Stats screen — S5 time-range charts, S6 budget ring + tiles, S7 insight
// card, S8 month heatmap (shown in the Month view).

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Entry, budgetSixths, dayKey, entriesForDay, frac, totalSixths } from '../domain';
import {
  Bar,
  dayBars,
  heatCells,
  monthBars,
  pickInsight,
  tiles,
  weekBars,
} from '../stats';
import { useApp, useProfile } from '../AppContext';
import { useNav } from '../navigation';
import { insightCopy } from '../strings';
import { color, font, radius } from '../theme';
import { BRANDS } from '../brands';

type Range = 'day' | 'week' | 'month';

export function StatsScreen() {
  const { data } = useApp();
  const profile = useProfile();
  const entries = data.entries;
  const nav = useNav();
  const [range, setRange] = useState<Range>('week');

  const now = Date.now();
  const todayKey = dayKey(now);
  const baseline = profile.countPerDay * 6;
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, baseline);
  const today = entriesForDay(entries, todayKey);
  const total = totalSixths(today);

  const t = tiles(entries, todayKey, profile.installDayKey, budget, now);
  const insight = pickInsight(entries, todayKey, profile.installDayKey, budget, now);

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
  const weekSixths = (() => {
    let s = 0;
    for (let k = todayKey - 6; k <= todayKey; k++) s += totalSixths(entriesForDay(entries, k));
    return s;
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
        stats<Text style={{ color: color.accent }}>.</Text>
      </Text>

      {/* segmented control (S5) */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        {(['day', 'week', 'month'] as const).map((r) => {
          const on = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
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

      {/* budget ring (S6) */}
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

      {/* bar chart (S5) */}
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 24, marginBottom: 10 }}>
        {chartTitle}
      </Text>
      <BarChart bars={bars} />

      {/* tiles (S6) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
        <Tile label="Daily average (7d)" value={t.avg7} />
        <Tile label="vs last week" value={t.vsLastWeek} accent={t.trendDown} />
        <Tile label="Days under budget" value={t.underBudget} />
        <Tile label="Longest gap today" value={t.longestGap} />
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

      {/* weekly nicotine intake (S19) → nicotine database (S18) */}
      <Pressable
        onPress={() => nav.navigate('Nicotine')}
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
            Nicotine this week
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text, marginTop: 2 }}>
            {brand ? `~${Math.round((weekSixths / 6) * brand.nicotineMg)} mg` : 'pick your brand'}
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

function BarChart({ bars }: { bars: Bar[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140 }}>
      {bars.map((b, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <Text style={{ fontFamily: font.regular, fontSize: 10, color: color.neutral500, marginBottom: 4 }}>
            {b.val}
          </Text>
          <View
            style={{
              alignSelf: 'stretch',
              height: `${b.h * 0.75}%`,
              borderRadius: radius.sm,
              backgroundColor: b.accent ? color.accent500 : color.neutral800,
            }}
          />
          <Text style={{ fontFamily: font.regular, fontSize: 10, color: color.neutral600, marginTop: 6 }}>
            {b.label}
          </Text>
        </View>
      ))}
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
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {cells.map((c) => (
          <View
            key={c.key}
            style={{
              width: '12%',
              flexGrow: 1,
              flexBasis: '12%',
              maxWidth: '13.4%',
              aspectRatio: 1,
              borderRadius: radius.sm,
              backgroundColor: HEAT_COLOR[c.color],
              borderWidth: c.color === 'none' ? 1 : 0,
              borderColor: color.neutral900,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 10, color: color.neutral600 }}>less</Text>
        {(['low', 'mid', 'high', 'over'] as const).map((k) => (
          <View key={k} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: HEAT_COLOR[k] }} />
        ))}
        <Text style={{ fontFamily: font.regular, fontSize: 10, color: color.neutral600 }}>more</Text>
      </View>
    </View>
  );
}
