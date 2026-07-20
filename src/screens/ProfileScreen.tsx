// Profile — BACKLOG P1 (design settled 2026-07-17). Edits are effective-dated:
// count/day applies from today's day key, brand switches re-price from this
// moment. History is never rewritten, so money-saved stays honest. Also home
// to the local-first escape hatches: export (the only backup until cloud
// sync exists) and the confirm-guarded full reset.

import React from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useApp, useProfile } from '../AppContext';
import { brandInfo } from '../brands';
import {
  PACE_RATE,
  Pace,
  budgetSixths,
  currentPlanRate,
  dayKey,
  paceForRate,
  quitDateAtRate,
  recentDailyAverageSixths,
  weeksToQuitAtRate,
} from '../domain';
import { haptic } from '../haptics';
import { useNav } from '../navigation';
import { DEFAULT_NOTIF_PREFS } from '../notificationPlan';
import { sendPreviewNotifications } from '../notifications';
import { copy } from '../strings';
import { color, font, radius } from '../theme';

const PACE_LABEL: { id: Pace; name: string; rate: string }[] = [
  { id: 'chill', name: 'Chill', rate: '−½/wk' },
  { id: 'steady', name: 'Steady', rate: '−1/wk' },
  { id: 'beast', name: 'Beast', rate: '−2/wk' },
];

export function ProfileScreen() {
  const { data, setCountPerDay, setPace, setNotifPref, resetAll, startNewTaper } = useApp();
  const prefs = data.notifPrefs ?? DEFAULT_NOTIF_PREFS;
  const profile = useProfile();
  const nav = useNav();
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
  // Rate is canonical (§11.2). A target-date picker as the second door onto
  // it was built and pulled before beta — see BACKLOG "Later". The presets
  // are the only door for now; the date below is derived, not editable.
  const rate = currentPlanRate(profile.planHistory);
  const activePreset = paceForRate(rate);
  const target = quitDateAtRate(budget, rate, now);
  // Once the budget reaches zero this control has nothing left to control.
  // `weeksToQuitAtRate` floors at max(1, …), so the presets each advertised
  // "1 wks" and the row below printed a last-cigarette date a week out — to
  // someone whose last cigarette the plan says already happened. Goal was
  // guarded against exactly this; Profile was not.
  //
  // The buttons are not merely mislabelled at zero, they are inert: a plan
  // record anchored at startBudget 0 keeps plannedBudgetFor pinned to 0, and
  // budgetSeries mins against it, so every rate produces the same zero budget
  // for ever. Rendering three dead options with invented forecasts on them is
  // worse than rendering none.
  const atZero = budget <= 0;
  // …unless the logs contradict the plan. A user at zero who is still smoking
  // was the worst case of the one-way door: every screen told them "past the
  // taper" while they smoked 20 a day, and nothing in the app could lift the
  // budget back off zero. `startNewTaper` is the exit, offered only here —
  // measured recent smoking is what decides whether to offer it, so a user who
  // genuinely stopped keeps the plain "the taper is done" card and is never
  // nudged back toward a taper they've finished.
  const smokingAgain =
    atZero && recentDailyAverageSixths(data.entries, todayKey, profile.installDayKey) > 0;

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
      {atZero ? (
        <View style={{ backgroundColor: color.surface, borderRadius: radius.md, padding: 16 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
            {copy(smokingAgain ? 'taperRestartTitle' : 'planDone')}
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.neutral500,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            {copy(smokingAgain ? 'taperRestartNote' : 'planDoneNote')}
          </Text>
          {smokingAgain ? (
            <Pressable
              onPress={() => {
                haptic.select();
                startNewTaper();
              }}
              accessibilityRole="button"
              accessibilityLabel={copy('taperRestartCta')}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderWidth: 1,
                borderColor: color.accent,
                backgroundColor: color.accentTint10,
                borderRadius: radius.md,
                paddingVertical: 12,
                marginTop: 14,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.accent300 }}>
                {copy('taperRestartCta')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
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

      {/* what the chosen pace actually means, in a date. Read-only: the
          presets are the control, and a date the user can't edit can't
          become a deadline they feel they're failing. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: color.surface,
          borderRadius: radius.md,
          padding: 16,
          marginTop: 8,
        }}
      >
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral400 }}>
          Last cigarette, at this pace
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
          {target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
        </>
      )}

      {/* notifications (SPEC S15/S17 AC: each category is togglable) */}
      <SectionLabel>Nudges</SectionLabel>
      <View style={{ backgroundColor: color.surface, borderRadius: radius.md, padding: 16, gap: 16 }}>
        <ToggleRow
          label="Budget check"
          note="A poke 45 minutes after you've spent 80% of the day's budget."
          on={prefs.budget}
          onToggle={(v) => setNotifPref('budget', v)}
        />
        <View style={{ height: 1, backgroundColor: color.neutral900 }} />
        <ToggleRow
          label="Milestones"
          note="First day under budget, first smoke-free day, streaks worth mentioning. Arrives the next morning."
          on={prefs.milestones}
          onToggle={(v) => setNotifPref('milestones', v)}
        />
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, lineHeight: 17 }}>
          {copy('notifNote')}
        </Text>
        {/* The real triggers are a 45-minute wait and 9am tomorrow, so this is
            the only way to watch one actually arrive. Stripped from release
            builds by __DEV__. */}
        {__DEV__ ? (
          <Pressable
            onPress={async () => {
              haptic.select();
              const ok = await sendPreviewNotifications();
              Alert.alert(
                ok ? 'Sample sent' : 'Notifications are off',
                ok
                  ? 'Two samples land in about 10 seconds. Background the app to see them on the lock screen.'
                  : 'Permission was denied, so nothing can be delivered. Turn it on in iOS Settings → Stub.',
              );
            }}
            accessibilityLabel="Send sample notifications"
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: pressed ? color.accent : color.neutral800,
              borderRadius: radius.md,
              paddingVertical: 10,
              alignItems: 'center',
            })}
          >
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.accent300 }}>
              send a sample (dev only)
            </Text>
          </Pressable>
        ) : null}
      </View>

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

// Switch-free by design: the app has no other Switch, and iOS's green would
// be the only saturated non-accent colour in the Nocturne system. This is the
// same pill the pace presets use, shrunk.
function ToggleRow({
  label,
  note,
  on,
  onToggle,
}: {
  label: string;
  note: string;
  on: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>{label}</Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            color: color.neutral500,
            marginTop: 3,
            lineHeight: 17,
          }}
        >
          {note}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          haptic.select();
          onToggle(!on);
        }}
        hitSlop={10}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: on }}
        style={({ pressed }) => ({
          minWidth: 56,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: on ? color.accent : color.neutral700,
          backgroundColor: on ? color.accentTint10 : 'transparent',
          borderRadius: radius.md,
          paddingVertical: 8,
          paddingHorizontal: 12,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 13,
            color: on ? color.accent300 : color.neutral500,
          }}
        >
          {on ? 'on' : 'off'}
        </Text>
      </Pressable>
    </View>
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
