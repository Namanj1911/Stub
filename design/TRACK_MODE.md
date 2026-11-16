# Tracker mode — an on-ramp for the not-yet-committed user

**Status:** design draft, 2026-07-26. Written per the BACKLOG P2 item *"No
on-ramp for the not-yet-committed user"* (owner decision: "write a design plan
first — own file — then action; this is a product/positioning question, not a
quick patch"). Nothing here is built. This doc exists to be argued with before
any code; the open decisions are collected in §10.

---

## 1. The problem, restated

The whole flow assumes the user has already decided to quit. The Welcome
thesis is *"Your last cigarette already has a date"*; onboarding ends on a
plan-ready card; the pace step asks *how hard do you want to push*, never
*whether* to push. A curious-but-uncommitted smoker — the "I'm not sure I want
to quit yet" tester — has nowhere to stand, and the light smoker flagged this
as the single biggest philosophical bounce risk.

The ask is an entry point that says **"just track for now"** without a budget
heading for zero, and a path from there to a real taper later.

The owner's framing (which this doc adopts wholesale): don't build a separate
"mode" that forks the app. Keep logging, money, stats, health-exposure exactly
as they are — that data is goal-agnostic. Change only **the goal**. A taper
plan and a tracker plan are the same machine with the target turned off. The
user switches between goals; everything downstream keeps recording.

---

## 2. The core idea: a plan *kind*, not a second app

Today the budget is `min(adaptive, planned)`, and the plan is an
effective-dated `PlanRecord { fromDayKey, rate, startBudget }` (domain.ts).
Switching pace **appends** a record; past days keep the regime they were lived
under, so `budgetSeries()` never silently re-grades history (the re-seed at
`planStartingOn` is what protects that invariant).

Tracker mode drops straight into that machinery: **add a `kind: 'taper' |
'tracker'` to `PlanRecord`.** A record now says not just *how fast* but *what
kind of goal is in effect from this day*.

- **`taper`** — today's behaviour. Budget descends toward zero. Graded.
- **`tracker`** — no descending target. The app **measures and mirrors**; it
  does not impose a budget or score the user as pass/fail.

Switching goals = appending a record, exactly like switching pace. This is the
key property: **the entire effective-dated, append-only, derived-from-history
design carries over for free.** No new storage subsystem, no parallel history,
and — critically — **no second migration against real beta data** (the
expensive, risky part the quit-date-picker post-mortem in BACKLOG "Later"
tells us to avoid). Existing installs migrate with `kind` absent ⇒ `'taper'`;
nobody moves.

