// Onboarding — S13, per the 2a mockup minus the price step (BACKLOG P1:
// price derives from the brand's MRP, never typed): name, count/day, brand,
// triggers, pace, then the plan-ready card. Only the count is non-skippable;
// every step has a sane default so Continue always works — for the name step
// the default is simply no name (strings.ts personalization rule).

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useApp } from '../AppContext';
import { BRANDS, BRAND_AVERAGES, ONBOARDING_BRANDS } from '../brands';
import { PACE_RATE, Pace } from '../domain';
import { haptic } from '../haptics';
import { setupReaction } from '../strings';
import { color, font, radius } from '../theme';

const PACES: { id: Pace; name: string; rate: string; desc: string }[] = [
  { id: 'chill', name: 'Chill', rate: '−½ a week', desc: 'Barely feel it. Slow and certain.' },
  { id: 'steady', name: 'Steady', rate: '−1 a week', desc: 'The sweet spot for most people.' },
  { id: 'beast', name: 'Beast', rate: '−2 a week', desc: 'Aggressive. For the impatient.' },
];

const PACE_SUMMARY: Record<Pace, string> = {
  chill: 'Chill · −½ a week',
  steady: 'Steady · −1 a week',
  beast: 'Beast · −2 a week',
};

const TRIGGERS = [
  { id: 'chai', label: 'Chai breaks' },
  { id: 'meals', label: 'After meals' },
  { id: 'stress', label: 'Stress spikes' },
  { id: 'drinks', label: 'With drinks' },
  { id: 'commute', label: 'Commute' },
  { id: 'late', label: 'Late nights' },
];

const NEXT_HINT = [
  'Next: your daily count',
  'Next: your usual brand',
  'Next: your trigger times',
  'Next: your quitting pace',
  'Last one — then your plan',
];

const STEPS = 5;

