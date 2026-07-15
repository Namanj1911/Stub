# Handoff: Stub — Cigarette Reduction Tracker

## Overview
Stub is a mobile app that helps smokers quit gradually. Users log every cigarette (including fractions for shared ones), get an adaptive daily budget that shrinks on a chosen taper pace, and see a concrete quit date. Feedback copy is playful/sarcastic ("roast mode", toggleable to gentle). Target: young Indian professionals, urban, smartphone-native.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs as a native mobile app**. No codebase exists yet: **React Native (Expo) recommended**; Flutter is an acceptable alternative. Build story-by-story from `SPEC.md`, using this README and the prototype as the visual source of truth.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy and interactions are final. Recreate pixel-perfectly. All design tokens below come from the Nocturne design system stylesheet (`styles.css` in this bundle — read its `:root` variables for the full ramps).

## How to read the prototype
`Stub Prototype.dc.html` renders phone mockups in a browser. Screens are labeled with badges:
- **1a** — Interactive core app: Log / Stats / Goal tabs (v1)
- **1b** — Dashboard variant: rings summary (v1)
- **1c** — Dashboard variant: month heatmap (v1)
- **2a** — Onboarding, 5 steps (v2)
- **2b** — Backfill a missed cigarette (v2)
- **2c** — Lock-screen notifications (v2)
- **2d** — Nicotine database (v2)
- **2e** — Craving SOS (v2)
- **2f** — Money saved (v2)

Full user stories with acceptance criteria: `SPEC.md` (stories S1–S23). Product roadmap: `ROADMAP.md`.

## Screens / Views (summary — see SPEC.md for full ACs)

### 1a Log screen
- Header: "stub." wordmark (22px, weight 500, accent-colored period) + time since last cigarette, updating per minute.
- Large fractional count (e.g. "3⅚") ~64px, budget line, horizontal progress meter (6px tall, 999px radius, accent fill on neutral-900 track; caps at 100%).
- Three log buttons in a row (grid, 8px gap): "1", "½", "⅓ shared" — surface bg, 1px neutral-800 border, radius-md, ≥44px tall; hover: accent border; active: scale(.96).
- "undo last" text link (12px, neutral-500, underline).
- "Today's drags" list: rows with accent dot, amount, full/shared tag, time; each row has edit (pencil) and delete (trash) 28px icon buttons — edit opens an inline row with 1/½/⅓ replacement options + cancel.
- Toast: surface card, 13px, roast/gentle copy, auto-dismisses ~3.5s.

### 1a Stats screen
- Segmented control Day/Week/Month (seg pattern: surface bg, selected = accent 10% tint + accent border).
- Bar charts: bars = neutral ramp, over-budget bars = accent. Budget ring (SVG, r=46, accent stroke on neutral-900 track).
- Stat tiles 2×2: Daily average (7d), vs last week %, Days under budget n/7, Longest gap.
- One insight card per view (danger window / weekend pattern).

### 1a Goal screen
- Pace picker: 3 options (Chill −¼/wk, Steady −½/wk, Beast −1/wk), selected = accent border + 10% tint.
- Plan card on --color-section ground with radial glow: "Last cigarette: <date>", plan line, glide-path bar chart (weekly budgets to zero, max 8 bars).
- "Progress to quit day" percentage. Tomorrow's budget card.

### 2a Onboarding (5 steps + done)
Progress: "n of 5" + 3px accent progress bar (20%/step, .3s width transition).
1. Count/day: circular −/+ steppers (52px), 72px number, roast reaction card.
2. Brand: single-select list rows (name + variant/price meta), selected = accent border + tint.
3. Price per stick: same stepper pattern, ₹5–60, monthly-burn reaction card.
4. Triggers: 2-col multi-select chips (chai, meals, stress, drinks, commute, late nights).
5. Pace: 3 rows with rate + description + weeks-to-zero.
Done: plan card on --color-section ground (budget, pace, quit date, ₹/mo saved). Continue button = accent fill, radius-md, 16px pad; "← back" underlined link.

### 2b Backfill
- "Which day": 4 chips (Today/Yst/Sun/Sat). "Roughly when": 2×2 buckets (Morning/Afternoon/Evening/Night with time ranges).
- "How much": 1/½/⅓ selects the step unit only. "Total" stepper row: −/+ (36px circles) add/subtract that unit, starting at 0; reset link; guard against adding 0.
- CTA: "Add <total> · <day>, <bucket>" (accent fill). Backfilled entries marked; stats recompute.

