// Craving SOS — S20, per the 2e mockup. Opened from the floating button on
// the Log screen. Idle → 5:00 countdown with a shrinking ring and rotating
// distraction prompts → outcome. Survived cravings become a weekly stat;
// "I smoked it anyway" asks how much (1/½/⅓) and logs it against today's
// budget (honesty over enforcement).

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../AppContext';
import { haptic } from '../haptics';
import { useNav } from '../navigation';
import { pickPrompts, sosResult } from '../strings';
import { color, font, radius } from '../theme';

const TOTAL = 300; // seconds
const R = 96;
const CIRC = 2 * Math.PI * R; // ≈ 603, as in the prototype

// Guided breathing (BACKLOG P3) — an alternative to the rotating prompts
// inside the same 5:00 countdown. `to` is the guide circle's target (0 =
// contracted, 1 = full); a segment that repeats the previous `to` is a hold.
// One pattern, in 4 / hold 4 / out 4 — device verdict 2026-07-17: the
// post-exhale hold dragged and 4-7-8 earned no keep, so both are gone.
// Durations in ms, named so pacing tweaks are one-line edits.
const BREATH_SEGMENTS = [
  { label: 'breathe in', to: 1, dur: 4000 },
  { label: 'hold', to: 1, dur: 4000 },
  { label: 'breathe out', to: 0, dur: 4000 },
] as const;

// circle diameter range the 0..1 value maps to
const BREATH_MAX = 132;
const BREATH_MIN_SCALE = 0.55;

type Phase = 'idle' | 'on' | 'pickAmount' | 'result';
type SosMode = 'prompts' | 'breathe';

