// Log screen — S1 quick log, S2 undo, S3 today view, S4 over-budget state.

import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, Text, View } from 'react-native';
import {
  budgetSixths,
  dayKey,
  entriesForDay,
  fmtSince,
  fmtTime,
  frac,
  recentDailyAverageSixths,
  tomorrowBudgetSixths,
  totalSixths,
} from '../domain';
import { useApp, useProfile } from '../AppContext';
import { haptic } from '../haptics';
import { ProfileButton } from '../ProfileButton';
import { useNav } from '../navigation';
import { smokeFree } from '../postzero';
import { copy, logToast, relapseNote, tomorrowNudge, TOMORROW_IF } from '../strings';
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

  // SOS halo pulse — a ring breathes outward every ~2s
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const todayKey = dayKey(now);
  const today = entriesForDay(entries, todayKey).sort((a, b) => a.timestamp - b.timestamp);
  const total = totalSixths(today);
  const budget = budgetSixths(entries, todayKey, profile.installDayKey, profile.baselineHistory, profile.planHistory);
  const sf = smokeFree(entries, todayKey, profile.installDayKey, data.postZeroConfirmedFrom);
  const left = budget - total;
  // The plan is allowed to reach zero (domain.plannedBudgetFor), and once it
  // does every budget-shaped thing on this screen stops meaning anything: the
  // meter divides by it, the caption rations against it, and the tomorrow row
  // previews a taper that has already landed. They retire together rather than
  // rendering 0/0. Covers `arrived` and `offer` as well as confirmed post-zero
  // — the budget is gone in all three, whether or not the user has said so.
  const atZero = budget <= 0;
  // The #10 follow-up's quieter half: once the budget hits zero the caption
  // retires the budget framing to "past the taper", which is right for a genuine
  // finisher but wrong for someone logging cigarettes again — and Log is where
  // they live, so they may never open Goal to meet its signpost. Same predicate
  // Goal and the Profile restart card gate on (budget zero AND measured recent
  // smoking disagrees), so all three surfaces agree by construction and a
  // genuine quitter keeps the plain "past the taper" caption untouched. This
  // points at the control on Profile; it never hosts it.
  const smokingAgain =
    atZero && recentDailyAverageSixths(entries, todayKey, profile.installDayKey) > 0;
  // tomorrow's budget (S11) lives here rather than on Goal — it's an
  // operational number, and Goal is the narrative screen
  // (design/HEALTH_TIMELINE.md §13). A caption under it is always visible: the
  // plain "if you stop now" qualifier (finding #8 — the number is contingent
  // on no more smokes today) until today is ≥80% spent, then the louder nudge.
  const tomorrow = tomorrowBudgetSixths(entries, todayKey, profile.installDayKey, profile.baselineHistory, profile.planHistory);
  const tomorrowLoud = total >= budget * 0.8;
  const tomorrowDrop = Math.max(0, budget - tomorrow);
  // max timestamp, not last array element — backfills append out of
  // chronological order. ("undo last" stays last-array-element by design:
  // it undoes the most recent *action*, including a just-added backfill.)
  const lastAt = entries.length
    ? entries.reduce((m, e) => Math.max(m, e.timestamp), 0)
    : null;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  const log = (sixths: number) => {
    haptic.logged();
    addEntry(sixths); // optimistic, never blocked (S4)
    setNow(Date.now());
    // A slip at zero gets the quiet note, never the budget roast: logToast
    // grades `after >= budget * 1.5`, which at a budget of zero is true of
    // every log, so all of them land in the 'torched' pool — a lecture about
    // a budget that no longer exists, at the worst possible moment (design
    // §10 — no lecture, no ceremony).
    //
    // Gated on `atZero`, not just `sf.active`: the roast is most damaging in
    // `arrived`, where the plan has just hit zero and the user hasn't earned
    // the flip yet. Confirmation is consent to a mode, not a precondition for
    // being treated decently.
    //
    // `sf`/`atZero` are this render's values, i.e. the state *before* this
    // cigarette — which is the reading we want ("you were smoke-free and
    // slipped"). Don't recompute from the post-log entries: the slip itself
    // clears sf.active, and the toast falls straight back to the roast.
    showToast(
      sf.active || atZero ? relapseNote() : logToast({ priorTotal: total, budget, sixths }),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {/* fixed chrome — header through the drags heading never scrolls; the
          drags list below is the screen's only scrollable region */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {/* header — wordmark and profile mark only. 26 (vs 22 elsewhere) on
            purpose: this is the app's front door, and the profile mark beside
            it visually shrinks anything smaller */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: font.medium, fontSize: 26, color: color.text }}>
            stub<Text style={{ color: color.accent }}>.</Text>
          </Text>
          <ProfileButton />
        </View>

        {/* "last one" status chip — a pill captioning the count below it */}
        {lastAt != null && (
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: color.neutral800,
              borderRadius: radius.pill,
              paddingVertical: 6,
              paddingHorizontal: 13,
              marginTop: 20,
            }}
          >
            <Text style={{ fontSize: 12 }}>🚬</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral400 }}>
              last one {fmtSince(lastAt, now)} ago
            </Text>
          </View>
        )}

        {/* today count + budget (S3) */}
        <Text
          style={{ fontFamily: font.medium, fontSize: 64, color: color.text, marginTop: lastAt != null ? 14 : 24 }}
        >
          {frac(total)}
        </Text>
        {smokingAgain ? (
          // Signpost, not the control: the whole caption is the pointer, so the
          // hit target is the line and tapping anywhere on it reaches Profile —
          // same "points rather than hosts" pattern as Goal's card and its
          // "change" link. The lead stays neutral (the mismatch, stated), the
          // CTA takes the accent and the arrow (the door).
          <Pressable
            onPress={() => nav.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel={`${copy('taperStaleLead')}. ${copy('taperStaleCta')} on Profile`}
            style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 2 }}>
              {copy('taperStaleLead')} ·{' '}
              <Text style={{ color: color.accent300 }}>
                {copy('taperStaleCta')} →
              </Text>
            </Text>
          </Pressable>
        ) : (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 2 }}>
            {atZero ? copy('taperDone') : `of a ${frac(budget)} budget`} ·{' '}
            <Text
              style={{
                color: atZero
                  ? total === 0
                    ? color.neutral400
                    : color.accent300
                  : left > 0
                    ? color.neutral400
                    : color.accent300,
              }}
            >
              {atZero
                ? copy(total === 0 ? 'taperDoneClean' : 'taperDoneLogged')
                : left > 0
                  ? `${frac(left)} left`
                  : copy('budgetTorched')}
            </Text>
          </Text>
        )}

        {/* meter — caps at 100% (S4). Retires at zero: `total / budget` is
            0/0 there, which lays out as NaN%, and a bar measuring spend
            against nothing has nothing to say. */}
        {!atZero && (
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
        )}

        {/* tomorrow's budget (S11) — a stat row under the meter (label left,
            value right, per the Goal card), not a caption: as a 12px grey
            line it read as a footnote and was missed on device. Deliberately
            borderless — it sits directly above the log buttons, and anything
            with a border there reads as a fourth button. Touches no
            interactive target; dodges the FAB and the scrolling list.

            Retires at zero along with the meter: tomorrow is zero too, so the
            row printed "Tomorrow 0" with no drop — and `total >= budget * 0.8`
            is 0 >= 0, so it did it in the loud accent treatment with a
            "tomorrow starts lower" nudge under it, permanently. There is no
            taper left to preview. */}
        {!atZero && (
        <>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
          }}
          accessible
          accessibilityLabel={`Tomorrow's budget: ${frac(tomorrow)}${
            tomorrowDrop > 0 ? `, down ${frac(tomorrowDrop)} from today` : ''
          }${tomorrowLoud ? '' : `, ${TOMORROW_IF}`}`}
        >
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: tomorrowLoud ? color.accent300 : color.neutral500,
            }}
          >
            Tomorrow
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
            {/* the drop is the point of the number — the taper, made visible */}
            {tomorrowDrop > 0 && (
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.accent300 }}>
                −{frac(tomorrowDrop)}
              </Text>
            )}
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 18,
                color: tomorrowLoud ? color.accent300 : color.text,
              }}
            >
              {frac(tomorrow)}
            </Text>
          </View>
        </View>
        {/* Always a caption here (finding #8): the plain qualifier while
            there's headroom left today, escalating to the nudge once ≥80%
            spent. Keeping the slot filled means tomorrow's number is never
            shown bare — it always says what it's contingent on. */}
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            color: color.neutral500,
            marginTop: 5,
          }}
        >
          {tomorrowLoud ? tomorrowNudge() : TOMORROW_IF}
        </Text>
        </>
        )}

        {/* log buttons (S1) — at zero they follow the caption directly, so
            they take back the spacing the meter and tomorrow row gave up */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: atZero ? 30 : 18 }}>
          <LogButton label="1" a11yLabel="Log one cigarette" onPress={() => log(6)} />
          <LogButton label="½" a11yLabel="Log half a cigarette" onPress={() => log(3)} />
          <LogButton label="⅓ shared" a11yLabel="Log a third, shared" onPress={() => log(2)} />
        </View>

        {/* undo (S2) + backfill entry point (S14) */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14 }}>
          <Pressable
            onPress={() => {
              if (!entries.length) return;
              haptic.select();
              undoLast();
              setEditingId(null);
              showToast(copy('undone'));
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Undo last entry"
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
          <Pressable
            onPress={() => nav.navigate('Backfill')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Log a missed cigarette"
          >
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

        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: color.neutral500,
            marginTop: 28,
            marginBottom: 8,
          }}
        >
          Today's drags
        </Text>
      </View>

      {/* today's drags (S3) — newest first. The list is its own scroller
          (list-as-scroller, not a nested ScrollView); bottom padding keeps
          the SOS FAB off the last row */}
      <FlatList
        data={[...today].reverse()}
        keyExtractor={(e) => e.id}
        extraData={editingId}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500 }}>
            Nothing yet today. Keep it that way?
          </Text>
        }
        renderItem={({ item: e }) =>
          editingId === e.id ? (
            <View
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
                    haptic.select();
                    editEntry(e.id, sixths);
                    setEditingId(null);
                    showToast(copy('edited'));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Change to ${label === '1' ? 'one' : label === '½' ? 'half' : 'a third'}`}
                  accessibilityState={{ selected: e.sixths === sixths }}
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
              <Pressable
                onPress={() => setEditingId(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
                  cancel
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
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
              <IconButton
                name="edit-2"
                label={`Edit ${frac(e.sixths)} at ${fmtTime(e.timestamp)}`}
                onPress={() => setEditingId(e.id)}
              />
              <IconButton
                name="trash-2"
                label={`Delete ${frac(e.sixths)} at ${fmtTime(e.timestamp)}`}
                onPress={() => {
                  haptic.destructive();
                  removeEntry(e.id);
                  setEditingId(null);
                  showToast(copy('deleted'));
                }}
              />
            </View>
          )
        }
      />

      {/* floating craving SOS button (S20 entry point) — deliberately breaks
          theme: an emergency control has to look like one */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: color.sos,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
        }}
      />
      <Pressable
        onPress={() => {
          haptic.emergency();
          nav.navigate('Sos');
        }}
        accessibilityRole="button"
        accessibilityLabel="Craving SOS"
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
            fontFamily: font.bold,
            fontSize: 17,
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

function LogButton({
  label,
  a11yLabel,
  onPress,
}: {
  label: string;
  a11yLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
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

function IconButton({
  name,
  label,
  onPress,
}: {
  name: 'edit-2' | 'trash-2';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
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
