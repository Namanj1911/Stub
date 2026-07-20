# Review findings — work of 2026-07-18 → 2026-07-20

Scope: every commit merged to main in the last two days (budget-taper clamp →
brands dataset → splash/bundle-id → onboarding search → Goal/Profile
restructure → plan control → health timeline → post-zero → notifications →
Android notification icon). `tsc --noEmit` passes. Findings ordered by
severity; file:line refs are against current main (0054df9).

---

## 1. Log screen breaks once the budget reaches zero  — HIGH

The plan-control round deliberately let the budget reach 0 ("the plan is the
one path that is allowed to reach 0", domain.ts:106-110), and post-zero mode
was built on top of that — but the Log screen was never taught about it.
For an `arrived` or post-zero user (budget = 0, nothing smoked today):

- **Header reads "0 of a 0 budget · budget torched"** — `left > 0` is false
  when both are 0, so the torched label shows to a user who has smoked
  *nothing* (src/screens/LogScreen.tsx:148-150). This is the exact lecture
  `relapseNote()` was introduced to avoid, printed permanently.
- **Meter width is `NaN%`** — `(total / budget) * 100` is 0/0
  (src/screens/LogScreen.tsx:166).
- **The Tomorrow row is permanently "loud"** — `tomorrowLoud = total >=
  budget * 0.8` is `0 >= 0` = true at budget 0, so the row renders accented
  with the nudge line ("Tomorrow starts lower. Sleep on it.") forever, about
  a budget of 0 going to 0 (src/screens/LogScreen.tsx:71,214-225).

Design §10's rule is "no lecture, no ceremony" post-zero; all three violate
it. Decision point while fixing: `arrived` users (budget 0, unconfirmed) who
log still fall into the `torched` toast pool — probably fine mid-journey, but
worth an explicit choice.

## 2. Notification reconcile's change-detection never fires  — MEDIUM

`reconcile()` short-circuits when the planned schedule signature is unchanged
(src/notifications.ts:87-89,100-101), but the signature includes `title` and
`body`, and the copy generators pick a **random line per call**
(`roll(...)` in src/strings.ts — the milestone and nudge pools are
deliberately "rolled per call rather than per launch"). So whenever anything
is planned, every call to `planNotifications` produces a different body, the
signature never matches, and every store write + every foregrounding does a
full `cancelAllScheduledNotificationsAsync` + reschedule + permission check.
The dampener is dead code exactly when it matters (it only works when the
plan is empty). The scheduled copy also silently reshuffles on every log.

Fix options: signature over `(id, fireAt)` only, or make copy deterministic
per notification (seed the roll from id + fireAt/day).

## 3. Profile promises a quit date to a user already at zero  — MEDIUM

`weeksToQuitAtRate` floors at `Math.max(1, …)` (src/domain.ts:280-282).
GoalScreen was explicitly guarded against this ("would promise a quit date a
week away from a user already at zero" — src/screens/GoalScreen.tsx:284-288),
but ProfileScreen wasn't: at budget 0 the plan section still renders
"Last cigarette, at this pace: `<one week from now>`" and "1 wks" under
all three presets (src/screens/ProfileScreen.tsx — `target` /
`weeksToQuitAtRate(budget, PACE_RATE[p.id])`). The plan section should get an
arrived/post-zero state (or hide the date and week counts at budget ≤ 0).

## 4. Money projects from `profile.pace`, not the canonical rate  — LOW/MED

The plan round made the rate canonical: "these are what the screens should
use; the Pace versions above remain for the preset labels and onboarding"
(src/domain.ts:273-275). Goal, Profile and Health follow it, but MoneyScreen
still uses `PACE_RATE[profile.pace]` / `weeksToQuit(budget, profile.pace)` /
`quitDate(budget, profile.pace)` for its projections
(src/screens/MoneyScreen.tsx:64-70). Latent today (presets keep pace and rate
in sync), but the moment a non-preset rate exists (the date picker is
parked in BACKLOG "Later"), Money's quit day and by-quit-day savings will
disagree with Goal's. Switch to `currentPlanRate` + the rate-based helpers.

## 5. The 7-day flip counts the partial install day as clean  — LOW

`smokeFree()` counts the run from `installDayKey` (src/postzero.ts:66), so
the install day — almost always a partial day — counts as one of the seven
"lived" zero days. `countCleanDays` in the very same round excludes it for
exactly this reason: "a 'clean' install day usually means 'installed at
11pm'" (src/notificationPlan.ts:243-252). Someone who installs at 11pm and
never logs is offered "Ready to call it?" after six whole days plus an hour.
The confirm gate keeps this from being a false claim, but the two modules
apply the same silent-day reasoning inconsistently — the run should probably
start at `installDayKey + 1`.

## 6. Post-zero date/count nits on Goal  — LOW

- **"Smoke-free since" can be off by one day.** It shows the calendar date of
  `lastSmokeAt + 24h` (src/screens/GoalScreen.tsx:84-91). A last cigarette
  logged between midnight and 4am (which day-keys to the previous evening)
  yields a since-date one day *after* the first clean day-key. Deriving the
  date from `runStartDayKey` instead would match the day-key convention used
  everywhere else.
- **The offer headline overstates by one.** Eligibility requires 7 *completed*
  days, but the headline prints `sf.streakDays`, which includes today in
  progress — so the card typically appears saying "8 days clean" above copy
  that says "Seven days with nothing logged" (src/screens/GoalScreen.tsx:185,
  postZeroOfferCopy in src/strings.ts). Print `completedZeroDays`.

## 7. Re-tapping a pace preset silently re-anchors the plan  — LOW/MED

The pace chips on Profile call `setPace` unconditionally
(src/screens/ProfileScreen.tsx:166-169) — there is no `if (selected) return`
guard — and `setPace` → `setPlanRate` always writes a fresh plan record
`{fromDayKey: today, startBudget: today's budget}` (src/store.ts:319-342).
Because `startBudget` re-anchors at the *rounded* current budget, every tap
restarts the plan line's sub-half-cig progress: tapping your own already-
selected pace chip pushes the next half-cigarette step-down out by up to
~1.75 days (at Steady). Browsing Profile shouldn't delay the taper. Guard on
same-rate + same-day, or skip the write when the rate is unchanged.

The store-side migration has the same visible effect once per update: when a
build with new plan semantics first runs, `migrate()` seeds the plan anchored
at that day (deliberate, to avoid rewriting history), which holds the budget
line flat for the next couple of days.

## 8. Tomorrow card doesn't say it's conditional  — LOW (UX)

`tomorrowBudgetSixths` is arithmetically consistent with the real next-day
chain step (verified: same window, same rounding, same min) — but it predicts
**assuming no more smokes today** (src/domain.ts:243-263). Smoking after
checking raises the trailing average, so the number the user saw can rise
overnight (capped at today's budget). Observed on device 2026-07-19→20:
"tomorrow 4.5" became an actual budget of 5. Nothing wrong in the maths, but
a number that visibly climbs back up reads as a broken promise. Either label
it ("if you stop now: 4.5") or floor the display at the last shown value for
the day.

## 10. Zero budget is a one-way door with no way back  — HIGH, needs a decision

Found 2026-07-20 while fixing #3, by probing the real budget maths rather
than reading it. Once the plan reaches zero the budget can never rise again,
and nothing the app offers can restart a taper:

- **Pace presets are inert.** `setPlanRate` sets `startBudget` to the current
  budget, which is 0, so `plannedBudgetFor` returns
  `max(0, round((0 − rate·weeks)/3)·3)` = 0 for every rate and every future
  day. All three presets produce an identical, permanent zero.
- **A baseline edit does not re-seed it.** `budgetSeries` does re-seed on a
  baseline change (`if (base !== previous) budget = base`), but then mins
  against the plan — which is still 0. Probed: raising the baseline 10 → 15
  and smoking 15/day for ten days leaves the budget at **0.0**. The control
  (same relapse, no zero plan record) recovers to **0.5/day**.

So a user who reaches zero and then relapses heavily is stuck at a zero
budget for ever. The only exit is the full reset, which wipes all history.
This also gives the fixes above an uncomfortable edge: Log will say "past
the taper" and Profile "the taper is done" to someone smoking 20 a day.

The comment in `domain.budgetSeries` calls a baseline edit "the one honest
way the budget may rise" — that stopped being true when the plan ceiling
landed, and nothing was updated to match.

Not fixed, because the right behaviour is a product call, not a code call:
does reaching zero and relapsing restart a taper automatically, offer to,
or stay put? Options, roughly in order of how much they change the model:
(a) exclude a `startBudget === 0` plan record from the min once the user
logs again; (b) let a baseline edit append a fresh plan record anchored at
the new baseline; (c) an explicit "start a new taper" control on Profile,
which fits the app's ask-don't-assume habit (`postzero.ts`) best.

## 11. Notes (not bugs, worth recording)

- **No tests exist at all.** notificationPlan.ts and postzero.ts both say
  they were kept pure "so the interesting decisions can be tested without a
  device", but package.json has no test runner and there are no test files.
  The maths this round shipped (budget series with plan ceiling, tomorrow
  prediction, flip/relapse arithmetic, nudge timing) is exactly the kind of
  thing a small jest suite would pin down.
- **Stale rationale comment in store.ts** (~line 355): `ackMilestone` says
  "the earned set is derived from longest-gap-ever, which never shrinks" —
  no longer true since the long horizon relocks on relapse
  (src/health.ts:239-246). Behaviour is fine (rank comparison handles it);
  the comment is now wrong about why.
- **Self-noted process slip:** `feat/postzero-confirm` was merged without the
  on-device check the repo rules require (commit b4ed451). Still unverified
  on device as of this review.
