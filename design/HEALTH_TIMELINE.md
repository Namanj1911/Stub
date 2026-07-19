# Stub — Health-recovery timeline (design proposal)

Proposal (2026-07-19) for the BACKLOG P3 item "Health-recovery timeline".
Nothing is built. This doc exists to settle the one hard design decision
before code, the way the profile screen and brands dataset were settled first.

Related: SPEC E15 ("healing milestones keyed to smoke-free hours"),
ROADMAP item 4, and the P3 item "Post-zero mode" — see §7, they are more
entangled than the backlog implies.

---

## 1. Why this screen exists

Every leading competitor (Smoke Free, Kwit, QuitNow, QuitSure) ships a
health-recovery timeline, and in all of them it is the most-visited
motivational screen. It answers a question our current app never does:
**"what is this actually doing to my body?"**

Stub today answers *what happened* (Stats), *where you're going* (Goal),
*what it cost* (Money) and *get me through the next 5 minutes* (SOS). The
body itself — the entire reason anyone downloads this — is absent.

## 2. The problem that makes this non-trivial

Published recovery timelines key off **time since your last cigarette**:

| Since last | Milestone |
|---|---|
| 20 min | heart rate and blood pressure drop |
| 12 h | blood carbon monoxide returns to normal |
| 24 h | heart-attack risk begins to fall |
| 48 h | nerve endings regrow; taste and smell sharpen |
| 2 wk – 3 mo | circulation and lung function improve |
| 1 – 9 mo | cilia recover; coughing and breathlessness decrease |
| 1 yr | excess coronary-heart-disease risk halved |
| 5 – 10 yr | stroke risk approaches that of a non-smoker |

That model assumes abstinence. **Stub's entire premise is that the user is
still smoking, on purpose, on a taper.** A 10/day smoker resets this clock
every ~90 waking minutes. Ported naively, the single most motivating screen
in the category becomes the single most demoralizing one in our app — a
progress bar that is structurally incapable of moving, punishing the exact
user who is doing exactly what we asked.

So the timeline needs a model that survives daily smoking without lying.

## 3. Three models considered

**A. Honest reset clock.** Show time-since-last against the standard
milestones; it resets on every log, and we roast the reset.
*For:* factually unimpeachable, zero new data, small build, very roastable
("you were four hours from your taste buds coming back").
*Against:* permanently parked at the 20-minute mark for our whole target
user base. Loss-aversion is a good seasoning, not a good main course — SOS
already owns "you were doing so well." A screen that can only ever tell you
you failed will be opened twice and never again.

**B. Dose-response recovery.** Model partial recovery from reduced exposure —
"your daily CO load is down 40%", a lung that fills in as the taper
progresses.
*For:* novel (no competitor does it), perfectly matched to the product,
always moving.
*Against:* **not citable.** The literature quantifies recovery from
*quitting*; the reduction literature is contested and mostly says harm falls
far less than proportionally to cigarettes-per-day. Any percentage we print
is our own extrapolation dressed as medicine — a real risk to the trust
positioning that is our whole moat, and a bad look under App Store health
rules. Rejected in this form.

**C. Two clocks + a locked horizon** — *recommended.* Split the screen by
what each number can honestly claim.

## 4. Recommended design

Three stacked sections on one screen, in this order.

### 4.1 Right now (resets — short horizon only)

Live clock since the last logged smoke, against **only** the milestones that
genuinely key off a single cigarette and are reachable inside a smoking day:
20 min (heart rate, BP), 8 h (blood oxygen / CO falling), 12 h (CO normal),
24 h (heart-attack risk starts to fall).

Two things keep this from being Model A's misery loop:

- **Your record is the ceiling, not the reset.** The section also shows the
  user's **longest gap ever** with the furthest milestone it reached —
  earned, permanent, and the honest way to make a resetting clock
  motivating. This is the "personal best" framing, not the "streak broken"
  one. (`stats.ts` already computes longest-gap-today; all-time is a small
  extension.)
