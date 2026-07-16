# Backlog

Prioritized from user testing feedback (2026-07-16). Items are discussed and
agreed before implementation — do not build ahead of the priority order
without discussion.

## P0 — bugs / trust issues

- [x] **Charts show invented data for new users.** Week/month bars render the
  stated baseline for days before install, showing smokes that were never
  logged. Keep the baseline inside the budget math (needed for a sane day-1
  budget) but render pre-install days as empty (·) in every chart and the
  heatmap. *(feedback #6)* — **done 2026-07-16** (`fix/chart-baseline`): bars,
  daily-average and days-under-budget tiles, and the trend line now use real
  days only; trend shows "no trend yet" until 7 full prior days exist.

## P1 — core UX

- [x] **SOS: floating button, not a tab.** Circular floating button on the Log
  screen (accent-styled per Nocturne — no alert reds in the system). Frees a
  tab slot. *(#2)* — **done 2026-07-16** (`feat/sos-fab`): 56px accent FAB
  bottom-right on Log; back to 4 tabs.
- [x] **SOS: "I smoked it anyway" asks how much** (1 / ½ / ⅓) instead of
  silently logging a full cigarette. *(#2)* — **done 2026-07-16**: picker
  phase pauses the timer; "never mind" returns to idle without logging.
- [x] **Adopt react-navigation** (bottom tabs + native stack). Replaces
  hand-rolled conditional-render navigation (Backfill, NicotineDB); gives
  back-gestures. Target: 4 tabs (log · stats · goal · money), drill-ins as
  stack screens. *(#1)* — **done 2026-07-16** (`feat/react-navigation`):
  root native-stack (Tabs / Backfill / Nicotine / Sos), store shared via
  `src/AppContext.tsx` instead of prop drilling, swipe-back works.
- [x] **Real tab bar icons** per the 1a mockup's geometric tab marks
  (square / circle / diamond + a coin for Money), not text-only labels.
  *(#4)* — **done 2026-07-16**, same branch.
- [ ] **Profile/settings screen** to edit count/day, brand, price, pace.
  **Blocked on a design decision:** baseline changes must be effective-dated
  (apply from today forward; history keeps old values) or money-saved and
  budget history rewrite retroactively. Pace + price changes are safe today;
  count is not. Design the dated-baseline storage first. *(#7)*

## P2 — polish

- [ ] **Haptic feedback on logging** (expo-haptics; light impact on log,
  success notification on undo). No sound. *(#3)*
- [ ] **SOS prompt variety** — pool of distraction prompts per countdown stage,
  random pick, instead of the same three every time. *(#8)*
- [ ] **Tap-to-reveal bar values** (Apple Fitness pattern) — bars currently
  show values permanently; switch to showing on touch, highlighted bar. *(#5)*

## Later / needs discussion

- Notifications (SPEC S15–S17) — needs expo-notifications; limited inside
  Expo Go, best done alongside a development build.
- Cloud sync (SPEC S23) — needs a backend; DPDP delete-account requirement.
- Vetted nicotine/tar dataset to replace placeholder `src/brands.ts`.

## Issues faced so far (for the record)

- **Expo Go SDK mismatch (2026-07-15):** App Store Expo Go supports only
  SDK 54; SDK 55–57 builds stuck in Apple review. Project pinned to SDK 54 —
  see README note. Don't upgrade until the store catches up.
- **Gentle mode removed (2026-07-16):** product decision to ship roast-only;
  retires SPEC S12/NFR7. All copy still centralized in `src/strings.ts`.
- **5-tab congestion (2026-07-16):** adding SOS as a 5th tab was a mistake in
  hindsight — flagged in user testing same day. Fix tracked in P1.
- **Baseline-vs-display leak (2026-07-16):** budget math's baseline fallback
  leaked into chart rendering for new users. Fix tracked in P0.
