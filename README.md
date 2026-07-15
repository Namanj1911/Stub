# Stub

A cigarette-reduction tracker that helps smokers quit gradually — log every cigarette (including fractions for shared ones), get an adaptive daily budget that shrinks on your chosen taper pace, and see a concrete quit date. The app's feedback is playfully sarcastic ("roast mode") by design.

Built with React Native + Expo (TypeScript), designed in [Claude](https://claude.ai) — the full design handoff (spec, roadmap, interactive prototype, and the Nocturne design system tokens) lives in [`design/`](design/).

## Features

- **Log** — one-tap logging (1 / ½ / ⅓ shared), undo, inline edit/delete, today's count vs budget with a progress meter, time since last cigarette, and "missed one?" backfill for retroactive honesty
- **Stats** — day/week/month charts, budget ring, stat tiles, a 28-day heatmap, one auto-picked insight (danger window / weekend pattern), and weekly nicotine intake
- **Goal** — taper pace picker (Chill −¼ / Steady −½ / Beast −1 per week), quit date, glide-path chart to zero, tomorrow's budget
- **Money** — rupees saved vs your baseline, Goa-flight goal progress, projections to quit day and one year
- **SOS** — a 5-minute craving timer with rotating distraction prompts; survived cravings become a weekly stat, smoked ones get logged honestly
- **Nicotine DB** — searchable brand list (nicotine/tar/price per stick) with your brand highlighted

## Domain rules

- All counts are stored as **integer sixths** of a cigarette (⅓ = 2, ½ = 3, full = 6) — no floating-point cigarette math
- Day boundary is **4:00 AM local**, so late-night smokes count toward the evening's day
- Adaptive budget = max(½ cig, 90% of the trailing 7-day average, rounded to the nearest ½), recomputed daily
- Never blocks logging — honesty over enforcement
- All user-facing copy lives in one table ([`src/strings.ts`](src/strings.ts)), roast tone only

## Running it

Requires Node and the [Expo Go](https://apps.apple.com/us/app/expo-go/id982107779) app on your phone.

```bash
npm install
npx expo start
```

Scan the QR code with your phone (same Wi-Fi network). If it hangs connecting, try `npx expo start --tunnel`.

> **Note:** the project is pinned to **Expo SDK 54** because the App Store build of Expo Go only supports SDK 54 (Expo's newer Go builds have been stuck in App Store review). Don't upgrade the SDK until Expo Go on the store catches up. Add packages with `npx expo install` so versions stay SDK-compatible.

## Project structure

```
App.tsx              tabs + wiring
src/theme.ts         Nocturne design tokens (source: design/styles.css)
src/domain.ts        sixths math, day boundary, budget/taper/quit-date logic
src/strings.ts       every user-facing feedback string
src/stats.ts         chart/tile/insight/heatmap computations
src/store.ts         local-first persistence (AsyncStorage)
src/brands.ts        brand dataset (placeholder — needs a vetted source)
src/screens/         Setup, Log, Backfill, Stats, Nicotine, Goal, Money, Sos
design/              design handoff: SPEC.md (user stories), ROADMAP.md, prototype
```

## Status

v1 + most of v2 from [`design/SPEC.md`](design/SPEC.md) are implemented (S1–S14, S18–S22). Remaining: notifications (S15–S17) and optional cloud sync (S23). Brand nicotine/tar data is placeholder, not medical guidance. All data stays on-device.
