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
- [x] **Profile/settings screen** — edit count/day, brand, pace. Design
  settled 2026-07-17 — **built, device-tested and merged 2026-07-17**:
  `Profile` stack screen reached from a person-mark on every tab header,
  onboarding trimmed to 4 steps (price step retired), NicotineScreen does
  the brand switching (with roast) and custom-brand entry. Same round from
  device feedback: danger-red reset box (2nd sanctioned theme red), Money
  temptation pool (rolled per launch), Log's "last one" pill chip. Real
  sourced MRPs for `src/brands.ts` remain open — see Later.
  - **Baseline (count/day) is effective-dated** at day-key granularity:
    `baselineHistory: {fromDayKey, countPerDay}[]`, seeded at onboarding.
    Edits apply from today's day-key; same-day edits collapse (last write
    wins) — no separate "fix a typo" path, a same-day correction is a clean
    rewrite. Money values each day against the baseline in effect that day;
    the budget's pre-install fallback uses the first record.
  - **Price derives from brand MRP, never user-entered** (money-saved is
    approximate by design; reduce onus on the user). Effective-dated at
    timestamp granularity: `priceHistory: {fromTimestamp, pricePerStick,
    brandId}[]`. A brand switch appends a record; logged entries are valued
    at the price in effect at `entry.timestamp` (backfill-safe); a day's
    avoided smokes are valued at that day's ending price. Retires the Money
    tab's manual price stepper. A dataset MRP revision (shipped in an app
    update) appends a record at first launch after update. Money screen
    shows "MRP as of <date>" fine print.
  - **Unlisted brand:** the user names the cigarette and enters its price —
    the one place price is user-entered, since the DB has nothing to offer;
    nicotine/tar fill from dataset averages, flagged estimated and displayed
    with a ~ prefix.
  - **Data export + reset** (added 2026-07-17): "share my data" as JSON via
    the share sheet — the only backup until cloud sync exists — plus a
    confirm-guarded "reset all data". Both live on the profile screen.
  - **Nicotine roast on brand switch** (added 2026-07-17): on switching,
    pull both brands' records and roast the nicotine delta (one
    strings-table entry + a lookup).
  - **Migration:** existing installs synthesize `baselineHistory` from flat
    `countPerDay` + `installDayKey`, and `priceHistory` from the stored
    `pricePerStick` (existing savings history stays honest); DB pricing
    takes over on the next brand switch.
  - **Prerequisite:** extend `src/brands.ts` with `packMrp`, `packSize`,
    `asOf` (real sourced MRPs — printed MRP is the only citable source).
  *(#7)*

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
- [x] **Day chart mislabels midnight–4 am smokes** (self-identified): a 1 am
  smoke correctly counts toward the previous day (4 am boundary) but renders
  in that day's "6–9" morning bucket. Extend the night bucket to cover
  9 pm–4 am. — **done 2026-07-18** (`fix/day-chart-night-bucket`): last
  bucket is now "9p–4" (21:00–03:59); 4–6 am still folds into morning.
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
- Milestone roast notifications (decided 2026-07-17): push a playful roast
  when the data hits a milestone that proves the app understands the user.
  Scope deliberately trimmed to a few important ones — personal, not badge
  spam. Rides on the same notifications/dev-build infra as S15–S17.
- Product analytics for the maintainer (DAU/MAU, retention, feature usage) —
  the first feature that sends data off-device, so it drags in user consent,
  a privacy policy (DPDP), and a telemetry backend choice. Own design pass.
- Go-live readiness plan: what shipping to real users requires (EAS dev
  build → TestFlight → App Store listing, privacy policy, crash reporting,
  support/feedback channel) and which core-design risks to settle before
  launch (multi-user means cloud sync + auth + DPDP delete-account).
  Research and write-up task before anything is built.
- Cloud sync (SPEC S23) — needs a backend; DPDP delete-account requirement.
- Vetted nicotine/tar dataset to replace placeholder `src/brands.ts`
  (MRP/pack-size columns land earlier, with the profile screen).
- Remote-fetch brand/price database (server-hosted, updatable without app
  releases) — decided 2026-07-17 to ship the dataset inside the app for now;
  remote fetch needs real research + design.

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
