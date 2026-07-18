// Nicotine database — S18 + S19, per the 2d mockup. Weekly intake computed
// from your logs × your brand's per-stick numbers; searchable brand list.
// Tapping a row switches your brand — and re-prices your money math from
// this moment (BACKLOG P1): old smokes keep their old price. Brands we don't
// know can be added by name; they get dataset averages, marked ~estimated.
// Health numbers carry provenance (src/brands.ts): anything not study/proxy-
// backed renders with ~ — India publishes no per-brand tar/nicotine (COTPA
// §7(5) never in force), so ~ is the honest default here.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useApp, useProfile } from '../AppContext';
import { BRANDS, BRAND_AVERAGES, brandInfo, findBrand, isSoft } from '../brands';
import { dayKey, entriesForDay, totalSixths } from '../domain';
import { haptic } from '../haptics';
import { useNav } from '../navigation';
import { brandSwitchRoast } from '../strings';
import { color, font, radius } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function NicotineScreen() {
  const { data, switchBrand } = useApp();
  const profile = useProfile();
  const entries = data.entries;
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [roast, setRoast] = useState<string | null>(null);
  // Bumped on every pick so the roast re-animates even if the line repeats.
  const [pickNonce, setPickNonce] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const roastAnim = useRef(new Animated.Value(0)).current;

  // Spring the roast card in (fade + rise + slight overshoot) so a new pick
  // grabs the eye instead of just materialising.
  useEffect(() => {
    if (!roast) return;
    roastAnim.setValue(0);
    Animated.spring(roastAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 90,
    }).start();
  }, [pickNonce, roast, roastAnim]);

  const yourBrand = brandInfo(profile.brandId, profile.customBrandName);
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
  const nicotine = yourBrand ? (thisWeek / 6) * yourBrand.nicotineMg : null;
  const tar = yourBrand ? (thisWeek / 6) * yourBrand.tarMg : null;
  const delta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  // profile.brandId may be a legacy v1 id — resolve it so the "yours"
  // treatment matches the row it maps to.
  const selectedId = findBrand(profile.brandId)?.id;

  const trimmed = query.trim();
  // Your brand pins to the top of the list — a real "it moved" selection,
  // not just a highlight. Stable sort keeps the rest in dataset order.
  const results = BRANDS.filter((b) =>
    `${b.name} ${b.variant}`.toLowerCase().includes(trimmed.toLowerCase()),
  ).sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId));

  const pick = (input: { brandId?: string; customBrandName?: string; pricePerStick: number }) => {
    const next = brandInfo(input.brandId, input.customBrandName);
    if (!next) return;
    haptic.select(); // pairs with the roast line
    // Animate the picked row rising to the top (and the roast card in).
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRoast(brandSwitchRoast(yourBrand, next));
    setPickNonce((n) => n + 1);
    switchBrand(input);
    // Bring the top back into view — the pinned pick + roast live up there,
    // so a pick made from the bottom of the list isn't invisible.
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 22, paddingTop: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} accessibilityLabel="Back">
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
            {yourBrand && (yourBrand.estimated || isSoft(yourBrand.nicotineConfidence)) && (
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral400, marginTop: 6 }}>
                {yourBrand.estimated
                  ? `~ dataset averages — no lab data for ${yourBrand.label}`
                  : `~ estimated — no published per-variant data for ${yourBrand.label}`}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent200, marginTop: 8, lineHeight: 19 }}>
            Pick your brand below and we'll do the math on your logs.
          </Text>
        )}
      </View>

      {/* brand-switch roast */}
      {roast && (
        <Animated.View
          style={{
            borderWidth: 1,
            borderColor: color.accent,
            backgroundColor: color.accentTint10,
            borderRadius: radius.md,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginTop: 12,
            opacity: roastAnim,
            transform: [
              {
                translateY: roastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
              {
                scale: roastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.accent200, lineHeight: 19 }}>
            {roast}
          </Text>
        </Animated.View>
      )}

      {/* search (S18) */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search brands…"
        placeholderTextColor={color.neutral500}
        accessibilityLabel="Search brands"
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
        {profile.customBrandName && !trimmed && (
          <BrandRow
            yours
            name={profile.customBrandName}
            sub={`your entry · ~₹${profile.pricePerStick}/stick`}
            right={`~${BRAND_AVERAGES.nicotineMg.toFixed(1)} mg nic`}
            rightSub={`~${BRAND_AVERAGES.tarMg} mg tar`}
            onPress={() => {}}
          />
        )}
        {results.map((b) => (
          <BrandRow
            key={b.id}
            yours={selectedId === b.id}
            name={b.name}
            sub={`${b.variant} · ₹${b.price}/stick MRP`}
            right={`${isSoft(b.src.nicotineMg.confidence) ? '~' : ''}${b.nicotineMg.toFixed(1)} mg nic`}
            rightSub={`${isSoft(b.src.tarMg.confidence) ? '~' : ''}${b.tarMg} mg tar`}
            onPress={() => {
              if (selectedId !== b.id) pick({ brandId: b.id, pricePerStick: b.price });
            }}
          />
        ))}
        {results.length === 0 && trimmed.length > 0 && (
          <AddCustomBrand
            name={trimmed}
            onAdd={(pricePerStick) => {
              pick({ customBrandName: trimmed, pricePerStick });
              setQuery('');
            }}
          />
        )}
      </View>

      <Text style={{ fontFamily: font.regular, fontSize: 11, color: color.neutral500, marginTop: 20 }}>
        ~ = estimate. India doesn't publish per-brand tar/nicotine, so these numbers are
        indicative, not a health claim — and never a safety ranking. Prices are pack MRP.
      </Text>
    </ScrollView>
  );
}

function BrandRow({
  yours,
  name,
  sub,
  right,
  rightSub,
  onPress,
}: {
  yours: boolean;
  name: string;
  sub: string;
  right: string;
  rightSub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={yours ? `${name}, your brand` : `Switch to ${name}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: yours ? color.accent : color.neutral800,
        backgroundColor: yours || pressed ? color.accentTint10 : color.surface,
        borderRadius: radius.md,
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 10,
      })}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>{name}</Text>
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
          {sub}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.text }} numberOfLines={1}>
          {right}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 3 }} numberOfLines={1}>
          {rightSub}
        </Text>
      </View>
    </Pressable>
  );
}

// No match in the dataset: the user names their cigarette and sets what a
// stick costs (the one place price is user-entered — we have nothing better).
// Health numbers fall back to dataset averages, marked estimated.
function AddCustomBrand({ name, onAdd }: { name: string; onAdd: (price: number) => void }) {
  const [price, setPrice] = useState(BRAND_AVERAGES.price);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color.neutral800,
        backgroundColor: color.surface,
        borderRadius: radius.md,
        padding: 16,
      }}
    >
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>
        No "{name}" in our list.
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 4, lineHeight: 17 }}>
        Add it as your brand — nicotine and tar will use dataset averages (shown with ~) until we
        know better. What does one stick cost?
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 16 }}>
        <MiniStepper label="−" onPress={() => setPrice((p) => Math.max(1, p - 1))} />
        <Text style={{ fontFamily: font.medium, fontSize: 28, color: color.text, minWidth: 76, textAlign: 'center' }}>
          ₹{price}
        </Text>
        <MiniStepper label="+" onPress={() => setPrice((p) => Math.min(99, p + 1))} />
      </View>
      <Pressable
        onPress={() => onAdd(price)}
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: color.accent,
          borderRadius: radius.md,
          padding: 13,
          alignItems: 'center',
          marginTop: 16,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.bg }}>
          Make "{name}" my brand
        </Text>
      </Pressable>
    </View>
  );
}

function MiniStepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={8}
      accessibilityLabel={label === '−' ? 'Decrease price' : 'Increase price'}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: pressed ? color.accent : color.neutral800,
        backgroundColor: color.bg,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 20, color: color.text, lineHeight: 24 }}>
        {label}
      </Text>
    </Pressable>
  );
}
