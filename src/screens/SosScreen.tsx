// Craving SOS — S20, per the 2e mockup. Idle → 5:00 countdown with a shrinking
// ring and rotating distraction prompts → outcome. Survived cravings become a
// weekly stat; "I smoked it anyway" logs a full cigarette against today's
// budget (honesty over enforcement).

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Craving } from '../store';
import { SOS_PROMPTS, sosResult } from '../strings';
import { color, font, radius } from '../theme';

const TOTAL = 300; // seconds
const R = 96;
const CIRC = 2 * Math.PI * R; // ≈ 603, as in the prototype

type Phase = 'idle' | 'on' | 'result';

export function SosScreen({
  cravings,
  addCraving,
  logSmoked,
}: {
  cravings: Craving[];
  addCraving: (outcome: 'survived' | 'smoked') => void;
  logSmoked: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(TOTAL);
  const [outcome, setOutcome] = useState<'survived' | 'smoked'>('survived');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopTimer, []);

  const finish = (o: 'survived' | 'smoked') => {
    stopTimer();
    setOutcome(o);
    addCraving(o);
    if (o === 'smoked') logSmoked();
    setPhase('result');
  };

  const start = () => {
    setLeft(TOTAL);
    setPhase('on');
    stopTimer();
    timer.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          stopTimer();
          setOutcome('survived');
          addCraving('survived');
          setPhase('result');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const weeklySurvived = cravings.filter(
    (c) => c.outcome === 'survived' && c.timestamp >= Date.now() - 7 * 86_400_000,
  ).length;

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const prompt = left > 200 ? SOS_PROMPTS.early : left > 100 ? SOS_PROMPTS.mid : SOS_PROMPTS.late;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, alignItems: 'center', padding: 22 }}>
      <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text, alignSelf: 'flex-start' }}>
        sos<Text style={{ color: color.accent }}>.</Text>
      </Text>

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
              onPress={() => finish('survived')}
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
            <Pressable onPress={() => finish('smoked')} hitSlop={8}>
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

      {phase === 'result' && (
        <ResultView
          outcome={outcome}
          weeklySurvived={weeklySurvived}
          onDone={() => setPhase('idle')}
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
