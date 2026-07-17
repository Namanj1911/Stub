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
  9 pm–4 am. — **done 2026-07-17** (`fix/day-chart-night-bucket`): last
  bucket is now "9p–4" (21:00–03:59); 4–6 am still folds into morning.
- [x] **Money saved can go negative** (self-identified) — **done 2026-07-16**:
  decision was show honestly, roast copy ("Goa is drifting further away");
  amounts render as −₹84, Goa progress clamps at 0%.
- [x] **Accessibility pass** (self-identified): icon-only controls (edit,
  delete, SOS button, steppers) need `accessibilityLabel`s for VoiceOver;
  audit contrast per NFR5. — **done 2026-07-17** (`fix/a11y-pass`): labels +
  roles on all icon-only/ambiguous controls, `accessibilityState` on toggles
  (selects, segmented control, triggers), Stats bars announce their hidden
  values. Contrast audit: `neutral600` as text failed AA (4.08:1 on bg) —
  bumped 8 usages to `neutral500`; border-only buttons (SOS done, backfill
  steppers) bumped `neutral700`→`600` borders for the 3:1 non-text minimum.
  Hit targets were already ≥44px effective via `hitSlop`. Tokens untouched.
- [ ] **Replace default Expo app icon/splash** before anyone else installs —
  part of the ROADMAP launch checklist.

## P2 — round 2 (owner feedback, 2026-07-17)

All four are Expo Go-safe and local-only; the haptics pass and toast pools
are small, the other two are small-to-medium.

- [x] **Haptics vocabulary pass** *(easy)* — haptics exist at only 4 call
  sites today; survey (2026-07-17) found the gaps. — **done 2026-07-17**
  (`feat/haptics-vocabulary`): vocabulary centralized in `src/haptics.ts`
  (logged / select / destructive / emergency / survived — screens never
  import expo-haptics directly); applied at every listed site, plus the
  remaining select-style controls (Backfill day/when/unit + reset, Setup
  brand choice) for consistency. Natural timer expiry now routes through
  `finishSurvived` (bug fixed). The SOS stage-transition tick is in behind
  a marked comment — device-tested 2026-07-17 with the rest of the pass
  and kept. Define one mapping and
  apply it everywhere so feel is consistent, not per-screen:
  - *light impact* = something entered the log — already on log buttons,
    backfill-add, SOS-smoked; no change.
  - *warning notification* = destructive — **new:** entry delete on Log
    (owner ask), reset-all confirm on Profile.
  - *selection tick* = choice/value changed — already on undo; **new:**
    edit-save on Log, every stepper (Profile count/day, Backfill −/+,
    Setup steppers, unlisted-brand price), pace pickers (Goal, Profile,
    Setup), Setup trigger toggles, brand switch on Nicotine (pairs with
    the roast line), Stats segmented control and bar tap-to-reveal.
  - *medium impact* = emergency — **new:** SOS FAB press (owner ask) and
    the "I'm craving" start button; an emergency control should feel
    heavier than a log tap.
  - *success notification* = craving survived — **bug:** only the "I made
    it" button path fires it; natural timer expiry marks survived with no
    haptic (SosScreen `start()` interval). Route both through
    `finishSurvived`.
  - Decide on-device: subtle tick at SOS stage transitions (200s/100s
    prompt changes). Nothing per-second — a countdown that vibrates
    constantly is a stress machine.
- [x] **Today's Drags scrolls by itself** *(small-medium)* — owner ask:
  scroll the list, not the page. Restructure LogScreen: header, count,
  meter and log buttons become fixed chrome; the drags list becomes the
  only scrollable region (list-as-scroller with the rest as fixed views
  above — avoids nested same-axis ScrollViews, which need
  `nestedScrollEnabled` on Android and feel glitchy). Keep bottom padding
  so the SOS FAB never covers the last row; long-day edit rows must stay
  reachable. — **done 2026-07-17** (`feat/log-scroll`): chrome fixed,
  drags list is a FlatList and the only scroll region; device-tested.