export function SetupScreen() {
  const { completeSetup } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [count, setCount] = useState(9);
  // null = "something else" — priced at the dataset average, name optional,
  // refinable later from the nicotine list
  const [brandId, setBrandId] = useState<string | null>(ONBOARDING_BRANDS[0].id);
  const [brandQuery, setBrandQuery] = useState('');
  const [triggers, setTriggers] = useState<Record<string, boolean>>({});
  const [pace, setPace] = useState<Pace>('steady');

  // The 2a mockup shows five chips, but the dataset has fifteen — searching
  // reaches the rest, so a Charminar smoker isn't forced onto averages here
  // and left to discover the nicotine list later.
  const trimmedQuery = brandQuery.trim();
  const picked = BRANDS.find((b) => b.id === brandId);
  // A pick made from search stays on the list after the box is cleared —
  // otherwise the selection just disappears from the default five.
  const defaultBrands =
    picked && !ONBOARDING_BRANDS.some((b) => b.id === picked.id)
      ? [...ONBOARDING_BRANDS, picked]
      : ONBOARDING_BRANDS;
  const visibleBrands = trimmedQuery
    ? BRANDS.filter((b) =>
        `${b.name} ${b.variant}`.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
    : defaultBrands;

  const price = picked?.price ?? BRAND_AVERAGES.price;
  const trimmedName = name.trim();
  const done = step >= STEPS;
  const monthly = Math.round(count * price * 30).toLocaleString('en-IN');
  const weeksTo = (p: Pace) => Math.ceil(count / (PACE_RATE[p] / 6));
  const quitDay = new Date(Date.now() + weeksTo(pace) * 7 * 86_400_000).toLocaleDateString(
    'en-IN',
    { day: 'numeric', month: 'long' },
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingTop: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* header + progress */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: font.medium, fontSize: 22, color: color.text }}>
            stub<Text style={{ color: color.accent }}>.</Text>
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
            {done ? 'done' : `${step + 1} of ${STEPS}`}
          </Text>
        </View>
        <View
          style={{
            height: 3,
            borderRadius: radius.pill,
            backgroundColor: color.neutral900,
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${done ? 100 : ((step + 1) * 100) / STEPS}%`,
              height: 3,
              backgroundColor: color.accent,
            }}
          />
        </View>

        {step === 0 && (
          <>
            <Title>What should{'\n'}we call you?</Title>
            <Sub>
              So the wins have a name on them. First name, nickname, whatever — or leave it
              blank and stay anonymous. We won't take it personally.
            </Sub>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={color.neutral500}
              accessibilityLabel="Your name, optional"
              autoCorrect={false}
              autoCapitalize="words"
              maxLength={20}
              returnKeyType="done"
              style={{
                backgroundColor: color.surface,
                borderWidth: 1,
                borderColor: color.neutral800,
                borderRadius: radius.md,
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontFamily: font.regular,
                fontSize: 16,
                color: color.text,
                marginTop: 28,
              }}
            />
            <ReactionCard
              text={
                trimmedName
                  ? `Noted, ${trimmedName}. You'll hear it back at the good moments — not the rough ones.`
                  : 'Everything stays on this phone, name included. Nothing here has a server to leak from.'
              }
            />
          </>
        )}

        {step === 1 && (
          <>
            <Title>How many a day,{'\n'}honestly?</Title>
            <Sub>
              No judgement. Well, minimal judgement. This sets your starting budget — your plan
              only works if this number is real.
            </Sub>
            <StepperRow
              display={String(count)}
              unit="per day"
              decLabel="Decrease smokes a day"
              incLabel="Increase smokes a day"
              onDec={() => setCount((c) => Math.max(1, c - 1))}
              onInc={() => setCount((c) => Math.min(40, c + 1))}
            />
            <ReactionCard text={setupReaction(count)} />
          </>
        )}

        {step === 2 && (
          <>
            <Title>What's your{'\n'}usual?</Title>
            <Sub>
              We'll use this for nicotine and money math — pack MRP, so you never type a price.
              Change it anytime.
            </Sub>
            <TextInput
              value={brandQuery}
              onChangeText={setBrandQuery}
              placeholder="Search brands…"
              placeholderTextColor={color.neutral500}
              accessibilityLabel="Search brands"
              autoCorrect={false}
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
                marginTop: 24,
              }}
            />
            <View style={{ gap: 8, marginTop: 8 }}>
              {visibleBrands.map((b) => {
                const selected = brandId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      haptic.select();
                      setBrandId(b.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.name}, ${b.variant}, ₹${b.price}`}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: selected ? color.accent : color.neutral800,
                      backgroundColor: selected ? color.accentTint10 : color.surface,
                      borderRadius: radius.md,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>
                      {b.name}
                    </Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
                      {b.variant} · ₹{b.price}
                    </Text>
                  </Pressable>
                );
              })}
              {trimmedQuery.length > 0 && visibleBrands.length === 0 && (
                <Text
                  style={{
                    fontFamily: font.regular,
                    fontSize: 12,
                    color: color.neutral500,
                    paddingVertical: 4,
                  }}
                >
                  Nothing matches “{trimmedQuery}” — Something else has you covered.
                </Text>
              )}
              <Pressable
                onPress={() => {
                  haptic.select();
                  setBrandId(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Something else — we'll assume average"
                accessibilityState={{ selected: brandId === null }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: brandId === null ? color.accent : color.neutral800,
                  backgroundColor: brandId === null ? color.accentTint10 : color.surface,
                  borderRadius: radius.md,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}>
                  Something else
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
                  we'll assume average · ~₹{BRAND_AVERAGES.price}
                </Text>
              </Pressable>
            </View>
            <ReactionCard text={`That's about ₹${monthly}/month going up in smoke right now.`} />
          </>
        )}

        {step === 3 && (
          <>
            <Title>When do you{'\n'}usually light up?</Title>
            <Sub>Pick your triggers — we'll watch those windows and nudge you before they hit.</Sub>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
              {TRIGGERS.map((t) => {
                const on = !!triggers[t.id];
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      haptic.select();
                      setTriggers((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
                    }}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t.label}
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => ({
                      flexBasis: '48%',
                      flexGrow: 1,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: on ? color.accent : color.neutral800,
                      backgroundColor: on ? color.accentTint10 : color.surface,
                      borderRadius: radius.md,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.text }}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Title>How fast do you{'\n'}want out?</Title>
            <Sub>
              Your daily budget shrinks by this much every week. Pick what you'll actually stick
              to.
            </Sub>
            <View style={{ gap: 8, marginTop: 28 }}>
              {PACES.map((p) => {
                const selected = pace === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      haptic.select();
                      setPace(p.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}, ${p.rate}`}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      borderWidth: 1,
                      borderColor: selected ? color.accent : color.neutral800,
                      backgroundColor: selected ? color.accentTint10 : color.surface,
                      borderRadius: radius.md,
                      padding: 16,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.text }}>
                        {p.name}{' '}
                        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
                          {p.rate}
                        </Text>
                      </Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500, marginTop: 2 }}>
                        {p.desc}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: font.medium, fontSize: 13, color: color.accent300 }}>
                      {weeksTo(p.id)} wks
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {done && (
          <>
            {/* Vocative, not possessive ("Naman, your plan…" over "Naman's
                plan…"): the whole flow talks TO the user in second person,
                and this is the payoff of having asked their name four steps
                ago. A possessive would suddenly go third person. */}
            <Title>
              {trimmedName ? `${trimmedName}, your plan\nis ready.` : 'Your plan\nis ready.'}
            </Title>
            <View
              style={{
                borderRadius: radius.lg,
                backgroundColor: color.section,
                padding: 20,
                marginTop: 24,
                gap: 14,
                overflow: 'hidden',
              }}
            >
              <Svg
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                width="100%"
                height="100%"
              >
                <Defs>
                  <RadialGradient id="setupGlow" cx="80%" cy="0%" rx="70%" ry="70%">
                    <Stop offset="0%" stopColor={color.sectionGlow} stopOpacity={0.9} />
                    <Stop offset="100%" stopColor={color.section} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Ellipse cx="80%" cy="0%" rx="70%" ry="70%" fill="url(#setupGlow)" />
              </Svg>
              <PlanRow label="Today's budget" value={`${count} a day`} />
              <PlanRow label="Pace" value={PACE_SUMMARY[pace]} />
              <PlanRow label="Last cigarette" value={quitDay} accent />
              <PlanRow label="Back in your pocket" value={`₹${monthly}/mo`} />
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral500, marginTop: 16 }}>
              No cold turkey, no drama. Just a number that shrinks a little every week.
            </Text>
          </>
        )}
      </ScrollView>

      {/* bottom CTA */}
      <View style={{ padding: 22, paddingTop: 10, gap: 10 }}>
        <Pressable
          onPress={() => {
            if (done) {
              completeSetup({
                name: trimmedName || undefined,
                countPerDay: count,
                pace,
                brandId: brandId ?? undefined,
                pricePerStick: price,
                triggers: Object.keys(triggers).filter((k) => triggers[k]),
              });
            } else {
              setStep((s) => s + 1);
            }
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({
            backgroundColor: color.accent,
            borderRadius: radius.md,
            padding: 16,
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: color.bg }}>
            {done ? "Let's go" : step === STEPS - 1 ? 'Build my plan' : 'Continue'}
          </Text>
        </Pressable>
        {!done && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            {step > 0 && (
              <Pressable
                onPress={() => setStep((s) => s - 1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back to previous step"
              >
                <Text
                  style={{
                    fontFamily: font.regular,
                    fontSize: 12,
                    color: color.neutral500,
                    textDecorationLine: 'underline',
                  }}
                >
                  ← back
                </Text>
              </Pressable>
            )}
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.neutral500 }}>
              {NEXT_HINT[step]}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontFamily: font.medium, fontSize: 30, lineHeight: 37, color: color.text, marginTop: 36 }}>
      {children}
    </Text>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.neutral500, marginTop: 10 }}>
      {children}
    </Text>
  );
}

function ReactionCard({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: color.surface,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 34,
      }}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral300, lineHeight: 19 }}>
        {text}
      </Text>
    </View>
  );
}

function StepperRow({
  display,
  unit,
  decLabel,
  incLabel,
  onDec,
  onInc,
}: {
  display: string;
  unit: string;
  decLabel: string;
  incLabel: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        marginTop: 38,
      }}
    >
      <StepperButton label="−" a11yLabel={decLabel} onPress={onDec} />
      <View style={{ alignItems: 'center', minWidth: 110 }}>
        <Text style={{ fontFamily: font.medium, fontSize: display.length > 2 ? 64 : 72, color: color.text }}>
          {display}
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: color.neutral500,
            marginTop: 6,
          }}
        >
          {unit}
        </Text>
      </View>
      <StepperButton label="+" a11yLabel={incLabel} onPress={onInc} />
    </View>
  );
}

function StepperButton({
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
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: pressed ? color.accent : color.neutral800,
        backgroundColor: color.surface,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 24, color: color.text, lineHeight: 28 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlanRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: color.neutral400 }}>{label}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 18, color: accent ? color.accent300 : color.text }}>
        {value}
      </Text>
    </View>
  );
}
