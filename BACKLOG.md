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
- [x] **Log screen broke once the budget reached zero.** The plan-control
  round made zero reachable (`plannedBudgetFor` is exempt from the adaptive
  `max(3)` floor) and post-zero mode was built on it, but Log was never taught
  about it: the caption printed "of a 0 budget · budget torched" at a user who
  had smoked *nothing*, the meter laid out at `NaN%` (`total / budget` = 0/0),
  and the tomorrow row sat permanently in its loud accent treatment with a
  "tomorrow starts lower" nudge, because `total >= budget * 0.8` is `0 >= 0`.
  — **done 2026-07-20** (`fix/log-zero-budget`): meter and tomorrow row retire
  together at zero, caption switches to "past the taper · nothing logged today"
  / "· on the record".
  The toast guard was the real find. `logToast` grades `after >= budget * 1.5`,
  which at zero is true of *every* log, so all of them fell into the `torched`
  pool — and the guard only covered **confirmed** post-zero users. That left
  `arrived` (plan just hit zero, the seven days not yet lived) getting "budget
  torched, we're just doing archaeology" at the most fragile moment in the app.
  Now gated on the budget being gone, not on the user having confirmed a mode:
  confirmation is consent to a mode, not a precondition for being treated
  decently.
  Device-checked 2026-07-20 via a `__DEV__`-only toggle that forced the state,
  reverted before merge (`7e3f410`). Worth repeating for other slow-to-reach
  states: it overrode one number in local React state rather than seeding a
  plan record, deliberately — a faked zero budget inside the store object
  would have reached `useNotificationSync`, scheduling the real `quit-day`
  push and permanently marking it announced, silencing the genuine one months
  later.
  **Same class of bug still open on Profile** — see P0 below.
