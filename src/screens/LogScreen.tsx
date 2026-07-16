// Log screen — S1 quick log, S2 undo, S3 today view, S4 over-budget state.

import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  budgetSixths,
  dayKey,
  entriesForDay,
  fmtSince,
  fmtTime,
  frac,
  totalSixths,
} from '../domain';
import { useApp, useProfile } from '../AppContext';
import { useNav } from '../navigation';
import { StringKey, copy } from '../strings';
import { color, font, radius } from '../theme';

export function LogScreen() {
  const { data, addEntry, undoLast, editEntry, removeEntry } = useApp();
  const profile = useProfile();
  const entries = data.entries;
  const nav = useNav();
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // header "since last" updates every minute (S3)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const todayKey = dayKey(now);
  const today = entriesForDay(entries, todayKey).sort((a, b) => a.timestamp - b.timestamp);
  const total = totalSixths(today);
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, profile.countPerDay * 6);
  const left = budget - total;
  const lastAt = entries.length ? entries[entries.length - 1].timestamp : null;

  const showToast = (key: StringKey) => {
    setToast(copy(key));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  const log = (sixths: number) => {
    addEntry(sixths); // optimistic, never blocked (S4)
    setNow(Date.now());
    const after = total + sixths;
    showToast(after > budget ? 'logOver' : budget - after <= 6 ? 'logNear' : 'logWithin');
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
            stub<Text style={{ color: color.accent }}>.</Text>
          </Text>
          {lastAt != null && (
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
              last one {fmtSince(lastAt, now)} ago
            </Text>
          )}
        </View>

        {/* today count + budget (S3) */}
        <Text style={{ fontFamily: font.medium, fontSize: 64, color: color.text, marginTop: 24 }}>
          {frac(total)}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 2 }}>
          of a {frac(budget)} budget ·{' '}
          <Text style={{ color: left > 0 ? color.neutral400 : color.accent300 }}>
            {left > 0 ? `${frac(left)} left` : copy('budgetTorched')}
          </Text>
        </Text>

        {/* meter — caps at 100% (S4) */}
        <View
          style={{
            height: 6,
            borderRadius: radius.pill,
            backgroundColor: color.neutral900,
            marginTop: 14,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.min(100, (total / budget) * 100)}%`,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: color.accent,
            }}
          />
        </View>

        {/* log buttons (S1) */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          <LogButton label="1" onPress={() => log(6)} />
          <LogButton label="½" onPress={() => log(3)} />
          <LogButton label="⅓ shared" onPress={() => log(2)} />
        </View>

        {/* undo (S2) + backfill entry point (S14) */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14 }}>
          <Pressable
            onPress={() => {
              if (!entries.length) return;
              undoLast();
              setEditingId(null);
              showToast('undone');
            }}
            hitSlop={10}
          >
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: color.neutral500,
                textDecorationLine: 'underline',
              }}
            >
              undo last
            </Text>
          </Pressable>
          <Pressable onPress={() => nav.navigate('Backfill')} hitSlop={10}>
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: color.neutral500,
                textDecorationLine: 'underline',
              }}
            >
              missed one?
            </Text>
          </Pressable>
        </View>

        {/* today's drags (S3) — newest first */}
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: color.neutral600,
            marginTop: 28,
            marginBottom: 8,
          }}
        >
          Today's drags
        </Text>
        {today.length === 0 && (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral600 }}>
            Nothing yet today. Keep it that way?
          </Text>
        )}
        {[...today].reverse().map((e) =>
          editingId === e.id ? (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: color.neutral900,
              }}
            >
              {([['1', 6], ['½', 3], ['⅓', 2]] as const).map(([label, sixths]) => (
                <Pressable
                  key={label}
                  onPress={() => {
                    editEntry(e.id, sixths);
                    setEditingId(null);
                    showToast('edited');
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: e.sixths === sixths ? color.accent : color.neutral800,
                    backgroundColor: pressed ? color.accentTint10 : color.surface,
                  })}
                >
                  <Text style={{ fontFamily: font.regular, fontSize: 14, color: color.text }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
                  cancel
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: color.neutral900,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: color.accent,
                  marginRight: 12,
                }}
              />
              <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text, width: 36 }}>
                {frac(e.sixths)}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, flex: 1 }}>
                {e.sixths === 6 ? 'full' : 'shared'}
                {e.backfilled ? ' · backfilled' : ''}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginRight: 10 }}>
                {fmtTime(e.timestamp)}
              </Text>
              <IconButton name="edit-2" onPress={() => setEditingId(e.id)} />
              <IconButton
                name="trash-2"
                onPress={() => {
                  removeEntry(e.id);
                  setEditingId(null);
                  showToast('deleted');
                }}
              />
            </View>
          ),
        )}
      </ScrollView>

      {/* floating craving SOS button (S20 entry point) — deliberately breaks
          theme: an emergency control has to look like one */}
      <Pressable
        onPress={() => nav.navigate('Sos')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: color.sos,
          borderWidth: 2,
          borderColor: 'rgba(224, 74, 63, 0.35)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: color.sos,
          shadowOpacity: 0.5,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        })}
      >
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 16,
            letterSpacing: 1.5,
            color: color.sosText,
          }}
        >
          SOS
        </Text>
      </Pressable>

      {/* toast */}
      {toast !== '' && (
        <View
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 90,
            backgroundColor: color.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: color.neutral800,
            padding: 14,
          }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral200 }}>
            {toast}
          </Text>
        </View>
      )}
    </View>
  );
}

function LogButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
      <Text style={{ fontFamily: font.medium, fontSize: 16, color: color.text }}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ name, onPress }: { name: 'edit-2' | 'trash-2'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.sm,
        backgroundColor: pressed ? color.accentTint10 : 'transparent',
      })}
    >
      <Feather name={name} size={14} color={color.neutral500} />
    </Pressable>
  );
}