- [x] **Stats tiles adapt to Day / Week / Month** *(medium)* — **done
  2026-07-17** (`feat/stats-range-tiles`): tile sets as proposed below;
  day's "vs same weekday" shows absolute cigarettes (percent is silly at
  single-day scale); under-budget counts grade each day against its own
  budget (not today's tapered one) and state their window in the label;
  nicotine row follows the range; `underBudgetStreaks()` (current + best)
  pulled forward from P3 for the Month tile — the P3 item's Stats display
  + roast strings remain open. Device-tested. *(Tile sets revised 2026-07-17
  with the P3 streak work — each range's 4th tile is now money spent; see
  the streak entry.)* — the 4 tiles
  render identically in all three ranges; "Longest gap today" is
  meaningless on Month (owner ask). Precedent exists: the heatmap is
  already month-only. Proposed sets (agree before build):
  - *Day:* longest gap today · average gap today · first smoke (time) ·
    vs same weekday last week.
  - *Week:* daily average (7d) · vs last week · days under budget (x/7) ·
    cravings survived (7d) — the data already exists in the store and is
    currently visible only on the SOS result screen.
  - *Month:* daily average (28d) · vs previous 4 weeks · days under
    budget (x/28) · best under-budget streak — reuses the P3 streak
    computation once it lands.
  - Also scope the "Nicotine this week" row to the selected range while
    in there. `tiles()` in `src/stats.ts` grows a range parameter;
    "days under budget" must state its window in the label either way.
- [x] **Budget-aware log toast pools** *(easy)* — every log currently shows
  one of 3 fixed lines (`logOver/logNear/logWithin`), so the roast repeats
  by the second cigarette. Split into finer budget states — first of the
  day · comfortably within · one-ish left · exactly at budget · over ·
  torched (≥150%) — with 3–5 lines each in `src/strings.ts`, rolled at
  random per log (same pattern as SOS prompts / temptation pool). Bonus
  hook: ⅓-shared logs can draw from a "splitting the bill" variant pool.
  Roast stays the moat; funny > mean — same bar as the existing copy. —
  **done 2026-07-17** (`feat/log-toast-pools`): 6 states, 4 lines each,
  severity-first selection, shared pool mixed in for ⅓ logs, no verbatim
  back-to-back repeats; device-tested.

## P3 — growth (from competition analysis, 2026-07-17)

Gaps vs the segment leaders (Smoke Free, Kwit, QuitNow, QuitSure, Smoke Less
Way). Ordered by value-for-effort; the first two are small, Expo Go-safe
add-ons that can be pulled forward between bigger items. Monetization is
deliberately **not** here — deferred until after beta + PMF, see Later.

- [x] **Days-under-budget streak** *(easy, Expo Go-safe)* — current + best
  streak on Stats, computed from the per-day budget data the tiles already
  use; roast strings for a broken streak. Loss-aversion is our answer to
  Kwit-style gamification — no XP, no badge spam. Pairs with the milestone
  roast notifications (Later) once those land. — **done 2026-07-17**
  (`feat/streak-display`): streak card on Week/Month only (a streak is a
  multi-day stat; unit stays days — weekly/monthly-unit streaks would read
  0 for months), filling the ring's slot under the segmented control.
  Declutter rules: "best" shows only when it beats current, roast lines
  (4 states × 3–4, rolled per launch) never restate a number the card shows —
  except broken, where the dead streak's length is the roast. Same round
  (owner feedback on device): budget ring is now **Day-only** (it's a
  today-stat; on Week/Month it repeated itself and buried the tiles), and
  each range's 4th tile became **money spent** (today/7d/28d, entries valued
  at the price in effect when lit, `~₹` for MRP-approximate) — replacing
  "vs last weekday" (useless), "Cravings survived (7d)" (still on the SOS
  result screen) and "Best under-budget streak" (redundant with the card).
  Device-tested.