export function SosScreen() {
  const { data, addCraving, addEntry } = useApp();
  const cravings = data.cravings;
  const nav = useNav();
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(TOTAL);
  // prompts vs guided breathing; sticky within the screen so a re-run of the
  // timer keeps the user's choice. Mirrored in a ref for the interval closure.
  const [mode, setMode] = useState<SosMode>('prompts');
  const modeRef = useRef<SosMode>('prompts');
  const switchMode = (m: SosMode) => {
    haptic.select();
    modeRef.current = m;
    setMode(m);
  };
  const [outcome, setOutcome] = useState<'survived' | 'smoked'>('survived');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // wall-clock deadline — iOS pauses JS timers in the background, so remaining
  // time must be derived from the clock, never counted down in memory
  const endAt = useRef(0);
  // one random prompt per stage, re-rolled each session
  const prompts = useRef(pickPrompts());

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopTimer, []);

  const finishSurvived = () => {
    stopTimer();
    haptic.survived();
    setOutcome('survived');
    addCraving('survived');
    setPhase('result');
  };

  const finishSmoked = (sixths: number) => {
    haptic.logged();
    setOutcome('smoked');
    addCraving('smoked');
    addEntry(sixths);
    setPhase('result');
  };

  // prompt stage for a remaining-seconds value — drives copy and the
  // stage-transition tick below
  const stageFor = (s: number) => (s > 200 ? 'early' : s > 100 ? 'mid' : 'late');
  const stage = useRef<'early' | 'mid' | 'late'>('early');

  const start = () => {
    haptic.emergency();
    prompts.current = pickPrompts();
    endAt.current = Date.now() + TOTAL * 1000;
    stage.current = 'early';
    setLeft(TOTAL);
    setPhase('on');
    stopTimer();
    timer.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      if (remaining <= 0) {
        // natural expiry is a survived craving too — same haptic + stat path
        // as the "I made it" button (BACKLOG haptics pass)
        finishSurvived();
        return;
      }
      // subtle tick when the prompt changes stage — decide-on-device
      // (BACKLOG haptics pass): delete this block if it reads as noise.
      // Prompts mode only: breathing has its own rhythm to protect.
      const s = stageFor(remaining);
      if (s !== stage.current) {
        stage.current = s;
        if (modeRef.current === 'prompts') haptic.select();
      }
      setLeft(remaining);
    }, 500);
  };

  const cancelToIdle = () => {
    stopTimer();
    setPhase('idle');
    setLeft(TOTAL);
  };

  const weeklySurvived = cravings.filter(
    (c) => c.outcome === 'survived' && c.timestamp >= Date.now() - 7 * 86_400_000,
  ).length;

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const prompt =
    left > 200 ? prompts.current.early : left > 100 ? prompts.current.mid : prompts.current.late;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, alignItems: 'center', padding: 22, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
        <Pressable
          onPress={() => {
            // leaving mid-countdown abandons the craving without judging it
            stopTimer();
            nav.goBack();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={{ fontSize: 18, color: color.neutral500 }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
          Craving SOS
        </Text>
      </View>

      {phase === 'idle' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <Pressable
            onPress={start}
            accessibilityRole="button"
            accessibilityLabel="I'm craving — start the five-minute timer"
            style={({ pressed }) => ({
              width: 190,
              height: 190,
              borderRadius: 95,
              borderWidth: 2,
              borderColor: color.accent,
              backgroundColor: pressed ? color.accentTint12 : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.accent300 }}>
              I'm craving
            </Text>
          </Pressable>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 8,
              backgroundColor: color.surface,
              borderRadius: radius.md,
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
            <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.accent300 }}>
              {weeklySurvived}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500 }}>
              craving{weeklySurvived === 1 ? '' : 's'} outlasted this week
            </Text>
          </View>
        </View>
      )}

      {phase === 'on' && (
        // gap 22 (was 30): the mode toggle added a fourth child to this column
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <View style={{ width: 210, height: 210, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={210} height={210} viewBox="0 0 210 210" style={{ position: 'absolute' }}>
              <Circle cx={105} cy={105} r={R} stroke={color.neutral900} strokeWidth={8} fill="none" />
              <Circle
                cx={105}
                cy={105}
                r={R}
                stroke={color.accent}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${((left / TOTAL) * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`}
                transform="rotate(-90 105 105)"
              />
            </Svg>
            <Text style={{ fontFamily: font.medium, fontSize: 44, color: color.text }}>{clock}</Text>
          </View>
          {mode === 'prompts' ? (
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 14,
                color: color.neutral300,
                textAlign: 'center',
                lineHeight: 20,
                paddingHorizontal: 20,
                minHeight: 40,
              }}
            >
              {prompt}
            </Text>
          ) : (
            <BreathGuide />
          )}
          <Pressable
            onPress={() => switchMode(mode === 'prompts' ? 'breathe' : 'prompts')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'prompts' ? 'Switch to guided breathing' : 'Switch back to prompts'
            }
          >
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: color.accent300,
                textDecorationLine: 'underline',
              }}
            >
              {mode === 'prompts' ? 'breathe with me instead' : 'back to prompts'}
            </Text>
          </Pressable>
          <View style={{ alignItems: 'center', gap: 18, marginTop: 4 }}>
            <Pressable
              onPress={finishSurvived}
              accessibilityRole="button"
              accessibilityLabel="It passed. I win."
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: color.accent,
                borderRadius: radius.md,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: pressed ? color.accentTint12 : 'transparent',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.accent300 }}>
                It passed. I win.
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                stopTimer();
                setPhase('pickAmount');
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="I smoked it anyway"
            >
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 12,
                  color: color.neutral500,
                  textDecorationLine: 'underline',
                }}
              >
                I smoked it anyway
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'pickAmount' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, alignSelf: 'stretch' }}>
          <Text style={{ fontFamily: font.medium, fontSize: 24, color: color.text, textAlign: 'center' }}>
            How much was it?
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500 }}>
            No judgement — it goes against today's budget.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, alignSelf: 'stretch' }}>
            {([['1', 6, 'One cigarette'], ['½', 3, 'Half'], ['⅓ shared', 2, 'A third, shared']] as const).map(
              ([label, sixths, spoken]) => (
              <Pressable
                key={label}
                onPress={() => finishSmoked(sixths)}
                accessibilityRole="button"
                accessibilityLabel={spoken}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: color.surface,
                  borderWidth: 1,
                  borderColor: pressed ? color.accent : color.neutral800,
                  borderRadius: radius.md,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Text style={{ fontFamily: font.medium, fontSize: 16, color: color.text }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={cancelToIdle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Never mind, cancel"
            style={{ marginTop: 10 }}
          >
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: color.neutral500,
                textDecorationLine: 'underline',
              }}
            >
              never mind
            </Text>
          </Pressable>
        </View>
      )}

      {phase === 'result' && (
        <ResultView
          outcome={outcome}
          weeklySurvived={weeklySurvived}
          onDone={() => nav.goBack()}
        />
      )}
    </View>
  );
}

// The guide circle grows on inhale, holds, and shrinks on exhale, looping
// until the countdown ends or the user switches back to prompts. The loop is
// driven segment-by-segment (timing → callback → next segment) so the phase
// label always matches the animation; a hold is a timing to the same value.
function BreathGuide() {
  const [segLabel, setSegLabel] = useState<string>(BREATH_SEGMENTS[0].label);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    anim.setValue(0);
    const run = (i: number) => {
      if (!alive) return;
      const seg = BREATH_SEGMENTS[i];
      setSegLabel(seg.label);
      // breath-cue tick on in/out only — decide-on-device (same bar as the
      // stage tick): delete if it fights the calm instead of guiding it
      if (seg.label !== 'hold') haptic.select();
      Animated.timing(anim, {
        toValue: seg.to,
        duration: seg.dur,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run((i + 1) % BREATH_SEGMENTS.length);
      });
    };
    run(0);
    return () => {
      alive = false;
      anim.stopAnimation();
    };
  }, []);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [BREATH_MIN_SCALE, 1],
  });

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View
        style={{ width: BREATH_MAX, height: BREATH_MAX, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel={`Breathing guide: ${segLabel}`}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: BREATH_MAX,
            height: BREATH_MAX,
            borderRadius: BREATH_MAX / 2,
            borderWidth: 2,
            borderColor: color.accent,
            backgroundColor: color.accentTint12,
            transform: [{ scale }],
          }}
        />
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300 }}>
          {segLabel}
        </Text>
      </View>
    </View>
  );
}

function ResultView({
  outcome,
  weeklySurvived,
  onDone,
}: {
  outcome: 'survived' | 'smoked';
  weeklySurvived: number;
  onDone: () => void;
}) {
  // The survived scoreboard prints the user's name if they gave one —
  // "Craving: 0. Naman: 4." is the personal beat this screen earns.
  const name = useApp().data.profile?.name;
  const { title, body } = sosResult(outcome, weeklySurvived, name);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 10 }}>
      <Text style={{ fontFamily: font.medium, fontSize: 28, color: color.text, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 14,
          color: color.neutral400,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {body}
      </Text>
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="Done"
        style={({ pressed }) => ({
          borderWidth: 1,
          // neutral600, not 700 — border-only boundary needs ≥3:1 (NFR5)
          borderColor: color.neutral600,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 24,
          marginTop: 20,
          backgroundColor: pressed ? color.accentTint10 : 'transparent',
        })}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.neutral300 }}>done</Text>
      </Pressable>
    </View>
  );
}