- [ ] **Profile promises a quit date to a user already at zero.**
  `weeksToQuitAtRate` floors at `Math.max(1, …)`. Goal was explicitly guarded
  against this ("would promise a quit date a week away from a user already at
  zero"), Profile wasn't: at budget 0 the plan section still renders "Last
  cigarette, at this pace: *one week from now*" and "1 wks" under all three
  presets. Needs an arrived/post-zero state, or hide the date and week counts
  at budget ≤ 0. Found in the 2026-07-20 review — see `REVIEW_FINDINGS.md` #3.

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
- [x] **Replace default Expo app icon/splash** before anyone else installs —
  part of the ROADMAP launch checklist. Icon **done 2026-07-17** (`418d746`):
  "Snapped, still lit" mark → `icon.png`, `adaptive-icon.png`, `favicon.png`,
  source `icon.svg`. Splash **built 2026-07-19** (`feat/splash-screen`): the
  stock template `splash-icon.png` was still in place *and* unreferenced —
  app.json had no `splash` key and no `expo-splash-screen` plugin, so launches
  used Expo's default white screen before dropping into a dark UI. Now:
  `splash-icon.svg`/`.png` (mark centred on transparent, `backgroundColor`
  paints `#161826` = `theme.bg`), `expo-splash-screen` plugin at
  `imageWidth: 200`. Same pass: `userInterfaceStyle` `light`→`dark` (with
  `expo-system-ui`, without which Android ignores it) and `name`
  `stub-app`→`Stub` for the home-screen label; `slug` left alone (EAS
  identity). A `dark:` splash variant was tried and dropped — it conflicts
  with `userInterfaceStyle: dark` and is redundant on a dark-only app.
  **Verified 2026-07-19 on the iOS simulator** via a local dev build
  (`npx expo run:ios`) — Expo Go renders its own launch screen and can never
  show this. The build caught a real bug the config-level checks had passed:
  the splash logo rendered as a white square (see Issues).

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
- [ ] **Health-recovery timeline** — **design settled 2026-07-19, see
  `design/HEALTH_TIMELINE.md`.** The reset problem (classic timelines key
  off time-since-last-smoke, which resets constantly in a reduction app) is
  resolved with a hybrid: a resetting short clock anchored by longest-gap-
  ever, a never-resetting cumulative section, and a locked post-zero
  horizon. The always-growing number is **exposure avoided**, not healing
  achieved — novel, and citable without extrapolating the abstinence
  literature into partial-recovery percentages we can't source. Single
  primary source (Surgeon General 2020).
  The design also settled several things it forced: the timeline lands on
  **Goal** (not Stats) once config moves to Profile, tomorrow's budget moves
  to **Log**, the plan control becomes **presets + date picker** with the
  date genuinely constraining the budget (today pace only projects — it
  does not affect `budgetSeries()` at all), and post-zero is designed here.
  Build order in §16 — five steps, each device-testable:
  - [x] 1. Goal/Profile restructure — **built 2026-07-19**
    (`feat/goal-profile-restructure`), awaiting device check.
  - [x] 2. Plan control — **built 2026-07-19** (`feat/plan-control`):
        canonical rate, `min(adaptive, planned)`, plan exempt from the
        `max(3)` floor. Fixes a latent bug: the adaptive floor meant the
        budget could never drop below ½/day, so the quit date Goal promises
        was unreachable and post-zero could never trigger. The date picker
        from this step was removed before shipping — see Later.
  - [x] 3. Timeline phase 1 — **built 2026-07-19** (`feat/health-timeline`),
        awaiting device check. Milestone dataset is one document-level
        constant (Surgeon General 2020, CDC phrasing) — explicitly *not* the
        `FieldSource`/`SOURCES` machinery from `brands.ts`, which exists
        there only because MRP and nicotine estimates differ in confidence;
        milestones don't. `src/health.ts` carries all-time longest gap
        (widening the today-only calc in the Stats tiles), cumulative
        exposure avoided, and milestone resolution. Three decisions the
        design left open, settled in the build:
        **(a) both surfaces carry the celebration** — the Goal card is the
        invitation (it keeps nudging while an earned milestone is
        unacknowledged), the Health screen is the payoff and is what acks it.
        Visiting is the acknowledgement, so there's no dismiss control and
        nothing can be missed.
        **(b) locked rows carry a real date**, derived from the plan's quit
        date, so the day-one long-horizon section reads as a destination
        rather than a wall of grey.
        **(c) cumulative counts from install day only**, consistent with
        Money and the P0 display rule — we only do arithmetic on days we
        actually watched.
        Also: exposure avoided is **not clamped per day**. A day above
        baseline subtracts, exactly as it does in Money; clamping would hide
        over-baseline days behind a number that only ever rises, which is the
        same lie in the other direction. The screen states the net-negative
        case in words (`healthBehind`, mirroring `moneyBehind`).
        One small refactor fell out: `priceRecordAtEndOfDay` is now exported
        from `domain.ts` (was a private price-only helper) because the
        avoided-exposure math needs the same effective-dating rule to find
        the *brand* in effect, not just the price.
        **Owner feedback round, same day — gold milestones.** Two notes on
        device, one of which was a real bug:
        *(i) the reset was invisible.* Logging a cigarette does drop every
        `reached` milestone to `earned` (verified), but the two states
        differed only by a small word and a border shade, so nothing
        perceptible happened and it read as "achievements never come back
        off". Fixed by making the three states unmistakable rather than by
        relocking: relocking would break §9.1 and re-create exactly the
        Model A misery loop §3 rejects — a 10/day smoker resets every ~90
        minutes, so permanent records are the only thing that lets this
        screen ever show progress. Live milestones are now bright gold,
        filled and haloed with a `RIGHT NOW` badge; banked ones are flat,
        dimmer metal marked `BANKED`; locked are hollow grey rings. You keep
        the medal, you visibly stop wearing it. Badges carry the state in
        words as well as hue, so the distinction doesn't depend on colour
        vision.
        *(ii) accent purple didn't feel earned.* Gold is now a **third
        sanctioned theme exception** (`theme.ts` previously said "two are
        sanctioned; add no others" — extended deliberately, owner's call).
        The reasoning that keeps it honest: accent purple is the app's
        ambient colour and says "this is Stub", not "you won something";
        gold is the one colour the UI never otherwise uses, so it can only
        mean earned. Milestone marks and their cards only — never general
        emphasis, never on a control. Contrast checked: gold 9.6:1 on bg,
        goldDim 5.3:1 on surface, both past AA.
        The medal (gold ring + filled centre, reusing the Money tab icon's
        circle-and-dot idiom) lives in `src/Medal.tsx` since Goal and Health
        both draw it — same top-level-component pattern as `ProfileButton`.
        Also fixed: a `HEALTH_CLOCK_LINES.building` line said "Still going",
        which is nonsense at 0m immediately after a log. No line in that pool
        may presume elapsed time; the reset stays quiet either way.
  - [x] 4. Post-zero mode — **built 2026-07-19** (`feat/post-zero`),
        awaiting device check. `src/postzero.ts` owns one question ("which
        mode?") and the streak arithmetic; nothing is persisted, so the mode
        is derived from `entries` on every read and a relapse is honest by
        construction — there is no stored "you are quit now" flag that could
        disagree with the logs.
        **Goal now has three tenses**, not two: `tapering` → `arrived` →
        `postZero`. The middle one was not in the design and turned out to be
        necessary — a user whose budget has hit zero but who hasn't lived the
        seven days is a real, common state, and the rate math floors at
        `max(1, …)` so it would have promised "quit in 1 week" to someone
        already at zero. All three share one `HeroCard`: the screen changes
        tense, not furniture.
        **Corrected a phase-3 bug this step surfaced.** §9.1 row 4 says the
        long horizon *resets* on a relapse, but phase 1 banked both horizons
        off longest-gap-ever. Long-horizon marks are claims about *sustained*
        abstinence ("circulation has improved"), so they are only true while
        the abstinence is — someone whose record fortnight was last year,
        smoking daily since, has not halved anything. Now short banks
        permanently and long relocks, which is also what post-zero needed.
        Fallout: `furthestBanked()` exists because any copy promising "that
        one's permanent" must cite a *short* mark, or it promises permanence
        about a claim that expires on the next cigarette.
        **Celebration is now a high-water mark** (`milestoneRank`). Caught on
        device: because a relapse relocks the long horizon, `furthestEarned`
        moves *backwards* (2wk → 24h), and the old `earned.id !== ackedId`
        test read that regression as something new — the app threw a gold
        celebration seconds after the user slipped. Exactly the ceremony §10
        bans. Ranks are compared and the ack only ever moves forward.
        Also: a post-zero slip bypasses `logToast` entirely (`relapseNote`).
        With a budget of zero every log lands in the `torched` pool —
        "budget torched, we're just doing archaeology" — a lecture about a
        budget that no longer exists, at the user's lowest moment.
        **Silent-day guard — decided and built 2026-07-19**
        (`feat/postzero-confirm`), closing the ⚠ that this step left open. The
        problem: a post-install day with no entries counts as a zero day (the
        app's existing convention — `domain.trailing7Totals`, "a clean day is
        a clean day"), but the app cannot distinguish "didn't smoke" from
        "didn't open the app", so someone who installs, logs once and goes
        quiet for a week was flipped into post-zero and told they're
        smoke-free — a claim we have no evidence for.
        Chosen: **(a) confirmation tap.** At seven clean days Goal now shows an
        *offer* (`GoalMode` gains a fourth tense, `offer`) and the user
        confirms; the app stops asserting and asks, so the claim belongs to
        the only party holding the evidence. Options (b) require app activity
        and (c) decay the streak were rejected for the same reason: both
        punish the user who genuinely stopped smoking and therefore stopped
        opening the app, which is the success case. (d) accept-and-say-so
        can't hedge a mode change that rewrites three screens' tense.
        The stored value is `postZeroConfirmedFrom`, **the day-key the
        confirmed run began, not a boolean** — that's what preserves this
        step's derived-from-`entries` honesty. A relapse starts a new run, the
        stored day stops matching, and the mode falls away on its own: no flag
        to clear, no stale "you are quit now", and a later run gets asked
        again. A stale value can never spuriously re-match, since any run
        containing the old start day would have to span the relapse that broke
        it (verified by sweeping every relapse/recovery pair). Absent field
        means never-asked, so there is no migration.
        Two things that fell out: eligibility deliberately does **not** require
        a zero budget, so a user still mid-taper who simply hasn't smoked in a
        week gets asked too — a better moment than either the taper card or
        the old silent auto-flip. And there is **no decline control**: not
        tapping is the "no", so a refusal is never a state we have to store
        and later un-store. Offer copy may neither congratulate (the days
        aren't in evidence until the user says so) nor pressure (declining
        includes "I smoked and didn't log it", which is the honesty the
        question is fishing for).
        ⚠ **Merged to main un-device-checked** (owner's call, 2026-07-19) —
        the one deliberate exception so far to the AGENTS.md rule that nothing
        merges before the owner has seen it running in Expo Go. Logic was
        verified by exercising the compiled module directly (20 cases: the
        silent-week offer, consent surviving further clean days, a relapse
        dropping the mode and re-asking, re-confirmation, and a sweep proving
        no relapse/recovery pair can revive a stale consent) — but **no part
        of the offer card has been seen rendered**, and per the splash
        post-mortem a typecheck is not verification. Still unchecked: the
        card's layout, the copy in situ, and the gold confirm button — gold
        had only ever been used on milestone marks and cards, and the P3 note
        that sanctioned it said "never on a control". This is its first use on
        one; if it reads as general emphasis rather than "you earned this",
        that note wins and the button changes. Reaching the state needs seeded
        history, so mind the AsyncStorage clobbering trap in Issues. Owner to
        check on device and open a follow-up branch for anything found.
  - [ ] 5. Timeline phase 2 (milestone pushes — needs the dev build)
- [ ] **Post-zero mode** — the product story currently ends at the quit
  date; for Smoke Free/Kwit, what comes after *is* the product. At zero,
  flip into a smoke-free companion: smoke-free streak, money saved keeps
  compounding, SOS stays, a relapse is logged honestly without resetting
  the world. **Designed 2026-07-19 as part of `design/HEALTH_TIMELINE.md`
  §10** (it shares most of its surface with the timeline's locked section);
  tracked as step 4 above. Still must ship before the first real cohort
  reaches its quit date, or we lose users at the moment the app succeeds.

## Later / needs discussion

- **Quit-date picker — built 2026-07-19, pulled the same day, deferred to
  after the friends-and-family beta.** Originally decided 2026-07-18 to
  *replace* the pace blocks; revised 2026-07-19 to sit alongside them, then
  removed before shipping. Owner's call, and the reasoning is the keeper:
  the presets **give the user a way out**. A preset asks "how hard do you
  want to push", which someone can answer on day one; a date asks for a
  commitment they have no basis to make yet and then quietly becomes a
  thing to fail at. Same "reduce onus on the user" principle that killed
  the loose-vs-pack question and user-entered prices. Revisit after beta,
  when we know whether people actually want to name a date.
  - **What stayed** (deliberately, and this is the point): `planHistory`,
    `plannedBudgetFor()`, the `min(adaptive, planned)` budget and the floor
    exemption all remain. They are what makes a *pace* bite; none of it was
    about dates. Re-adding the picker later is then pure UI against a
    schema beta users have already migrated — no second migration against
    real data, which is the expensive and risky part.
  - **The lesson, so we don't rediscover it:** the first implementation
    rounded the rate up to a whole sixth/week *and* the date up to whole
    weeks. With a 4/day budget, 9 of 15 pickable dates snapped to a
    different date; at 2/day only 6 targets were reachable at all. It read
    as "the picker ignores me". A fractional rate with the date derived in
    **days** round-trips exactly for every date and budget — verified
    numerically before removal. Do it that way next time.
  - Still open from the original item: too-soon dates (rate would exceed
    cold turkey) and rescheduling mid-taper. §11.3/§15 of
    `design/HEALTH_TIMELINE.md` already have decisions for both.
  - Interim retune shipped 2026-07-18 and still stands: paces are ½/1/2
    cigs/week (was ¼/½/1 — chill sat below the half-cig display granularity
    and stretched a 10/day smoker's quit to 40 weeks).
- [x] Notifications S15 + S17 + milestone roasts — **done 2026-07-19**
  (`feat/notifications`), device-tested in Expo Go via the `__DEV__` sample
  button (permission prompt, delivery, banners, tap-through). The *timing*
  rules — 80% threshold, the 8pm gate, quiet hours, once-ever bookkeeping —
  are covered by planner fixtures rather than the device, since none of them
  can be observed inside a testing session; first real proof comes from a few
  days of ordinary use.
  Local scheduled notifications only, so they run in Expo Go today and need
  the dev build only to ship (GO_LIVE §7.3). `src/notificationPlan.ts` is the
  pure planner (no expo, no IO — the timing decisions are testable without a
  device); `src/notifications.ts` owns permission, the Android channel and an
  idempotent `reconcile()` that cancels and rebuilds the whole schedule on
  every store change. That eager cancel is the only mechanism available for
  un-saying something that stopped being true, because the OS fires these
  while our JS is dead and nothing can be re-checked at delivery.
  - S15 fires 45 min after the log that crossed 80%, anchored to that
    entry's timestamp (anchoring on `now` walks it later on every reconcile
    and it never arrives). Dropped once the budget is fully spent.
  - S17 schedules tomorrow-9am from an evening (≥8pm) reconcile, so it still
    lands for someone who never reopens the app. The evening gate doubles as
    the mitigation for post-zero's known limitation — the app can't tell
    "didn't smoke" from "didn't open the app", and pushing "a smoke-free
    day!" on that ambiguity is the most trust-damaging thing here.
  - Milestones trimmed to first-under-budget, first-clean-day, quit-day and
    streaks at 3/7/14/30. SPEC's unbounded "each week on plan" is the badge
    spam this backlog rules out.
  - Permission is requested only when something is actually pending — a
    first-launch prompt is the fastest route to a permanent iOS denial.
  - Toggles per category live on Profile, plus a `__DEV__`-only "send a
    sample" button: the real triggers (45 min, 9am tomorrow) cannot be
    observed inside a testing session, and the splash post-mortem below is
    the standing argument against calling config-level checks verification.
  - Still open, deliberately: **S16 craving-window alerts** (the histogram,
    the minimum-data gate and the 2/day cap are more work than S15 and S17
    combined, and it's the one most likely to feel creepy — ship these two,
    live with them, then decide). Health-timeline milestones are **not**
    pushed; they already celebrate in-app and pushing them would
    double-celebrate one moment. First-under-budget and first-clean-day can
    land the same morning on a strong day 1; judged acceptable since it
    happens once ever.
  - [x] **Android notification icon** — **done 2026-07-20**
    (`feat/android-notification-icon`): `assets/notification-icon.svg` →
    96×96 white-on-transparent PNG, plugin `icon` now set. Android masks the
    image to its alpha channel and tints it, so this is a *silhouette*
    problem, not a scaled-down logo: everything in the mark that carried
    meaning through colour had to go. A first in-repo attempt (two bars, one
    gap, rotated -30°) was rejected by the owner as not good enough; the
    shipped icon is **option D from a fresh Claude design pass**
    (`design_handoff_stub_app 3/assets`, see its ICONS.md) briefed with the
    findings from that attempt. What the findings established, so nobody
    rediscovers them: the ember's radial glow flattens to a solid disc, and
    the ember *dot* merges invisibly into the tip while they touch — the
    handoff's answer is to **detach the ember** and float it beyond the
    broken half, which keeps "still lit" legible as a clean ~4px dot at
    status-bar size; the smoke wisp is ~1px at that size and read as fuzz
    (a smoke variant F exists in the handoff, not chosen); the filter band
    kept as a notch read exactly as wide as the break, making three loose
    chunks of one snapped cigarette — the shipped icon has no notch, the
    break plus the ember gap carry the whole concept.
    Variants were compared as rendered pixels at true 24px, not at 96px:
    every decision above only becomes visible at the size it ships at.
  - **Fixed while here: the `color` tint was `#161826`**, the theme
    *background* — almost certainly copied from the splash plugin's
    `backgroundColor` two entries below it, where that value is correct. In
    expo-notifications `color` is not a background; it is the accent the
    white icon is tinted with in the tray, so the app was set to stamp
    near-black on Android's light notification shade. Now `#9184d9` (theme
    accent) — the P3 gold note's own reasoning applies: accent purple is the
    app's ambient colour and says "this is Stub". 3.2:1 on a white shade,
    past the 1.4.11 non-text minimum.
  - ⚠ **Not device-verified**: notification icons are an Android-only surface
    and there is no Android device or dev build yet, so nothing here has been
    seen in a real tray. The asset was verified by decoding actual pixels
    (96×96 RGBA, 73% genuinely transparent, every visible pixel pure white) —
    which is the check the splash post-mortem asks for and which `hasAlpha`
    failed to provide — but per that same post-mortem, that is not the same
    as looking at the screen. First Android build should confirm it.
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
- **Splash rendered as a white box (2026-07-19):** the splash PNG was
  rasterized from `splash-icon.svg` with QuickLook (`qlmanage -t`), which
  flattens onto opaque white. It was then "verified" with
  `sips -g hasAlpha`, which only reports that an alpha *channel* exists —
  it said yes while every pixel was `rgba(255,255,255,255)`. The native
  asset check inherited the same bad file, so every layer of verification
  passed and the splash still rendered a white square on `#161826`.
  **Lessons:** (1) rasterize SVG with `rsvg-convert` (`brew install
  librsvg`), never `qlmanage`; (2) to check transparency, decode actual
  pixels — `hasAlpha` proves nothing; (3) config-level checks cannot
  substitute for looking at the screen. Caught only by building to the
  iOS simulator.
- **Seeding AsyncStorage under a running app gets clobbered (2026-07-19):**
  driving the health/post-zero screens needed months of fake history, so the
  store was seeded by writing AsyncStorage directly. Edits kept silently
  vanishing — the app rendered the *old* state and the file on disk came back
  without the change. Two causes, both worth knowing: (1) the app persists
  its in-memory state on any `update()` (the Health screen acks a milestone
  on mount), so a write made while it is running is overwritten moments
  later — **terminate first, then write, then launch**; (2)
  `@react-native-async-storage` spills large values out of `manifest.json`
  into a sibling file and leaves the manifest entry `null`, so a script that
  only edits the manifest writes into a void. Read whichever of the two
  actually holds the value.
- **The simulator cannot be tapped (2026-07-19):** `xcrun simctl` has no
  tap/swipe verb, so screens behind a navigation push or below the fold are
  unreachable by script. Workarounds that cost nothing and revert cleanly:
  a temporary `initialRouteName` on the navigator to land directly on a
  screen, and a temporary `contentOffset` on its `ScrollView` to inspect a
  lower section. Both are throwaway edits — check `git diff` is empty before
  committing, since they are easy to leave behind.
- **`simctl launch` does not reload a running app (2026-07-19):** a change
  looked completely absent from the simulator — the new element simply
  wasn't on screen — while every indirect check said it had shipped: Metro
  logged fresh bundles, and the served bundle contained the new string.
  Cause: `xcrun simctl launch` on an already-running app just foregrounds
  it, so the simulator kept rendering a bundle from an earlier session.
  Fix: `xcrun simctl terminate <bundle-id>` first, then launch. Fast
  Refresh also *preserves navigation state*, so a pushed screen stays
  pushed across edits — a cold restart is needed to re-test an initial
  route. Same lesson as the splash bug: the screen is the only witness,
  and "Metro bundled it" is not the same as "the app is running it".
- **Homebrew not on the agent's PATH (2026-07-19):** a later `npx expo
  run:ios` failed with "CocoaPods CLI not found… spawn brew ENOENT" even
  though `brew install cocoapods` had already been done. Both
  `/opt/homebrew/bin/brew` and `/opt/homebrew/bin/pod` existed — the
  non-interactive shell just doesn't load the profile that adds
  `/opt/homebrew/bin` to PATH. Fix: `export PATH="/opt/homebrew/bin:$PATH"`
  before `run:ios`. The error message blames the install, not the PATH,
  which sends you off reinstalling something that is already there.
- **Toolchain for local iOS builds (2026-07-19):** macOS system Ruby is
  2.6.10 and CocoaPods needs `ffi`, which requires Ruby >= 3.0, so
  `gem install --user-install cocoapods` fails. Fix is `brew install
  cocoapods` — it vendors its own Ruby and never touches system Ruby.
  Xcode's own `prebuild`/`run:ios` flow needs no manual Xcode use.
