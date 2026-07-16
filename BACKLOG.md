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

## P1 bugs — self-identified in code review (2026-07-16)

- [x] **SOS countdown drifts when app is backgrounded.** — **done 2026-07-16**
  (`fix/p1-bugs`): remaining time derives from a wall-clock end timestamp on
  every tick; backgrounding can no longer freeze the countdown.
- [x] **"Time since last" breaks after backfill.** — **done 2026-07-16**: the
  header uses the max timestamp across entries. Decision: "undo last" keeps
  last-*action* semantics (a just-added backfill is undone first) — documented
  in LogScreen.

## P2 — polish

- [x] **Haptic feedback on logging** *(#3)* — **done 2026-07-16**
  (`feat/polish`): light impact on log/backfill-add/SOS-smoked, selection
  tick on undo, success notification on craving survived. No sound.
- [x] **SOS prompt variety** *(#8)* — **done 2026-07-16**: 3–5 prompts per
  countdown stage in the strings table, one rolled per session.
- [x] **Tap-to-reveal bar values** *(#5)* — **done 2026-07-16**: values hidden
  by default; tap highlights the bar (accent border, others dim) and shows
  its number; switching Day/Week/Month clears the selection.
- [ ] **Day chart mislabels midnight–4 am smokes** (self-identified): a 1 am
  smoke correctly counts toward the previous day (4 am boundary) but renders
  in that day's "6–9" morning bucket. Extend the night bucket to cover
  9 pm–4 am.
- [x] **Money saved can go negative** (self-identified) — **done 2026-07-16**:
  decision was show honestly, roast copy ("Goa is drifting further away");
  amounts render as −₹84, Goa progress clamps at 0%.
- [ ] **Accessibility pass** (self-identified): icon-only controls (edit,
  delete, SOS button, steppers) need `accessibilityLabel`s for VoiceOver;
  audit contrast per NFR5.
- [ ] **Replace default Expo app icon/splash** before anyone else installs —
  part of the ROADMAP launch checklist.

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
