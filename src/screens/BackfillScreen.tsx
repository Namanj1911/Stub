// Backfill — S14, per the 2b mockup. Retroactively log a missed cigarette:
// pick a day, a time-of-day bucket, a unit (1/½/⅓), then step the total up
// in that unit. The entry is marked backfilled; all stats recompute since
// they derive from the entries array.

import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { frac } from '../domain';
import { useNav } from '../navigation';
import { copy } from '../strings';
import { color, font, radius } from '../theme';

const BUCKETS = [
  { id: 'morning', name: 'Morning', range: '6 am – 12 pm', hour: 9 },
  { id: 'afternoon', name: 'Afternoon', range: '12 – 5 pm', hour: 15 },
  { id: 'evening', name: 'Evening', range: '5 – 9 pm', hour: 19 },
  { id: 'night', name: 'Night', range: '9 pm – 2 am', hour: 23 },
] as const;

export function BackfillScreen() {
  const { addEntry } = useApp();
  const nav = useNav();
  const [dayIdx, setDayIdx] = useState(0);
  const [bucketId, setBucketId] = useState<(typeof BUCKETS)[number]['id']>('evening');
  const [step, setStep] = useState(6);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = new Date();
  const days = [0, 1, 2, 3].map((i) => {
    const d = new Date(now.getTime() - i * 86_400_000);
    return {
      label: i === 0 ? 'Today' : i === 1 ? 'Yst' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      name: i === 0 ? 'today' : i === 1 ? 'yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long' }),
      date: d,
    };
  });
  const bucket = BUCKETS.find((b) => b.id === bucketId)!;

  const add = () => {
    if (!total) {
      setToast(copy('backfillZero'));
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 3500);
      return;
    }
    const d = days[dayIdx].date;
    const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), bucket.hour, 0, 0).getTime();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addEntry(total, Math.min(ts, Date.now()), true);
    setTotal(0);
    // confirm in place (prototype 2b behavior) — user backs out when done
    setToast(copy('backfilled'));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Text style={{ fontSize: 18, color: color.neutral500 }}>←</Text>
          </Pressable>
          <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
            Missed one?
          </Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 6 }}>
          Add it now — your stats only work if they're honest.
        </Text>

        <SectionLabel>Which day</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {days.map((d, i) => (
            <Select key={i} on={dayIdx === i} onPress={() => setDayIdx(i)} style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.text }}>
                {d.label}
              </Text>
            </Select>
          ))}
        </View>

        <SectionLabel>Roughly when</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {BUCKETS.map((b) => (
            <Select
              key={b.id}
              on={bucketId === b.id}
              onPress={() => setBucketId(b.id)}
              style={{ flexBasis: '47%', flexGrow: 1, alignItems: 'flex-start', paddingHorizontal: 14 }}
            >
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.text }}>{b.name}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 11, color: color.neutral500, marginTop: 2 }}>
                {b.range}
              </Text>
            </Select>
          ))}
        </View>

        <SectionLabel>How much</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {([['1', 6], ['½', 3], ['⅓', 2]] as const).map(([label, sixths]) => (
            <Select key={label} on={step === sixths} onPress={() => setStep(sixths)} style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>{label}</Text>
            </Select>
          ))}
        </View>

        {/* total stepper */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.surface,
            borderRadius: radius.md,
            padding: 14,
            marginTop: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>Total</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 28, color: color.text, marginTop: 2 }}>
              {frac(total)}
            </Text>
          </View>
          <Pressable onPress={() => setTotal(0)} hitSlop={8} style={{ marginRight: 16 }}>
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: color.neutral500,
                textDecorationLine: 'underline',
              }}
            >
              reset
            </Text>
          </Pressable>
          <Circle label="−" onPress={() => setTotal((t) => Math.max(0, t - step))} />
          <View style={{ width: 10 }} />
          <Circle label="+" onPress={() => setTotal((t) => Math.min(120, t + step))} />
        </View>

        <Pressable
          onPress={add}
          style={({ pressed }) => ({
            backgroundColor: color.accent,
            borderRadius: radius.md,
            padding: 16,
            alignItems: 'center',
            marginTop: 24,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.bg }}>
            Add {frac(total)} · {days[dayIdx].name}, {bucketId}
          </Text>
        </Pressable>
      </ScrollView>

      {toast !== '' && (
        <View
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 30,
            backgroundColor: color.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: color.neutral800,
            padding: 14,
          }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral200 }}>{toast}</Text>
        </View>
      )}
    </View>
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
        marginTop: 26,
      }}
    >
      {children}
    </Text>
  );
}

function Select({
  on,
  onPress,
  style,
  children,
}: {
  on: boolean;
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderWidth: 1,
        borderColor: on ? color.accent : color.neutral800,
        backgroundColor: on ? color.accentTint10 : color.surface,
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: 4,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...style,
      })}
    >
      {children}
    </Pressable>
  );
}

function Circle({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: pressed ? color.accent : color.neutral700,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 18, color: color.text, lineHeight: 22 }}>
        {label}
      </Text>
    </Pressable>
  );
}