- [x] **SOS breathing exercise** *(easy, Expo Go-safe)* — guided breathing
  (box / 4-7-8) inside the SOS countdown as an alternative to the rotating
  prompts. Closes the "active craving tool" gap — competitors build whole
  apps around this moment; one animation gets us most of the value. —
  **done 2026-07-17** (`feat/sos-breathing`): "breathe with me instead"
  link during the countdown swaps the prompt for a growing/shrinking guide
  circle with phase label; choice is sticky per session, countdown/outcome
  paths untouched. Device verdict trimmed the plan: one pattern only,
  in 4 / hold 4 / out 4 — the post-exhale hold dragged and 4-7-8 was cut,
  which also removed the pattern picker. Breath-cue tick on in/out (not
  holds) kept after device test; prompt-stage tick silenced while
  breathing. Pacing lives in `BREATH_SEGMENTS` constants.
- [ ] **Health-recovery timeline** — the single most motivating screen in
  every leading competitor (WHO/CDC milestones, 20 min → 10 years). One
  design decision needed first: classic timelines key off time-since-last-
  smoke, which resets constantly in a reduction app — either render the
  reset honestly (very roastable) or model partial recovery from actual
  reduction (novel; no competitor does it). Milestone data needs a citable
  source — same sourcing bar as brand MRPs.
- [ ] **Post-zero mode** — the product story currently ends at the quit
  date; for Smoke Free/Kwit, what comes after *is* the product. At zero,
  flip into a smoke-free companion: smoke-free streak, money saved keeps
  compounding, SOS stays, a relapse is logged honestly without resetting
  the world. Needs its own design pass — but must ship before the first
  real cohort reaches its quit date, or we lose users at the moment the
  app succeeds.

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
- Go-live readiness plan — **write-up done 2026-07-17**, see
  `design/GO_LIVE.md`. Headlines: launch local-only ("Data Not Collected"
  privacy label, near-zero DPDP surface); 18+ age rating is unavoidable and
  satisfies the age-gate requirement; S15–S17 notifications are local-only
  so they prototype in Expo Go and only need the dev build to ship; vetted
  brands data gates *external* TestFlight, not internal. Recommended
  sequence is §8 of the doc; next concrete steps are Apple Developer
  enrollment, icon/splash, and the EAS dev build.
- Cloud sync (SPEC S23) — needs a backend; DPDP delete-account requirement.
- Vetted nicotine/tar dataset to replace placeholder `src/brands.ts`
  (MRP/pack-size columns land earlier, with the profile screen).
- Remote-fetch brand/price database (server-hosted, updatable without app
  releases) — decided 2026-07-17 to ship the dataset inside the app for now;
  remote fetch needs real research + design.
- Android build (EAS) — India is ~95% Android, so it's the actual market for
  an India-first app. Expo keeps it cheap (mostly an EAS build target) and it
  rides the same dev-build infra as notifications. Sequence alongside
  GO_LIVE §8; on both stores, sell local-only privacy ("your data never
  leaves your phone") as a listed feature, not a footnote.
- Hindi / Hinglish roast localization — `src/strings.ts` already centralizes
  every user-facing string, so the plumbing is half-done; the real work is
  roast copy that genuinely lands in Hinglish, plus i18n details (plurals,
  numerals). No competitor serves Indian languages. Wait until copy
  stabilizes — every string change before then costs double.
- Widgets + Apple Health / Google Fit — cheap retention surface competitors
  ship (QuitNow); needs the dev build (not available in Expo Go), so it
  rides the notifications infra. Widget candidates: today vs budget, time
  since last.
- Bidi / smokeless tobacco support — bidi smokers outnumber cigarette
  smokers in India and no app serves them; the sixths/fraction model and
  MRP-based money math extend naturally. Big scope (dataset, budget
  semantics, tone) — v3 territory, revisit after PMF.
- Monetization — **deferred until beta testing + PMF (decided 2026-07-17).**
  Direction when revisited: one-time Pro unlock (~₹199–299, India-priced),
  possibly a tip jar; constraints that hold regardless: no ads ever (breaks
  the "Data Not Collected" privacy label and the trust positioning), and
  never paywall logging or SOS ("never blocks logging" applies to payment
  too). Decide the free/Pro split from beta retention data — pay for what
  people demonstrably stay for.

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