- **Roast the gap, never the reset.** Copy congratulates distance covered.
  No line may imply the user destroyed their health by logging — that
  inverts our own "never blocks logging" principle.

### 4.2 What you didn't inhale (cumulative — never resets)

Exposure *avoided* since install, valued against the effective-dated
baseline exactly the way Money already values avoided smokes:

- cigarettes not smoked (integer sixths, our existing counterfactual)
- **nicotine and tar not inhaled**, in mg — we already have per-stick
  `nicotineMg` / `tarMg` in `brands.ts` with provenance, and brand history
  in `priceHistory.brandId`, so avoided sticks can be valued at the brand
  in effect. Renders with the existing `~` softness treatment.
- days spent under budget (existing streak computation)

This section is the one that always moves, and it makes no medical claim at
all — it is arithmetic on the user's own logs. That is the trick: the
motivating, always-growing number is *exposure avoided*, not *healing
achieved*. Novel like Model B, citable like Model A.

### 4.3 The long horizon (locked)

The abstinence milestones — 2 weeks to 3 months, 1 year, 5 years — shown
dimmed, with their real requirement stated plainly: *"counts from your last
cigarette. Not your latest one — your last one."* Alongside, the Goal
screen's projected quit date, so the lock has a date on it.

This is deliberately the emotional payload of the screen: a visible
destination that the taper is walking toward, which is precisely the story
Goal tells in numbers and nothing tells in body terms.

## 5. Placement — and the Goal / Profile redesign

My original proposal (a Stats drill-in, per the nicotine-DB precedent) was
wrong. Auditing both screens says the timeline belongs on **Goal**, and that
Goal has the space once one existing problem is fixed.

### 5.1 What is actually on each screen

**Goal** (246 lines, four blocks): pace picker · plan card (quit date +
glide path) · progress-to-quit-day · tomorrow's budget.

**Profile** (259 lines, five rows): baseline · brand · pace · export · reset.

### 5.2 The diagnosis

Profile is **not** full. It is a five-row settings drawer with room to
spare, and its rows are all the same kind of thing: durable facts about the
user. It should be absorbing content, not shedding it.

Goal is full because it is doing **two unrelated jobs**:

- *configuration* — the pace picker, three 60px cards, the single largest
  block on the screen. This is a settings control that happens to live on a
  narrative screen.
- *narrative* — quit date, glide path, progress. The story.

And **pace is already duplicated**: the full picker on Goal, a compact
three-up on Profile. Two controls, one fact, two places to keep in sync.

### 5.3 The move

**Configuration goes to Profile; Goal keeps the story.** Deleting the pace
picker frees ~230px — the largest single block on Goal — and removes the
duplication, since Profile already has a working pace control.

Two things make this cheaper than it sounds:

- The backlog **already decided (2026-07-18)** to replace the three pace
  blocks with a quit-date picker. This redesign is that decision arriving,
  not new scope. If the quit-date picker lands here, pace as a user-facing
  concept may vanish from both screens — it becomes derived from the date.
- `Progress to quit day` is a full-width card rendering one number; it folds
  into the plan card it describes, freeing another ~70px.

Third move, **decided**: `Tomorrow's budget` moves to **Log** (§13). That
empties Goal of everything except the story, and the milestone card lands in
genuinely free space rather than a negotiated corner.

### 5.4 Why the timeline belongs on Goal specifically

The locked long-horizon section (§4.3) *is* the quit date, expressed in the
body instead of in cigarettes. Putting it next to the plan card makes one
argument instead of two: **here is when you stop, and here is what you get
for it.** Stats would have made it a fifth chart on a screen the owner
already calls data-overloaded.

### 5.5 Shape on Goal

Recommended: Goal carries a **milestone card** — the live "right now"
milestone plus the next locked one — and the full three-section timeline is
a `Health` stack screen behind it. Goal stays short and narrative; the
timeline gets a whole screen instead of a cramped third of one; the card is
where the achievement moment surfaces.

