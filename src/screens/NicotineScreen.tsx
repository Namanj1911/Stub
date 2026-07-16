// Nicotine database — S18 + S19, per the 2d mockup. Weekly intake computed
// from your logs × your brand's per-stick numbers; searchable brand list.
// Tapping a row sets it as "yours" ("Change it anytime", per onboarding).
// Brand data is placeholder — production needs a vetted dataset.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useApp, useProfile } from '../AppContext';
import { BRANDS } from '../brands';
import { dayKey, entriesForDay, totalSixths } from '../domain';
import { useNav } from '../navigation';
import { color, font, radius } from '../theme';

export function NicotineScreen() {
  const { data, setBrandId } = useApp();
  const profile = useProfile();
  const entries = data.entries;
  const nav = useNav();
  const [query, setQuery] = useState('');

  const brand = BRANDS.find((b) => b.id === profile.brandId);
  const todayKey = dayKey(Date.now());
  const weekSixths = (offsetWeeks: number) => {
    let s = 0;
    for (let k = todayKey - 6 - offsetWeeks * 7; k <= todayKey - offsetWeeks * 7; k++) {
      s += totalSixths(entriesForDay(entries, k));
    }
    return s;
  };
  const thisWeek = weekSixths(0);
  const lastWeek = weekSixths(1);
  const nicotine = brand ? (thisWeek / 6) * brand.nicotineMg : null;
  const tar = brand ? (thisWeek / 6) * brand.tarMg : null;
  const delta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  const results = BRANDS.filter((b) =>
    `${b.name} ${b.variant}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 22, paddingTop: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12}>
          <Text style={{ fontSize: 18, color: color.neutral500 }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: font.medium, fontSize: 20, color: color.text }}>
          What you're inhaling
        </Text>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 2 }}>
        Nicotine & tar per stick — brands sold in India
      </Text>

      {/* intake card (S19) */}
      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: color.section,
          padding: 20,
          marginTop: 18,
          overflow: 'hidden',
        }}
      >
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          width="100%"
          height="100%"
        >
          <Defs>
            <RadialGradient id="nicGlow" cx="80%" cy="0%" rx="70%" ry="80%">
              <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={color.section} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="80%" cy="0%" rx="70%" ry="80%" fill="url(#nicGlow)" />
        </Svg>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: color.neutral400,
          }}
        >
          Nicotine this week
        </Text>
        {nicotine != null ? (
          <>
            <Text style={{ fontFamily: font.medium, fontSize: 40, letterSpacing: -1, color: color.text, marginTop: 6 }}>
              ~{Math.round(nicotine)} mg
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent300, marginTop: 4 }}>
              {delta == null ? 'first week of data' : delta <= 0 ? `↓ ${Math.abs(delta)}% vs last week` : `↑ ${delta}% vs last week`}
              {tar != null ? ` · plus ~${Math.round(tar)} mg of tar` : ''}
            </Text>
          </>
        ) : (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent200, marginTop: 8, lineHeight: 19 }}>
            Pick your brand below and we'll do the math on your logs.
          </Text>
        )}
      </View>

      {/* search (S18) */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search brands…"
        placeholderTextColor={color.neutral600}
        style={{
          backgroundColor: color.surface,
          borderWidth: 1,
          borderColor: color.neutral800,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 14,
          fontFamily: font.regular,
          fontSize: 14,
          color: color.text,
          marginTop: 18,
        }}
      />

      {/* brand rows */}
      <View style={{ gap: 8, marginTop: 12 }}>
        {results.map((b) => {
          const yours = profile.brandId === b.id;
          return (
            <Pressable
              key={b.id}
              onPress={() => setBrandId(b.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: yours ? color.accent : color.neutral800,
                backgroundColor: pressed ? color.accentTint10 : color.surface,
                borderRadius: radius.md,
                paddingVertical: 13,
                paddingHorizontal: 16,
                gap: 10,
              })}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>
                    {b.name}
                  </Text>
                  {yours && (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: color.accent,
                        borderRadius: radius.sm,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: font.medium,
                          fontSize: 10,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          color: color.accent300,
                        }}
                      >
                        yours
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 3 }}
                  numberOfLines={1}
                >
                  {b.variant} · ₹{b.price}/stick
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.text }} numberOfLines={1}>
                  {b.nicotineMg.toFixed(1)} mg nic
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 3 }} numberOfLines={1}>
                  {b.tarMg} mg tar
                </Text>
              </View>
            </Pressable>
          );
        })}
        {results.length === 0 && (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral600, marginTop: 8 }}>
            No brands match "{query.trim()}".
          </Text>
        )}
      </View>

      <Text style={{ fontFamily: font.regular, fontSize: 11, color: color.neutral600, marginTop: 20 }}>
        Placeholder figures for reference only — not medical guidance.
      </Text>
    </ScrollView>
  );
}
