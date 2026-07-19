// Health-recovery timeline — design/HEALTH_TIMELINE.md §4, build step 3.
//
// Three stacked sections, in the order the design argues for, because the
// order *is* the argument (§4):
//
//   1. Right now      — the short clock, which resets, anchored by a longest
//                       gap ever, which doesn't. Your record is the ceiling,
//                       not the reset.
//   2. What you didn't inhale — cumulative, never resets, makes no medical
//                       claim at all. This is the section that always moves.
//   3. The long horizon — the abstinence milestones, locked, with the plan's
//                       quit date attached so the lock has a date on it.
//
// The celebration beat (§9.3) lands here: phase 1 has no push, so an
// achievement has to feel earned when you open the app and find it waiting.
// The Goal card is the invitation; this screen is the payoff, and visiting it
// is what acknowledges the milestone.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useApp, useProfile } from '../AppContext';
import {
  budgetSixths,
  currentPlanRate,
  dayKey,
  quitDateAtRate,
} from '../domain';
import {
  HEALTH_DISCLAIMER,
  MILESTONE_SOURCE,
  ResolvedMilestone,
  cumulativeAvoided,
  fmtDuration,
  fmtMg,
  furthestEarned,
  gaps,
  liveMilestones,
  resolveMilestones,
} from '../health';
import { haptic } from '../haptics';
import { useNav } from '../navigation';
import { underBudgetCount } from '../stats';
import { avoidedCopy, healthBehind, healthClockCopy, milestoneCelebration } from '../strings';
import { color, font, radius } from '../theme';

// The smallest unit anything here renders is a minute, so a 10s tick is
// already finer than the display — enough to feel live, cheap enough to leave
// running while the screen is open.
const TICK_MS = 10_000;