### 2c Notifications (visual mock)
Lock screen, radial-gradient ground. Three notification cards (blurred surface at 82% + backdrop-blur(20px), radius-lg): budget nudge, craving-window alert (chai break), milestone (accent border). Caps: max 2 nudges/day, category toggles, quiet hours.

### 2d Nicotine database
- Intake card on --color-section ground: "~84 mg" nicotine this week, trend, tar line.
- Search field (surface, neutral-800 border). Brand rows: name + "yours" pill (accent outline, 10px uppercase), variant · ₹price/stick left; nicotine mg + tar mg right, nowrap. Data is placeholder — production needs a vetted dataset.

### 2e Craving SOS
- Idle: 190px circular accent-outline button "I'm craving"; weekly outlasted stat row.
- Active: 5:00 countdown, 210px SVG ring (r=96, stroke 8, dasharray animates down), rotating distraction prompts at >200s / >100s / final.
- Outcomes: "It passed. I win." (accent outline) or "I smoked it anyway" (text link) → result screen with roast/gentle copy.

### 2f Money saved (visual mock)
- Hero card on --color-section ground: ₹ total saved (44px), week + days-in line.
- Goal progress card (Goa flight, 6px progress bar, % + ETA). Projection rows: by quit day, one year. Formula footnote: savings = (baseline − actual) × stick price, daily.

## Interactions & Behavior
- All logging optimistic, <100ms perceived; never block logging (honesty over enforcement).
- Buttons: hover = accent border / brightness(1.1) on fills; active = scale(.94–.98); focus-visible = 2px accent outline, offset 2px.
- Toasts auto-dismiss ~3.5s. Progress-bar width transitions .3s.
- Roast mode toggle flips every feedback string app-wide (all copy pairs in one strings table).

## State Management (reference: prototype logic class in the .dc.html)
- Entries: array of { sixths, timestamp, backfilled? } — **all counts are integer sixths** (⅓=2, ½=3, 1=6). No floating-point cigarette math.
- Adaptive budget = max(3 sixths, round(90% of trailing 7-day avg to nearest 3)). Day boundary = 4:00 AM local.
- Taper: pace ∈ {0.25, 0.5, 1} cig/week; quit date = today + ceil(baseline/pace) weeks; tomorrow = max(0, budget − pace×6/7 sixths).
- Onboarding output: { countPerDay, brandId, pricePerStick, triggers[], pace }.
- Craving SOS: idle → countdown(300s) → outcome(survived|smoked) logged.

## Design Tokens (Nocturne — full ramps in styles.css)
- Ground: --color-bg #161826 · Text: --color-text #e9e9ed · Accent: #9184d9 (blurple)
- Surfaces: --color-surface; section ground: --color-section (deep indigo, used only for hero/plan cards) + --color-section-glow radial.
- Ramps: --color-neutral-100…900, --color-accent-100…900 (dark steps 700–900 for tints/borders, 100–300 for text on tints). Accent for paragraph text = --color-accent-300.
- Type: Inter everywhere (--font-heading/--font-body); headings max weight 500 — hierarchy via size/space, not bold.
- Radii: --radius-sm/md/lg (8px base). Spacing: --space-* (0.7× dense scale). Shadows: --shadow-sm/md/lg.
- Selected state pattern: 1px accent border + accent 10% tint fill.
- Buttons are outlined, not filled (exception: primary CTAs in mobile flows use accent fill with --color-bg text).
- Icons: Phosphor icons. No pure black/white anywhere.

## Assets
- `styles.css` — Nocturne token sheet + component layer (source of all values).
- No image assets; all visuals are CSS/SVG. Notification emoji (☕ 🎯 ✈️) are content, keep them.

## Files
- `Stub Prototype.dc.html` — all 9 screens, interactive (view in a browser via the design tool; the logic class at the bottom is readable JS containing all domain math and copy strings).
- `SPEC.md` — 23 user stories, acceptance criteria, NFRs, suggested build order.
- `ROADMAP.md` — v1/v2/v3 feature plan + off-app launch checklist.
- `styles.css` — design tokens.

## Suggested first steps for Claude Code
1. Scaffold Expo app (TypeScript). 2. Port tokens into a theme module. 3. Build S22 (local storage) → S13 (onboarding) → S1–S4 (logging) per SPEC.md build order.
