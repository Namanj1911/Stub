// Craving SOS — S20, per the 2e mockup. Opened from the floating button on
// the Log screen. Idle → 5:00 countdown with a shrinking ring and rotating
// distraction prompts → outcome. Survived cravings become a weekly stat;
// "I smoked it anyway" asks how much (1/½/⅓) and logs it against today's
// budget (honesty over enforcement).

import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../AppContext';
import { useNav } from '../navigation';
import { pickPrompts, sosResult } from '../strings';
import { color, font, radius } from '../theme';

const TOTAL = 300; // seconds
const R = 96;
const CIRC = 2 * Math.PI * R; // ≈ 603, as in the prototype

type Phase = 'idle' | 'on' | 'pickAmount' | 'result';

export function SosScreen() {
  const { data, addCraving, addEntry } = useApp();
  const cravings = data.cravings;
  const nav = useNav();
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(TOTAL);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOutcome('survived');
    addCraving('survived');
    setPhase('result');
  };

  const finishSmoked = (sixths: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOutcome('smoked');
    addCraving('smoked');
    addEntry(sixths);
    setPhase('result');
  };

  const start = () => {
    prompts.current = pickPrompts();
    endAt.current = Date.now() + TOTAL * 1000;
    setLeft(TOTAL);
    setPhase('on');
    stopTimer();
    timer.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      if (remaining <= 0) {
        stopTimer();
        setOutcome('survived');
        addCraving('survived');
        setPhase('result');
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30 }}>
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
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 14,
              color: color.neutral300,
              textAlign: 'center',
              lineHeight: 20,
              paddingHorizontal: 20,
            }}
          >
            {prompt}
          </Text>
          <View style={{ alignItems: 'center', gap: 18, marginTop: 10 }}>
            <Pressable
              onPress={finishSurvived}
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
            {([['1', 6], ['½', 3], ['⅓ shared', 2]] as const).map(([label, sixths]) => (
              <Pressable
                key={label}
                onPress={() => finishSmoked(sixths)}
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
          <Pressable onPress={cancelToIdle} hitSlop={8} style={{ marginTop: 10 }}>
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

function ResultView({
  outcome,
  weeklySurvived,
  onDone,
}: {
  outcome: 'survived' | 'smoked';
  weeklySurvived: number;
  onDone: () => void;
}) {
  const { title, body } = sosResult(outcome, weeklySurvived);
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
        style={({ pressed }) => ({
          borderWidth: 1,
          borderColor: color.neutral700,
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