Alternative if you want it fully inline: a `Plan / Body` segmented control
on Goal, reusing the pattern from Stats. Cheaper to build, but it hides the
plan behind a tab that most users will never switch back from.

## 6. Data, sourcing, effort

**Decided: single primary source, one document-level citation.** This is
also by some distance the easier build.

`brands.ts` needs per-field provenance because its fields genuinely differ
in confidence — a printed MRP and an editorial nicotine estimate cannot wear
the same badge. Milestones have no such spread: pull them from one document
and *every* milestone shares one `asOf`, one source, one confidence. That
collapses the whole `FieldSource` machinery into a single constant and one
line of fine print. No per-field records, no `SOURCES` map, no reconciling
CDC against NHS against WHO where they disagree on whether taste returns at
48 hours or 72.

Primary: **US Surgeon General, *Smoking Cessation: A Report of the Surgeon
General* (2020)** — the authoritative underlying document, which the CDC
page restates. Cite the SG report, phrase the milestones in the CDC's
plainer language. Fine print reads like the Money screen's MRP note.

If we ever need a milestone the primary source doesn't cover, *that* is when
we add per-field provenance — not before.

New code: milestone dataset + `src/health.ts` (all-time longest gap,
cumulative avoided sixths → mg) + one screen + a strings pool. No new
dependencies, Expo Go-safe, local-only. **Medium** — comparable to the
Stats range-tiles round.

Also needs (launch checklist already lists it): a **health disclaimer** —
general information, not medical advice, and Stub is not a cessation
treatment.

## 7. The thing the backlog under-states

§4.3 makes this screen the natural front door to **Post-zero mode**, the
next P3 item. At zero, the locked section unlocks and starts running for
real — the timeline stops being aspirational and becomes the main event.
Designing them together costs little more than designing this one alone;
designing this one *without* post-zero in mind risks building a screen we
throw away at the moment the app succeeds. Recommend we at least sketch the
unlock before building.

## 8. Tone rule (new, needs agreement)

Health is the one domain where our roast can genuinely hurt. Proposed rule,
to sit in `strings.ts` alongside the existing voice note:

> Roast the behaviour, never the disease. No cancer punchlines, no
> tombstones, no "your lungs look like a barbecue". The joke is always
> about the user's choices, never about what those choices might do to
> them. Fear is what every other quit app sells; we don't.

## 9. Achievements, resets and notifications

Decided: milestones are **achievements** — earned, celebrated, and lost if
the user falls back. One boundary matters enough to write down.

### 9.1 What resets and what never does