Two mechanical rules the pace control learned the hard way carry over to kind
switches verbatim: **same-day changes collapse** (last write wins, so
dithering doesn't pile up records) and **re-selecting the goal already in
force is a no-op write** — `planHistoryWithRate`'s same-reference guard exists
because a fresh record re-anchors `startBudget` and silently delays the taper;
a kind toggle that re-anchored on every tap would do the same. A `tracker`
record keeps the `rate`/`startBudget` fields (ignored while it's in force)
rather than making them optional — one record shape, and the dormant rate is
what the invitation quotes ("at −1 a week…") when it projects a plan.

One inherited principle, stated so nobody re-litigates it: **the app never
switches goals on its own.** It may *invite* (§6), but the switch is always an
explicit tap — the same reasoning as the post-zero confirmation and
`startNewTaper`: the claim about what the user is trying to do belongs to the
user, and a mode the app assigned is a mode the app can be wrong about.

### Why not model tracker as `rate: 0`?
A flat plan (`rate 0`) still leaves the **adaptive** side of `min(adaptive,
planned)` quietly shrinking the budget every week (the `0.9 × trailing avg`
term) and grading the user "over budget" against a target they never agreed
to. That is the opposite of tracking. Tracker mode has to suppress *grading*,
not just flatten the line — so the regime has to be first-class, not a rate of
zero. Hence `kind`.

---

## 3. What "no target" means, concretely (the pivotal decision)

The one real fork. In tracker mode, is there **any** number on the Log meter?

**Recommendation — a reference line, not a target.** The app shows your own
recent rate as a *mirror* ("you usually run ~11/day; 4 so far today"), never
as a bar to stay under. We already compute exactly this number:
`recentDailyAverageSixths()` is documented as "a measurement, not a target …
no 90% taper and no monotone clamp." Tracker mode is that function's natural
home.

Concretely, during a tracker regime:

- **No `plannedBudgetFor` target** and **no adaptive ceiling applied as a
  grade.** Days lived under a tracker record carry *no budget verdict* — not
  "under budget", not "over budget", just a count.
- The **reference line** (rounded recent average) is derived separately for
  display. It can go **up** as well as down — in tracker mode that's
  information, not failure, so the monotone-taper clamp stays off.
- **Until enough watched days exist, the line falls back to the stated
  baseline** and the copy says so ("your stated usual — we'll measure the real
  one this week"). Quoting a two-day "average" back at the user is the
  invented-data mistake the P0 chart fix retired ("no trend yet" until 7 full
  prior days) — same rule, same threshold. Day 1's line = baseline, exactly as
  day 1's budget is in taper mode.
- Money keeps computing (§5). Health exposure-avoided keeps computing (§7).

The alternative (a soft flat budget = your average, gently graded) was
considered and rejected: it reintroduces a pass/fail the uncommitted user
didn't ask for, and it's a worse mirror because a quiet day reads as "you
won" rather than "that was a quiet day." Keep the verdict out of tracker mode
entirely — the verdict is what the taper is *for*, and offering the taper is
how the verdict gets earned (§6).

> Implementation note (not binding on the product): `budgetSeries()` returns a
> chained `number[]` today. Tracker days need a "no budget" slot. Either the
> series gains a sentinel/`null` for tracker days, or grading callers consult
> the regime per day and skip the verdict. A taper that resumes after a
> tracker stretch **re-seeds** on its new `PlanRecord.startBudget` — the
> existing `planStartingOn` re-seed already does this; it's the same "only
> honest way the budget may rise" path. So switching taper→tracker→taper is
> already schema-safe; this is UI and a branch in the series, not new history
> machinery.

---

## 4. What happens to each surface

Through-line (unchanged, both goals): **Log entry capture, SOS, brand/price,
baseline, health exposure-avoided, cumulative counts, the entries themselves.**
SOS is fully goal-agnostic and ships identical.

| Surface | Taper mode (today) | Tracker mode |
|---|---|---|
| **Log meter** | budget ring + "X of Y · torched" grading | neutral "today vs your usual" — count against the reference line, no pass/fail colour |
| **Tomorrow's budget** (Log) | "tomorrow starts lower" | hidden — there is no descending tomorrow |
| **Budget-hold sheet** | "your taper paused, and this is why" | never fires (it's a taper-descent explainer) |
| **Goal screen** | glide path → quit date; `tapering/arrived/offer/postZero` | the **mirror + the invitation** (§6): your number, your patterns, your spend, and a standing "ready when you are" |
| **Stats — heatmap** | coloured by budget verdict | coloured by **intensity** (raw counts vs your own average) |
| **Stats — under-budget streak** | days-under-budget run | hidden (no budget) — replaced by a neutral consistency stat if one earns its place |
| **Stats — daily-average / money tiles** | as-is | as-is (goal-agnostic) |
| **Money tab** | leads with **saved** vs baseline | leads with **spend** ("₹X this week"); saved stays as secondary. Same numbers, different headline (§5) |
| **Health timeline** | short clock + cumulative + locked quit-horizon | short clock + cumulative unchanged; the **locked quit-date rows** become a "set a plan to see your horizon" empty state (§7) |
| **Notifications** | 80%-of-budget nudge (S15), first-under-budget push | budget-relative pushes go **silent**; clean-day / streak / milestone-exposure pushes still apply (§8) |

The pattern: anything that reads a **budget verdict** switches to a
**measurement**; anything that reads the **entries** is untouched.

### Day one for a tracker-first user

Three details the entry point drags in, none of them hard but all easy to
forget:

- **Seeding.** `completeSetup` currently seeds one taper record (`startBudget
  = countPerDay × 6`, taper begins day 2). A tracker-first setup seeds one
  `tracker` record instead — same shape, same install-day anchor.
- **Pace was never chosen.** The tracker-first user answered "not yet" at the
  pace step, so `profile.pace` needs a dormant default (steady — it's already
  the setup default and "the sweet spot for most people"). It's what the
  invitation projects with and what `startNewTaper` keeps on accept; the
  ordinary preset control appears once they're tapering and can change it.
- **The plan-ready card and the Welcome payoff.** Onboarding's payoff is the
  plan card printing the date the Welcome headline promised ("Your last
  cigarette already has a date" → "Last cigarette · 14 October"). A
  tracker-first user gets no date, so the card must keep the thread without
  pretending: something in the shape of *"No date yet — first, your real
  number. When you're ready, it gets one."* The headline stays honest: the
  date exists; this user just hasn't asked for it yet.

---

## 5. Money when you switch (your question)

Nothing to migrate — money is computed from `entries × priceHistory` against
the `baselineHistory` counterfactual (`computeSavings`), none of which is the
plan. A tracker user is still smoking below (or above) the baseline they
stated, so "saved vs baseline" stays *true and computable*. What changes is
the **headline**, not the math:

- **Taper mode** leads with **money saved** — you're beating a target, the
  saving is the reward.
- **Tracker mode** leads with **money spent** — "cigarettes cost you ₹3,200
  this fortnight." For someone who hasn't committed to reduce, *cost* is the
  honest, motivating frame (and it's the exact hook into the taper offer in
  §6). The Stats money tile already computes spend, so both frames exist.

Over-baseline days already subtract in `computeSavings` (a day above baseline
is a negative saving, mirrored in `moneyBehind`), so a tracker user who drifts
up sees an honest smaller/negative number rather than a lie that only rises.

**No money is ever lost, reset, or double-counted on a switch.** The ledger is
continuous across goal changes because it never depended on the goal.

---

## 6. Using tracker data to guide toward a taper (your key question)

This is the growth thesis, and it's what turns tracker mode from "dilution
risk" into "wider funnel that still converts." The move: **let the app make
the taper feel like the user's own idea, from their own numbers.**

The quit-date-picker was deferred (BACKLOG "Later") for one reason: on day one
a date "asks for a commitment they have no basis to make yet, and then quietly
becomes a thing to fail at." **Tracker mode manufactures that basis.** After
~7–14 days the app knows the user's real average, real spend, and real danger
windows. Now a plan isn't a leap — it's a description of what's already
happening, bent downward.

The **invitation** lives on the tracker Goal screen as a standing card, built
from measured data, modelled on the post-zero *offer* idiom (soft, repeatable,
**no "decline" to store** — not tapping is the "no", so a refusal never has to
be persisted or re-surfaced). It never nags; it just keeps standing and gets
more specific as data accrues. Examples of what it can say:

- **From the average:** *"You've held around 11/day for two weeks. At −1 a
  week you'd smoke your last one about 3 October. Want to make it a plan?"*
- **From money:** *"That habit's run you ₹3,200 this fortnight. A taper gets
  most of it back."*
- **From patterns (the heatmap):** *"Your danger window is 9–11pm. A plan plus
  SOS there is your fastest win."*

Tapping **"start a plan"** appends a `taper` `PlanRecord` anchored at the
measured recent average — which is **`startNewTaper()`, already built.** It
anchors on `recentDailyAverageSixths` floored at ½, keeps the chosen pace, and
re-seeds the budget chain off zero-or-tracker. Today it's framed narrowly as
"restart after relapse"; tracker mode generalises it to "begin from where you
actually are." Almost no new domain code — the transition already exists.

Because the anchor is *measured, not stated*, the taper starts honest: no
"quit in 1 week" nonsense, no budget the user has already blown. This is the
same anchoring reasoning `startNewTaper` and `recentDailyAverageSixths` were
written with — tracker mode is the case they were quietly waiting for.

Two constraints on the invitation itself:

- **Gated on data, not time-in-app.** Until 7 full watched days exist it stays
  generic ("a week of real numbers and this card gets specific") — the §3
  invented-average rule applies to the pitch too, and doubly so: a projection
  quoted from two days of data is exactly the unearned commitment the
  quit-date-picker deferral was about.
- **It never escalates.** A standing card that gets more specific is an
  invitation; a card that gets more insistent is a nag, and a nagged tracker
  user churns. Frequency stays constant (always there, on Goal, once);
  only the *content* sharpens as data accrues. No push notifications carry the
  invitation — it lives in-app only.

A quiet payoff worth naming: **tracker days feed the same trailing-average
machinery the taper anchors on.** A taper begun from the invitation starts
calibrated to two weeks of reality rather than one onboarding guess — arguably
a *better* start than today's day-one taper gets. That's the honest version of
the funnel argument: tracking first doesn't just delay the taper, it improves
it.

### The reverse switch is also a feature (taper → tracker)
A user mid-taper who's feeling the squeeze can **downshift to tracking**
instead of deleting the app. Append a `tracker` record from today: the descent
pauses, history stays, nobody is told they failed. When they're ready they
start a plan again (re-anchored at their current measured rate). This is a
**retention relief valve** — downshift beats churn — and it's more humane than
a binary quit/fail. It's also just another appended record; the machinery is
symmetric.

---

## 7. Health timeline & post-zero interactions

- **Exposure-avoided and cumulative counts** are vs baseline and vs
  clean-run — both goal-agnostic, both keep working in tracker mode. A tracker
  user is still avoiding exposure relative to their stated baseline.
- **The locked quit-date horizon** (long-term milestones dated off the plan's
  quit date) has no quit date in tracker mode. Those rows become a **"set a
  plan to see where this goes" empty state** — which doubles as another soft
  on-ramp to the taper. Do **not** invent a fake date.
- **Post-zero still applies.** A tracker user who simply stops for 7 clean days
  should still get the *offer* ("ready to call it?"). So `goalMode` gains a
  `tracking` tense, woven in by precedence:
  `postZero (active) > offer (eligible clean run) > tracking > arrived >
  tapering`. `arrived` (budget hit zero) can't occur under a tracker regime by
  construction, so it stays taper-only. The offer beating tracking is
  deliberate: a week clean is a better moment to ask than the mirror is.

---

## 8. Notifications

`notificationPlan.ts` is pure and already prefs-gated. It needs to become
kind-aware:

- **S15 budget nudge (80% of budget)** and **first-under-budget milestone**
  are budget-relative — they must return `null` under a tracker regime (same
  shape as the existing `if (budget <= 0) return null` guard, just extended to
  "no budget regime").
- **Quit-day is taper-only.** It triggers off `budget <= 0`, i.e. it
  celebrates the *plan* completing — under a tracker regime there is no plan
  to complete, and depending on how "no budget" is represented the existing
  trigger could even fire spuriously. It needs an explicit kind guard, not
  just the absence of a budget.
- **Clean-day and streak** milestones still apply (a tracker user can have
  clean days and streaks, and celebrating them is on-message).
- The **reconcile** already cancels-and-rebuilds on every store change, so a
  goal switch re-plans the schedule with no stale pushes — the mechanism for
  "un-saying" a nudge that stopped being true already exists. A switch to
  tracker should also clear a pending budget-hold sheet
  (`pendingHoldNotice` / `budgetHoldNoticedAt`): a "your taper paused"
  explainer has no referent once there is no taper.

---

## 9. Copy & tone — the sharpest non-obvious risk

The app speaks in **one voice: roast** (strings.ts), and every roast is scored
*against a taper* — "budget torched", "we're doing archaeology". **You cannot
roast a tracker user's behaviour**: they never agreed to reduce, so scolding
them for smoking is punching down, it's preachy, and it reads as the lecture
the whole product is built to avoid. It also risks the App Store **1.4.3**
framing the go-live audit already flagged — Stub stays onside *because* it is a
reduction/quit aid; a "smoking companion" that just tallies without pushing
toward quitting is exactly what 1.4.3 doesn't want.

So tracker mode needs a **second register**: *observational mirror*, not
scold. "You ran 4 today, a touch under your usual" — dry, factual, never a
callout. This is a real strings.ts sub-project (a `tracker`-toned pool
alongside the taper pool), and it's the piece most likely to be
under-scoped. The **invitation** copy (§6), by contrast, can keep the app's
edge — nudging toward a plan is on-brand.

Positioning guardrail: tracker mode is a **step toward quitting**, never a
permanent parking spot the product endorses. The invitation always stands; the
empty-state horizons always point at a plan. The App Store description must
frame tracking as "start by knowing your number, then quit" — not "track your
smoking forever."

---

## 10. Open decisions (need the owner before build)

Each carries a recommendation — the owner's call stands, but the doc should
have a spine to argue against.

1. **Entry point.** Where is tracker offered?
   - **(A)** A quiet secondary action on Welcome ("not ready to quit? just
     track") beside the primary "Set me up". Catches the bounce *before* the
     commitment thesis pushes them out — but softens the Welcome that tested
     well and sets up the date payoff.
   - **(B, recommended)** Keep Welcome's thesis intact; make the **pace step**
     (setup step 5) offer a fourth choice — *"Just tracking for now — no plan
     yet."* Pace already asks "how hard do you want to push"; "not yet" is a
     valid answer, onboarding stays 5 steps, and the plan-ready card becomes a
     tracker-ready card. B is also the **1.4.3-safer shape**: the app still
     opens on the quit thesis, and tracking is framed as "not yet", never
     "never". Risk: the uncommitted user may bounce off the Welcome
     headline before reaching step 5.
   - **(A+B hybrid)** Both — a small Welcome link *and* the pace option.

   **Recommendation: B now; add the Welcome link only if beta shows people
   actually bouncing off the headline.** The Welcome is one screen with one
   job (owner ruled out even a carousel), and the decluttering instinct that
   trimmed everything else in this app applies to it most of all. B's bounce
   risk is a hypothesis; the headline testing well is a fact. Don't hedge a
   proven screen against an unproven fear — B is also the 1.4.3-safer shape.
2. **The §3 fork — reference line vs no number at all.** Recommendation:
   reference line (the mirror). Confirm we're not shipping a soft graded
   budget.
3. **Does tracker mode dilute the core promise?** The owner's original worry.
   The §6 conversion story is the answer, but it's a bet — worth naming an
   explicit success metric (tracker→taper conversion within N days) before
   build, even though analytics is its own deferred project.

   **Recommendation: proceed — and measure the bet without telemetry.** A
   tracker→taper conversion is already a visible, dated pair of records in
   `planHistory`, and the Profile JSON export already ships. For a
   friends-and-family beta that's enough: ask tracker-first testers for their
   export after a month and count. Name the bar *before* build (suggested:
   half of tracker-first testers start a plan within ~a month, and nobody
   reads the app as endorsing smoking) so the result is an answer, not an
   anecdote. The analytics project stays deferred.
4. **Stats consistency stat.** With the under-budget streak gone in tracker
   mode, does anything replace it, or does Stats simply carry fewer tiles?

   **Recommendation: fewer tiles; invent nothing.** Every Stats surface so
   far got *trimmed* on device (the ring went Day-only, three tiles were
   replaced for being useless) — the pattern is that speculative stats die on
   contact with the phone. An empty slot costs nothing; a consistency stat
   nobody asked for costs a device round-trip to remove. If the mirror needs
   a headline number, beta will say so — and the likeliest candidate then is
   simply the reference line's trend, which the tracker Goal screen already
   tells.
5. **Streaks across a tracker interlude.** A user with a 12-day under-budget
   streak downshifts to tracking for a week, then resumes. Tracker days carry
   no verdict — so does the streak *break* (a run of graded days ended) or
   *pause* (ungraded days are transparent)? Recommendation: **break, best
   preserved** — a streak that survives a week of not being graded is a streak
   you can farm by toggling modes, and `bestDays`-style records already
   survive resets everywhere else in the app (§9.1 reasoning). But it should
   be a stated rule, not an accident of implementation, because the resumed
   user will notice.
6. **Scope for launch.** This is post-beta-sized. Could ship as: (i) entry
   point + tracker Goal mirror + the invitation, deferring the Stats/heatmap
   verdict-swap and the tracker tone pool to a fast-follow — or (ii) the whole
   thing. The `kind` schema field should land **once**, up front, regardless,
   so there's no second migration.

   **Recommendation: (i), with the line drawn at correctness, not effort.**
   Anything that would show a *budget verdict* to a tracker user is slice 1 by
   definition — the Log meter's neutral state, hiding the streak card and
   tomorrow-row, silencing the hold sheet and budget pushes. Showing "budget
   torched" to someone with no budget is a bug, not missing polish. What can
   fast-follow is enhancement: the intensity heatmap, the money headline
   flip, and the full tracker tone pool (slice 1 needs only a dozen neutral
   mirror lines to not sound broken). Two timing calls folded in: **don't
   gate go-live on any of this** — the app ships v1 as a taper app and this
   is the first post-launch feature, informed by beta — but **land the
   dormant `kind` field before the first external TestFlight build**, because
   a field that migrates by absence costs nothing now and a second migration
   against real users' data is the one expensive step in the whole design.

---

## 11. Why this is cheap where it counts

- **Schema:** one field (`PlanRecord.kind`), migrated by absence ⇒ `taper`.
  No second migration against beta data.
- **Transitions:** `startNewTaper()` and the `planStartingOn` re-seed already
  implement goal switching honestly; tracker mode is mostly new *framing* over
  existing *math*.
- **Money / health / entries:** untouched — goal-agnostic by construction.
- **The real work is UI and copy:** the mirror surfaces, the invitation card,
  the tracker tone register, and the verdict→intensity swap on Stats. That's
  where the effort (and the §10 decisions) actually live.
