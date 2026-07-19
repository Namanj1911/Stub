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
import {
  furthestEarned,
  gaps,
  liveMilestones,
  milestoneRank,
  resolveMilestones,
} from '../health';
import { Medal } from '../Medal';
import { ZERO_DAYS_TO_FLIP, goalMode, smokeFree } from '../postzero';
import { arrivedCopy, postZeroOfferCopy, smokeFreeCopy } from '../strings';
import { haptic } from '../haptics';
import { ProfileButton } from '../ProfileButton';
import { useNav } from '../navigation';
import { color, font, radius } from '../theme';

export function GoalScreen() {
  const { data, confirmPostZero } = useApp();
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

  // Goal's tense (design §10). The screen's narrative job is unchanged in all
  // three modes — "where is this going" — but at zero it stops being a
  // forecast and becomes a record of arrival.
  const sf = smokeFree(entries, todayKey, profile.installDayKey, data.postZeroConfirmedFrom);
  const mode = goalMode(budget, sf);
  // Smoke-free *since* is the day after the last cigarette: the first day
  // with nothing in it. Dating it from the cigarette itself would credit the
  // user with a day they spent smoking.
  const smokeFreeSince =
    sf.lastSmokeAt == null
      ? null
      : new Date(sf.lastSmokeAt + 86_400_000).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

  // Milestone card (design/HEALTH_TIMELINE.md §5.5) — the live "right now"
  // milestone plus the next one, drilling into the full timeline.
  //
  // Deliberately renders no ticking duration. Goal lives in a top-tab
  // navigator and stays mounted, so a live clock here would mean a timer
  // running for the whole session to keep a number honest that the Health
  // screen already owns. Milestones only change when a smoke is logged or a
  // threshold passes, and the card re-renders on the former; the latter can
  // wait for the drill-in.
  const g = gaps(entries, now);
  const resolvedMilestones = resolveMilestones(g);
  const { current: liveMilestone, next: nextMilestone } = liveMilestones(resolvedMilestones);
  const earnedMilestone = furthestEarned(resolvedMilestones);
  // §9.3: no push until the dev build, so the card is where an unseen
  // achievement announces itself — it nudges until the Health screen acks it.
  const unseen =
    earnedMilestone != null &&
    milestoneRank(earnedMilestone.id) > milestoneRank(data.ackedMilestoneId);

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

      {/* ---------------------------------------------------------------- */}
      {/* post-zero hero (§10) — the glide path has arrived and retires; the */}
      {/* same screen keeps its narrative job in a new tense                 */}
      {/* ---------------------------------------------------------------- */}
      {mode === 'postZero' && (
        <HeroCard>
          <HeroLabel>Smoke-free since</HeroLabel>
          <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text, marginTop: 4 }}>
            {smokeFreeSince}
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
            {smokeFreeCopy(sf.streakDays, sf.bestDays)}
          </Text>
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
            <View>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent200 }}>
                Days clean
              </Text>
              {/* best shows only when it beats the current run — same
                  declutter rule as the under-budget streak card */}
              {sf.bestDays > sf.streakDays && (
                <Text
                  style={{ fontFamily: font.regular, fontSize: 11, color: color.accent300, marginTop: 3 }}
                >
                  Best: {sf.bestDays}
                </Text>
              )}
            </View>
            <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
              {sf.streakDays}
            </Text>
          </View>
        </HeroCard>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* the offer — the days are lived, and the app asks rather than tells */}
      {/* (src/postzero.ts). This is the whole silent-day guard: everything   */}
      {/* downstream of post-zero mode hangs off one deliberate tap.          */}
      {/* ---------------------------------------------------------------- */}
      {mode === 'offer' && (
        <HeroCard>
          <HeroLabel>{sf.streakDays} days clean</HeroLabel>
          <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text, marginTop: 4 }}>
            Ready to call it?
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
            {postZeroOfferCopy()}
          </Text>
          {/* No decline button, deliberately: not tapping is the "no", so the
              offer simply keeps standing and there is no refusal to store. */}
          <Pressable
            onPress={() => {
              if (sf.runStartDayKey == null) return; // unreachable while eligible
              haptic.survived();
              confirmPostZero(sf.runStartDayKey);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Confirm you are smoke-free after ${sf.streakDays} clean days`}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: color.gold,
              backgroundColor: color.goldTint8,
              paddingHorizontal: 16,
              paddingVertical: 11,
              marginTop: 18,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.goldBright }}>
              I've stopped smoking
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.accent300,
              lineHeight: 18,
              marginTop: 12,
            }}
          >
            Not yet? Nothing happens, and this stays here until you say so.
          </Text>
        </HeroCard>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* arrived (§12) — budget is zero, the seven days aren't lived yet    */}
      {/* ---------------------------------------------------------------- */}
      {mode === 'arrived' && (
        <HeroCard>
          <HeroLabel>Budget</HeroLabel>
          <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text, marginTop: 4 }}>
            Zero
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
            {arrivedCopy()}
          </Text>
          {/* the only countdown in the app that counts *up* to something */}
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
              Clean days lived
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
              {sf.completedZeroDays} / {ZERO_DAYS_TO_FLIP}
            </Text>
          </View>
        </HeroCard>
      )}

      {/* plan card (S10) — now also carries progress-to-quit-day, which used
          to be a full-width card of its own rendering a single number.
          Tapering only: once the budget reaches zero the forecast has nothing
          left to forecast, and `weeksToQuitAtRate` would floor at 1 and
          promise a quit date a week away from a user already at zero. */}
      {mode === 'tapering' && (
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
      )}

      {/* milestone card (§5.5) — the body's version of the same argument the
          plan card makes in cigarettes: here's when you stop, here's what you
          get for it */}
      <Pressable
        onPress={() => nav.navigate('Health')}
        accessibilityRole="button"
        accessibilityLabel={
          liveMilestone
            ? `${liveMilestone.label} since your last cigarette. See your full health timeline`
            : 'See your full health timeline'
        }
        style={({ pressed }) => ({
          borderRadius: radius.lg,
          backgroundColor: unseen ? color.goldTint8 : color.surface,
          borderWidth: 1,
          borderColor: unseen ? color.goldBorder : color.neutral800,
          padding: 18,
          marginTop: 14,
          opacity: pressed ? 0.75 : 1,
          // an unclaimed milestone glows on the tab the user actually lands on
          ...(unseen
            ? {
                shadowColor: color.gold,
                shadowOpacity: 0.3,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 0 },
              }
            : null),
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unseen && <Medal state="reached" size={15} />}
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: unseen ? color.gold : color.neutral500,
              }}
            >
              {unseen ? 'Milestone earned' : 'Your body'}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: unseen ? color.goldDim : color.accent300,
            }}
          >
            timeline →
          </Text>
        </View>

        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 16,
            color: unseen ? color.goldBright : color.text,
            lineHeight: 23,
            marginTop: 8,
          }}
        >
          {unseen && earnedMilestone
            ? `${earnedMilestone.label}: ${earnedMilestone.body}`
            : liveMilestone
              ? `${liveMilestone.label} in: ${liveMilestone.body}`
              : 'Twenty minutes without one and your heart rate starts dropping.'}
        </Text>

        {/* The two states read off different clocks and must not be mixed: the
            earned milestone comes from the all-time record, `next` from the
            live clock. Showing both at once produced "24 hours earned / next
            at 12 hours", which reads as a contradiction. */}
        <Text
          style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 8 }}
        >
          {unseen
            ? // only the short horizon banks permanently — promising a
              // long-horizon mark "stays earned" would be a claim about
              // sustained abstinence that stops being true on the next
              // cigarette (§9.1)
              earnedMilestone?.horizon === 'long'
              ? 'Earned by staying stopped, and still running. Tap for the full timeline.'
              : 'Your longest gap ever got you here — and it stays earned. Tap for the full timeline.'
            : nextMilestone == null
              ? 'Every milestone on the board. Tap to see them.'
              : nextMilestone.horizon === 'long'
                ? // post-zero this is the main event rather than a "past 24
                  // hours" footnote, and the next mark is a real date
                  mode === 'postZero'
                  ? `Next up: ${nextMilestone.label} smoke-free.`
                  : 'Past 24 hours — the rest of the timeline counts from your last cigarette.'
                : `Next at ${nextMilestone.label}: ${nextMilestone.body.toLowerCase()}`}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// The hero slot, shared by all three of Goal's tenses (§10). Same deep-indigo
// section ground and radial glow the plan card has always used — the screen's
// story changes tense, not its furniture, which is the whole reason post-zero
// lives on Goal rather than getting a screen of its own.
function HeroCard({ children }: { children: React.ReactNode }) {
  return (
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
          <RadialGradient id="heroGlow" cx="50%" cy="0%" rx="80%" ry="90%">
            <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={color.section} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="0%" rx="80%" ry="90%" fill="url(#heroGlow)" />
      </Svg>
      {children}
    </View>
  );
}

function HeroLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: font.medium,
        fontSize: 10,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: color.accent300,
      }}
    >
      {children}
    </Text>
  );
}