| Section | On a smoke / relapse | Why |
|---|---|---|
| §4.1 right now | resets (that's the clock) | physiologically true |
| §4.1 longest gap ever | **never** | it happened; it's a record |
| §4.2 exposure avoided | **never** | arithmetic on past logs — resetting it would falsify history |
| §4.3 long horizon (post-zero) | resets | genuinely keyed to abstinence |

The cumulative section must be immune. "Nicotine you didn't inhale" is a
statement about days that already happened; zeroing it to punish a slip
would be the app lying to make a point, and it would break the same honesty
rule that governs Money.

### 9.2 Notification policy

**Notify on gain, stay silent on loss.** A push that says "you lost your
48-hour mark" is exactly the fear-selling §8 bans, and it arrives at the
user's lowest moment. Losses are visible in-app when they choose to look —
that's enough. This also keeps faith with the quiet-reset decision (§Q2):
the app does not editorialise when you slip.

Volume: milestones are rare by construction (four in the short horizon), so
"every milestone achieved" is a handful of pushes, not badge spam. Copy
follows the §8 tone rule and the existing rolled-pool pattern.

### 9.3 Sequencing constraint

**Push requires a dev build** — Expo Go can't ship these, and the backlog's
"milestone roast notifications" item already rides the notifications /
dev-build infra with S15–S17. So:

- **Phase 1 (Expo Go, now):** timeline, achievements, unlock states,
  in-app celebration. Fully usable, testable on the owner's phone today.
- **Phase 2 (with the dev build):** the pushes, alongside S15–S17.

The design should not assume push exists — an achievement must feel earned
when you open the app and find it waiting.

## 10. Post-zero unlock

Folded into this design per decision, because §4.3 already builds most of it.

At zero, the app stops being a taper tracker and becomes a smoke-free
companion. The timeline is the screen that flips:

- **Goal's hero inverts.** "Last cigarette: 3 November" becomes "Smoke-free
  since 3 November." The glide path has arrived and retires; the locked
  long-horizon milestones unlock and start running for real. Goal's
  narrative job continues uninterrupted — same screen, new tense.
- **The timeline becomes the main event**, not a card. §4.3 stops being grey
  and becomes the primary content: 2 weeks, 1 month, 1 year, 5 years, each
  with a real date attached.
- **Money keeps compounding** — it already values every avoided smoke
  against the baseline, and at zero the whole baseline is avoided. No
  change needed, which is a good sign the model was right.
- **SOS stays**, unchanged and prominent. Cravings do not stop at zero.
- **A relapse is logged honestly and does not reset the world.** The
  smoke-free streak resets (best-ever persists, per §9.1), the short clock
  resets, the long-horizon milestones relock. Cumulative totals and money
  carry on untouched. The app notes it and moves on — no lecture, no
  ceremony, no "start over" screen. SPEC E14 (slip recovery) lives here.

Open: whether "zero" is *budget reached zero* or *N consecutive days at
zero*. Proposed: the taper sets the date, but the mode flips on **7
consecutive zero days**, so the app doesn't declare victory on a
technicality the user hasn't lived yet.

## 11. The plan control — presets + date picker (hybrid)

Decided: keep the three preset blocks **and** add a target-date picker;
either input recomputes the plan. They are two ways of setting one fact, so
the model has to make that literal.

### 11.1 The disconnect this exposes

**Today, pace does not affect the budget at all.** `budgetSeries()` is
purely adaptive — `max(3 sixths, 90% of the trailing 7-day average)`,
clamped to never rise. `PACE_RATE` is used only by `weeksToQuit()`,
`quitDate()` and the glide path. Switching Chill → Beast changes the
*predicted* date and the drawn glide path; tomorrow's actual budget is
identical.

So "the date recomputes the budget" is not a small change — it closes a gap
that already exists. Two ways to go:

- **(a) Date as projection only.** Honest to today's behaviour, cheap. But
  picking an aggressive date changes literally nothing about the app, which
  makes the picker theatre. *Rejected 2026-07-19.*
- **(b) Date as a real constraint** — **decided 2026-07-19.**
  `budget = min(adaptive, planned)`, where `planned` is the straight-line
  taper from today's budget to zero on the target date. The existing rules
  survive intact: the budget still never rises, and the 3-sixths floor still
  holds. The adaptive formula keeps its job (reacting to what you actually
  smoke); the plan adds a ceiling that pulls down. Whichever is stricter
  wins, which is also the honest reading of "I want to quit by March."

Under (b) both inputs finally mean the same thing, and the presets become
what they always claimed to be.

### 11.2 Canonical value

Store the **rate** (sixths/week) as the single source of truth, not the
preset name. The three presets are shortcuts that set it (3 / 6 / 12); the
date picker sets it to `ceil(budget / weeksUntilTarget)`. The UI shows
"Chill / Steady / Beast" when the rate matches a preset and a plain date
otherwise — one value, two doors, no sync problem.

This generalises the `Pace` union to a number. `PACE_RATE` stays as the
preset table.

### 11.3 Guards

- **Too-soon dates.** A date implying a rate steeper than Beast is allowed
  but roasted, not blocked — never block a user from being ambitious. Below
  a hard floor (the date is inside a week, i.e. effectively cold turkey) say
  so plainly: this app is a taper, and that's a different plan.
- **Rescheduling mid-taper.** Allowed, effective-dated like `baselineHistory`
  — the past keeps its old numbers. Slipping the date is a legitimate move,
  not a failure; the roast can have an opinion, the data must not.
- **Interaction with §10.** The date sets the *target*; post-zero mode still
  flips on 7 consecutive zero days. Arriving at the date still smoking is a
  normal outcome and needs a non-punishing story.

## 12. Zero, defined

Decided: **7 consecutive zero days** flips post-zero mode (§10), regardless
of what the taper's target date said. The budget reaching zero sets the
expectation; living it for a week earns the mode.

## 13. Tomorrow's budget on Log

Moved from Goal (S11's placement) to Log, where the operational numbers
live. Log's structure since `feat/log-scroll` is fixed chrome (header,
count, meter, log buttons) over a scrolling drags list, with the SOS FAB
bottom-right — so the placement has to dodge both the FAB and the list.

**Recommended: a caption on the budget meter row.** The meter already
renders today's budget; tomorrow's sits under it as one quiet line
("tomorrow: ½"). It costs one line of fixed chrome, touches no interactive
target, and is contextually perfect — today's number and tomorrow's number
are the same thought. The S11 "we'll nudge you at 80%" line travels with it.

Contextual emphasis: the caption stays visible all day, but **brightens and
gains a roast line once the day's budget is ≥80% spent**, when tomorrow
stops being trivia and starts being the point. Always present so it's
discoverable; loud only when it's actionable.

Rejected: bottom-of-screen placement (collides with the FAB), and a card
inside the scrolling list (a fact about tomorrow shouldn't scroll away with
today's log).

## 14. Decisions log

| # | Question | Decision (2026-07-19) |
|---|---|---|
| 1 | Recovery model | Hybrid — two clocks + locked horizon (§4) |
| 2 | Reset behaviour | Quiet; no roast on reset |
| 3 | Tone | Roast the behaviour, never the disease (§8) |
| 4 | Locked milestones | Yes — achievements, all states, push on gain, reset on fallback (§9) |
| 5 | Sourcing | Single primary (Surgeon General 2020), one citation (§6) |
| 6 | Placement | Goal, after moving config to Profile (§5) |
| 7 | Post-zero | In scope for this design (§10) |
| 8 | Shape on Goal | Milestone card + `Health` drill-in (§5.5) |
| 9 | Plan control | Hybrid: presets + date picker, rate is canonical (§11) |
| 10 | Tomorrow's budget | Moves to Log, meter caption (§13) |
| 11 | "Zero" | 7 consecutive zero days (§12) |
| 12 | Date vs budget | (b) — the date constrains: `min(adaptive, planned)` (§11.1) |
| 13 | Missing the date | Date slips, nothing breaks (§15) |

## 15. Arriving at the target date still smoking

Decided: **the date slips and nothing breaks.** It is a target, not a
deadline — the app recomputes a new date from the current budget and rate,
says something about it, and carries on. There is no failure state, no
"you missed it" screen, no reset.

This follows from the whole design: §9.2 already says notify on gain and
stay silent on loss, §11.3 already treats rescheduling as legitimate, and
§10 flips post-zero on lived behaviour rather than on a calendar. A hard
deadline would be the one place the app punishes a user for the reduction
being harder than they guessed — which is the norm, not the exception.

The roast may absolutely have an opinion about the slip. The data may not.

## 16. Build order

This has grown past one branch. Proposed sequence, each independently
device-testable:

1. **Goal/Profile restructure** — pace picker to Profile, progress folds
   into the plan card, tomorrow's budget to Log. Pure refactor, no new
   concepts, frees the space everything else needs.
2. **Plan control** — canonical rate, date picker, `min(adaptive, planned)`
   if we take §11.1(b). Domain change, wants its own device test.
3. **Timeline phase 1** — milestone dataset, `src/health.ts`, `Health`
   screen, milestone card on Goal, in-app achievements.
4. **Post-zero mode** — the unlock, the 7-day flip, relapse handling.
5. **Timeline phase 2** — pushes, with the dev build and S15–S17.