export function HealthScreen() {
  const { data, ackMilestone } = useApp();
  const profile = useProfile();
  const nav = useNav();
  const entries = data.entries;

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const todayKey = dayKey(now);
  const g = gaps(entries, now);
  const resolved = resolveMilestones(g);
  const { current, next } = liveMilestones(resolved);
  const earned = furthestEarned(resolved);

  // Freeze the celebration decision at mount. The ack below lands in the same
  // commit cycle, so reading it live would tear the celebration off the
  // screen the instant it appeared.
  const [celebrating] = useState(() => earned != null && earned.id !== data.ackedMilestoneId);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!earned) return;
    if (celebrating) {
      haptic.survived();
      Animated.spring(celebrateAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 90,
      }).start();
    }
    ackMilestone(earned.id);
    // Runs once per visit: `earned` is derived from logs that don't change
    // while this screen is open, and re-acking on every tick would be noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avoided = cumulativeAvoided(
    entries,
    profile.baselineHistory,
    profile.priceHistory,
    profile.installDayKey,
    todayKey,
  );
  const under = underBudgetCount(
    entries,
    todayKey,
    profile.installDayKey,
    profile.baselineHistory,
    profile.planHistory,
    todayKey - profile.installDayKey + 1,
  );

  // The locked section's date: the long horizon starts counting from the last
  // cigarette, so the plan's quit date is when the clock on it would start.
  const budget = budgetSixths(
    entries,
    todayKey,
    profile.installDayKey,
    profile.baselineHistory,
    profile.planHistory,
  );
  const quit = quitDateAtRate(budget, currentPlanRate(profile.planHistory), now);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const clockState = g.sinceLast == null ? 'none' : g.longestIsLive ? 'record' : 'building';

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
          What your body's doing
        </Text>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 2 }}>
        Recovery milestones, and what you didn't inhale
      </Text>

      {/* celebration (§9) — in-app only this phase; no push until the dev build */}
      {celebrating && earned && (
        <Animated.View
          style={{
            opacity: celebrateAnim,
            transform: [
              { translateY: celebrateAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
            borderRadius: radius.lg,
            backgroundColor: color.accentTint12,
            borderWidth: 1,
            borderColor: color.accent600,
            padding: 16,
            marginTop: 18,
          }}
        >
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: color.accent300,
            }}
          >
            Milestone earned
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 18, color: color.text, marginTop: 6 }}>
            {earned.label} — {earned.body}
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 13,
              color: color.neutral300,
              lineHeight: 19,
              marginTop: 8,
            }}
          >
            {milestoneCelebration()}
          </Text>
        </Animated.View>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* §4.1 right now — the clock that resets                            */}
      {/* ---------------------------------------------------------------- */}
      <SectionLabel>Right now</SectionLabel>

      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: color.section,
          padding: 20,
          marginTop: 10,
          overflow: 'hidden',
        }}
      >
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          width="100%"
          height="100%"
        >
          <Defs>
            <RadialGradient id="healthGlow" cx="50%" cy="0%" rx="80%" ry="90%">
              <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={color.section} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="0%" rx="80%" ry="90%" fill="url(#healthGlow)" />
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
          Since your last one
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 34, color: color.text, marginTop: 4 }}>
          {g.sinceLast == null ? '—' : fmtDuration(g.sinceLast)}
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 13,
            color: color.accent200,
            lineHeight: 19,
            marginTop: 8,
            opacity: 0.9,
          }}
        >
          {current
            ? `${current.label} in: ${current.body}`
            : healthClockCopy(clockState)}
        </Text>
        {current && next && (
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.accent300,
              marginTop: 6,
            }}
          >
            Next up at {next.label}.
          </Text>
        )}

        {/* the record — the anchor that makes a resetting clock bearable */}
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
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent200 }}>
              {g.longestIsLive && g.sinceLast != null
                ? "Longest you've ever gone — and it's still running"
                : "Longest you've ever gone"}
            </Text>
            {/* the record beat gets the rolled line; otherwise the record
                states plainly what it bought, which is the §4.1 anchor */}
            <Text
              style={{ fontFamily: font.regular, fontSize: 11, color: color.accent300, marginTop: 3 }}
            >
              {g.longestIsLive && g.sinceLast != null
                ? healthClockCopy('record')
                : earned
                  ? // labels are standalone durations ("20 minutes"), so they
                    // don't work as adjectives — "the 24 hours mark" reads
                    // broken. "clear X" fits every label in the set.
                    `Far enough to clear ${earned.label}. That one's permanent.`
                  : healthClockCopy(clockState)}
            </Text>
          </View>
          <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
            {g.longestEver > 0 ? fmtDuration(g.longestEver) : '—'}
          </Text>
        </View>
      </View>

      {/* the short-horizon ladder */}
      <View style={{ gap: 8, marginTop: 10 }}>
        {resolved
          .filter((m) => m.horizon === 'short')
          .map((m) => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
      </View>

      {/* ---------------------------------------------------------------- */}
      {/* §4.2 cumulative — never resets                                    */}
      {/* ---------------------------------------------------------------- */}
      <SectionLabel>What you didn't inhale</SectionLabel>

      {avoided.sixths <= 0 ? (
        <View
          style={{
            borderRadius: radius.md,
            backgroundColor: color.surface,
            padding: 16,
            marginTop: 10,
          }}
        >
          <Text
            style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral300, lineHeight: 19 }}
          >
            {healthBehind}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 8, marginTop: 10 }}>
            <StatRow label="Cigarettes not smoked" value={avoided.cigarettes.toFixed(1)} />
            {/* nicotine/tar are never study-grade for Indian variants (COTPA
                §7(5) never in force), so they always wear the ~ softness
                treatment, same rule as the nicotine database */}
            <StatRow label="Nicotine not inhaled" value={'~' + fmtMg(avoided.nicotineMg)} />
            <StatRow label="Tar not inhaled" value={'~' + fmtMg(avoided.tarMg)} />
            <StatRow label="Days under budget" value={`${under.under} / ${under.days || 1}`} />
          </View>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.neutral500,
              lineHeight: 18,
              marginTop: 10,
            }}
          >
            {avoidedCopy()}
          </Text>
        </>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* §4.3 the long horizon — locked                                    */}
      {/* ---------------------------------------------------------------- */}
      <SectionLabel>The long horizon</SectionLabel>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 13,
          color: color.neutral400,
          lineHeight: 19,
          marginTop: 8,
        }}
      >
        These count from your last cigarette. Not your latest one — your last one. On your current
        plan that's{' '}
        <Text style={{ color: color.accent300 }}>{fmtDate(quit)}</Text>, so here's what's waiting.
      </Text>

      <View style={{ gap: 8, marginTop: 12 }}>
        {resolved
          .filter((m) => m.horizon === 'long')
          .map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              // A locked row with a real date on it is a destination; a locked
              // row without one is just grey. Day one, this is the only thing
              // keeping the section from reading as a wall of nothing.
              subtitle={
                m.state === 'locked'
                  ? `from ${fmtDate(new Date(quit.getTime() + m.hours * 3_600_000))}`
                  : undefined
              }
            />
          ))}
      </View>

      {/* fine print — one document-level citation (§6), plus the disclaimer */}
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 11,
          color: color.neutral500,
          lineHeight: 17,
          marginTop: 24,
        }}
      >
        Milestones from {MILESTONE_SOURCE.publisher},{' '}
        <Text
          style={{ color: color.accent300 }}
          onPress={() => Linking.openURL(MILESTONE_SOURCE.url).catch(() => {})}
        >
          {MILESTONE_SOURCE.title}
        </Text>{' '}
        ({MILESTONE_SOURCE.asOf}). Nicotine and tar are per-stick estimates for your brand — Indian
        packs don't print them, so every figure here is approximate.
      </Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 11,
          color: color.neutral500,
          lineHeight: 17,
          marginTop: 10,
        }}
      >
        {HEALTH_DISCLAIMER}
      </Text>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: font.medium,
        fontSize: 12,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: color.neutral500,
        marginTop: 26,
      }}
    >
      {children}
    </Text>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
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
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: color.text }}>{label}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>{value}</Text>
    </View>
  );
}

// One row, three states. 'reached' is live right now; 'earned' cleared the
// record once and stays lit, dimmer — that distinction is the whole §4.1
// design, so it has to be legible at a glance and not just by color.
function MilestoneRow({
  milestone,
  subtitle,
}: {
  milestone: ResolvedMilestone;
  subtitle?: string;
}) {
  const locked = milestone.state === 'locked';
  const live = milestone.state === 'reached';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: locked ? 'transparent' : color.surface,
        borderWidth: 1,
        borderColor: live ? color.accent600 : locked ? color.neutral900 : color.neutral800,
        borderRadius: radius.md,
        paddingVertical: 13,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          marginTop: 5,
          backgroundColor: live ? color.accent : locked ? 'transparent' : color.accent700,
          borderWidth: locked ? 1 : 0,
          borderColor: color.neutral700,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 14,
            color: locked ? color.neutral500 : color.text,
          }}
        >
          {milestone.label}
          {milestone.state === 'earned' && (
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.accent300 }}>
              {'  '}earned
            </Text>
          )}
          {live && (
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.accent }}>
              {'  '}now
            </Text>
          )}
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            color: locked ? color.neutral500 : color.neutral400,
            lineHeight: 18,
            marginTop: 2,
          }}
        >
          {milestone.body}
        </Text>
        {subtitle && (
          <Text
            style={{ fontFamily: font.regular, fontSize: 11, color: color.neutral500, marginTop: 4 }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}
