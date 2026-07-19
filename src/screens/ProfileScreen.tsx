// Profile — BACKLOG P1 (design settled 2026-07-17). Edits are effective-dated:
// count/day applies from today's day key, brand switches re-price from this
// moment. History is never rewritten, so money-saved stays honest. Also home
// to the local-first escape hatches: export (the only backup until cloud
// sync exists) and the confirm-guarded full reset.

import React from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useApp, useProfile } from '../AppContext';
import { brandInfo } from '../brands';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  PACE_RATE,
  Pace,
  budgetSixths,
  currentPlanRate,
  dayKey,
  paceForRate,
  quitDateAtRate,
  rateForTarget,
  weeksToQuitAtRate,
} from '../domain';
import { haptic } from '../haptics';
import { useNav } from '../navigation';
import { copy } from '../strings';
import { color, font, radius } from '../theme';

const PACE_LABEL: { id: Pace; name: string; rate: string }[] = [
  { id: 'chill', name: 'Chill', rate: '−½/wk' },
  { id: 'steady', name: 'Steady', rate: '−1/wk' },
  { id: 'beast', name: 'Beast', rate: '−2/wk' },
];

export function ProfileScreen() {
  const { data, setCountPerDay, setPace, setPlanRate, resetAll } = useApp();
  const profile = useProfile();
  const nav = useNav();
  const [picking, setPicking] = React.useState(false);
  const brand = brandInfo(profile.brandId, profile.customBrandName);
  const now = Date.now();
  const todayKey = dayKey(now);
  // The plan lives only here (it used to be duplicated on Goal), so this
  // control carries the weeks-to-quit comparison Goal's picker used to show.
  const budget = budgetSixths(
    data.entries,
    todayKey,
    profile.installDayKey,
    profile.baselineHistory,
    profile.planHistory,
  );
  // Rate is canonical; the presets and the date are two doors onto it (§11.2).
  const rate = currentPlanRate(profile.planHistory);
  const activePreset = paceForRate(rate);
  const target = quitDateAtRate(budget, rate, now);

  // A date sets the rate that reaches zero by then. Too-soon dates are
  // allowed and roasted rather than blocked (§11.3) — the floor is the
  // steepest rate that still leaves a week of taper.
  const pickDate = (date: Date) => {
    setPicking(false);
    haptic.select();
    setPlanRate(rateForTarget(budget, todayKey, dayKey(date.getTime())));
  };

  const exportData = () => {
    Share.share({
      title: 'stub data',
      message: JSON.stringify(data, null, 2),
    }).catch(() => {});
  };

  const confirmReset = () => {
    Alert.alert(copy('resetTitle'), copy('resetBody'), [
      { text: 'Keep my data', style: 'cancel' },
      {
        text: copy('resetConfirm'),
        style: 'destructive',
        onPress: () => {
          haptic.destructive();
          resetAll();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 22, paddingTop: 16, paddingBottom: 40 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} accessibilityLabel="Back">
          <Text style={{ fontSize: 18, color: color.neutral500 }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
          profile<Text style={{ color: color.accent }}>.</Text>
        </Text>
      </View>

      {/* baseline (effective-dated) */}
      <SectionLabel>Your baseline</SectionLabel>
      <View
        style={{
          backgroundColor: color.surface,
          borderRadius: radius.md,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral400 }}>
              Smokes a day
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 32, color: color.text, marginTop: 2 }}>
              {profile.countPerDay}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <RoundButton
              label="−"
              accessibilityLabel="Decrease smokes a day"
              onPress={() => setCountPerDay(Math.max(1, profile.countPerDay - 1))}
            />
            <RoundButton
              label="+"
              accessibilityLabel="Increase smokes a day"
              onPress={() => setCountPerDay(Math.min(40, profile.countPerDay + 1))}
            />
          </View>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 10, lineHeight: 17 }}>
          {copy('baselineNote')}
        </Text>
      </View>

      {/* brand */}
      <SectionLabel>Your cigarette</SectionLabel>
      <Pressable
        onPress={() => nav.navigate('Nicotine')}
        accessibilityLabel="Change your brand"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: pressed ? color.accentTint10 : color.surface,
          borderRadius: radius.md,
          padding: 16,
        })}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
            {brand ? brand.label : 'No brand picked'}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 3 }}>
            {brand?.estimated ? '~' : ''}₹{profile.pricePerStick}/stick
            {brand?.estimated ? ' · dataset averages' : ' · pack MRP'} — switching re-prices from
            that moment
          </Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300 }}>
          change →
        </Text>
      </Pressable>

      {/* plan — presets and a target date are two doors onto one rate (§11) */}
      <SectionLabel>Your plan</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PACE_LABEL.map((p) => {
          const selected = activePreset === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                haptic.select();
                setPace(p.id);
              }}
              accessibilityLabel={`Set pace to ${p.name}`}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: selected ? color.accent : color.neutral800,
                backgroundColor: selected ? color.accentTint10 : color.surface,
                borderRadius: radius.md,
                paddingVertical: 12,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>
                {p.name}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 11, color: color.neutral500, marginTop: 2 }}>
                {p.rate}
              </Text>
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 11,
                  color: selected ? color.accent300 : color.neutral500,
                  marginTop: 4,
                }}
              >
                {weeksToQuitAtRate(budget, PACE_RATE[p.id])} wks
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* target date — the other door onto the same rate. Shows the date the
          current plan lands on, whether that came from a preset or a pick. */}
      <Pressable
        onPress={() => {
          haptic.select();
          setPicking(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Quit date: ${target.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}. Change it`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: pressed ? color.accentTint10 : color.surface,
          borderRadius: radius.md,
          padding: 16,
          marginTop: 8,
        })}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
            {target.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.neutral500,
              marginTop: 3,
              lineHeight: 17,
            }}
          >
            {activePreset
              ? 'Your last cigarette, at this pace. Pick a date instead and the pace follows.'
              : `Custom pace — about ${weeksToQuitAtRate(budget, rate)} weeks from today.`}
          </Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300 }}>
          change →
        </Text>
      </Pressable>
      {picking && (
        <DateTimePicker
          value={target}
          mode="date"
          display="inline"
          themeVariant="dark"
          minimumDate={new Date(now + 7 * 86_400_000)}
          accentColor={color.accent}
          onChange={(_event, date) => (date ? pickDate(date) : setPicking(false))}
        />
      )}

      {/* data */}
      <SectionLabel>Your data</SectionLabel>
      <Pressable
        onPress={exportData}
        accessibilityLabel="Export my data"
        style={({ pressed }) => ({
          backgroundColor: pressed ? color.accentTint10 : color.surface,
          borderRadius: radius.md,
          padding: 16,
        })}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
          Export everything
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 3, lineHeight: 17 }}>
          {copy('exportNote')}
        </Text>
      </Pressable>
      {/* danger-styled on purpose (see theme.ts exception 2): quiet red at
          rest, waking to full red only under the finger */}
      <Pressable
        onPress={confirmReset}
        accessibilityLabel="Reset all data"
        style={({ pressed }) => ({
          borderWidth: 1,
          borderColor: pressed ? color.danger : color.dangerBorder,
          backgroundColor: pressed ? color.dangerTint8 : 'transparent',
          borderRadius: radius.md,
          padding: 16,
          marginTop: 8,
        })}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.dangerText }}>
          Reset everything
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 3 }}>
          Burns every log to day zero — we'll ask twice, but there's no undo.
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: font.regular,
        fontSize: 12,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: color.neutral500,
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function RoundButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={8}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: pressed ? color.accent : color.neutral800,
        backgroundColor: color.bg,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 22, color: color.text, lineHeight: 26 }}>
        {label}
      </Text>
    </Pressable>
  );
}
