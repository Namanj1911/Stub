# Stub — Product Spec & User Stories

For development with Claude Code. Design source of truth: `Stub Prototype.dc.html` (Nocturne design system — dark blue-grey background, blurple accent, Inter font). Roadmap: `ROADMAP.md`.

## Product summary

Stub helps smokers quit gradually. Users log every cigarette (including fractions for shared ones), get an adaptive daily budget that shrinks on a chosen taper pace, and see a concrete quit date. Feedback copy is playful/sarcastic ("roast mode", toggleable to gentle).

**Target user:** young Indian professionals, urban, smartphone-native.
**Platforms:** iOS + Android (single codebase recommended).
**Data model unit:** cigarettes are stored in *sixths* (integer), so ⅓ = 2, ½ = 3, full = 6. All math is integer-safe; display converts to unicode fractions (⅙ ⅓ ½ ⅔ ⅚).

## Core domain rules (from prototype logic)

- **Adaptive budget** = max(½ cig, round(90% of trailing 7-day average to nearest ½)). Recomputed daily.
- **Taper pace** (sixths reduced per day, per week): Chill = ¼ cig/week, Steady = ½ cig/week, Beast = 1 cig/week.
- **Quit date** = today + ceil(currentBudget / paceRate) weeks.
- **Tomorrow's budget** = max(0, budget − paceRate/7).
- **Roast mode**: one boolean flips all feedback copy between sarcastic and supportive variants. Copy pairs live in a single strings table.

---

## EPIC 1 — Logging (v1)

**S1. Quick log**
As a smoker, I want to log a cigarette in one tap so that tracking never feels like work.
- AC: Home screen shows three buttons: 1 (full), ½, ⅓ (shared); one tap logs with current timestamp.
- AC: Tap targets ≥ 44px; log completes in < 100ms perceived (optimistic UI).
- AC: A toast confirms the log; copy varies by budget status (within / near limit / over) and roast mode.

**S2. Undo**
As a user, I want to undo my last log so that a mistap doesn't pollute my stats.
- AC: "undo last" removes the most recent entry and confirms ("Undone. It never happened.").

**S3. Today view**
As a user, I want to see today's count against my budget at a glance.
- AC: Large fractional count (e.g. "3⅚"), budget line ("of a 7 budget · 3⅙ left"), and a horizontal progress meter.
- AC: Header shows time since last cigarette, updating every minute.
- AC: "Today's drags" list shows each entry: amount, full/shared, time — newest first.

**S4. Over-budget state**
As a user, I want honest feedback when I exceed budget, without shame-spiraling.
- AC: Meter caps at 100%; "left" line becomes "budget torched" (roast) / "budget used up" (gentle).
- AC: Over-budget toast per copy table. Never blocks logging — the app must not punish honesty.

## EPIC 2 — Stats (v1)

**S5. Time-range charts**
As a user, I want Day / Week / Month views of my smoking so I can see patterns.
- AC: Segmented control: Day (by time-of-day buckets), Week (per weekday), Month (weekly averages, last 4 weeks).
- AC: Bars over budget render in accent color; others neutral. Values labeled as fractions.

**S6. Budget ring + tiles**
As a user, I want a summary of how I'm tracking.
- AC: Ring = today vs adaptive budget; trend line "↓ 12% vs last week".
- AC: Tiles: Daily average (7d), vs last week (%), Days under budget (n/7), Longest gap today.

**S7. Dashboard insight card**
As a user, I want one actionable insight, not a data dump.
- AC: Single insight card per view, e.g. danger-window ("your danger zone is 6–8 pm chai break") or weekend pattern ("Saturdays average +2.4 over budget"). Max one; rotates by relevance.

**S8. Month heatmap**
As a user, I want a calendar heatmap so I can see good/bad days at a glance.
- AC: 7-column grid, one cell/day, 4-step intensity scale with legend; tiles for month total, vs last month %, best streak, cleanest day.

## EPIC 3 — Goal & taper (v1)

**S9. Pace picker**
As a user, I want to choose how fast I quit so the plan feels like mine.
- AC: Three paces: Chill (−¼/wk), Steady (−½/wk), Beast (−1/wk). Selection updates quit date, glide path, and tomorrow's budget instantly.

**S10. Quit date + glide path**
As a user, I want a concrete quit date so quitting feels real.
- AC: Plan card: "Last cigarette: <date>" + plain-language plan line ("…gets you to zero in N weeks. No cold turkey, no drama.").
- AC: Glide-path bar chart: daily budget per week from now to zero (max 8 bars; final bar labeled "zero").
- AC: "Progress to quit day" % shown on dashboard.

**S11. Tomorrow's budget**
As a user, I want to know tomorrow's number tonight so I can plan.
- AC: Card shows tomorrow's budget + "we'll nudge you at 80%".

## EPIC 4 — Settings (v1)

**S12. Roast mode toggle**
As a user, I want to pick the app's tone.
- AC: Boolean setting; flips all feedback copy app-wide; default ON. All copy pairs in one strings table.

---

## EPIC 5 — Onboarding (v2)

**S13. Baseline questionnaire**
As a new user, I want a quick setup so my plan starts realistic.
- AC: ≤ 5 steps: cigarettes/day now, usual brand (from nicotine DB), pack price, top trigger times, pace. Skippable except count.
- AC: Seeds initial budget (= stated count, taper begins day 2) and money-saved baseline.
- AC: Anonymous by default — no signup required to start.

## EPIC 6 — Backfill (v2)

**S14. Retroactive logging**
As a user, I want to add cigarettes I forgot to log so my stats stay honest.
- AC: From Log screen: "missed one?" → pick day (last 7), time-of-day bucket, amount (1/½/⅓).
- AC: Backfilled entries marked distinctly in lists; budgets/averages/streaks recompute; a lost "day under budget" is revoked honestly.
- AC: Roast copy acknowledges ("Bar night, huh. Logged.").

## EPIC 7 — Notifications (v2)

**S15. Budget nudge** — push at 80% of daily budget consumed ("2 left today, it's only 3pm").
**S16. Craving-window alert** — learns user's habitual smoking windows from log timestamps; pre-emptive nudge before top window. Frequency-capped: max 2/day.
**S17. Milestones** — first day under budget, first smoke-free day, each week completed on plan, quit day. Celebratory, roast-aware copy.
- AC (all): user can toggle each category; deep-link into the relevant screen; respects OS quiet hours.

## EPIC 8 — Nicotine database (v2)

**S18. Brand database**
As a user, I want to see nicotine/tar content of Indian cigarette brands so I understand my intake.
- AC: Searchable list: brand, variant, nicotine mg, tar mg, price/stick (Classic, Gold Flake, Wills, Marlboro, Four Square, Charminar, etc.). Bundled dataset, updatable server-side.

**S19. Intake insight**
As a user, I want my weekly nicotine intake computed from my brand + logs.
- AC: "~84 mg nicotine this week" + trend vs last week; shown on stats screen.

## EPIC 9 — Craving SOS (v2)

**S20. Delay timer**
As a user, I want help riding out a craving so I smoke less without willpower theatrics.
- AC: Prominent "Craving" button → 5-minute timer + one distraction prompt (breathing, walk, water).
- AC: Outcome captured: survived vs smoked. Survived cravings shown as a stat ("7 cravings outlasted this week").

## EPIC 10 — Money saved (v2)

**S21. Savings tracker**
As a user, I want to see rupees saved vs my baseline so quitting feels rewarding.
- AC: Saved = (baseline/day − actual/day) × price/stick, cumulative. Reframed in aspirational terms ("that's 1 Goa flight").

## EPIC 11 — Persistence & accounts (v2)

**S22. Local-first storage** — all data on device; app fully functional offline.
**S23. Cloud sync** — optional sign-in (phone/Google/Apple); merge-safe sync; delete-account = full data wipe (DPDP compliance).

---

## v3 EPICS (summaries — spec when v2 ships)

- **E12 Adaptive taper**: auto-adjust plan on sustained over/under-shoot; offer plateau weeks instead of failure.
- **E13 Trigger tagging**: optional tag per log (chai, stress, drinks, meals); surface top trigger + one swap suggestion.
- **E14 Slip recovery**: relapse flow that resets gently; roast mode auto-softens for 48h.
- **E15 Health timeline**: healing milestones keyed to smoke-free hours.
- **E16 Buddy sharing**: one accountability partner; weekly digest.
- **E17 Widgets**: home-screen one-tap log + budget ring; lock-screen quit-day countdown.
- **E18 Reports**: monthly share card / PDF — reduction curve, money saved, nicotine avoided.

---

## Non-functional requirements

- **NFR1** Log tap → UI feedback < 100ms; app cold start < 2s.
- **NFR2** All counts stored as integer sixths; no floating-point cigarette math.
- **NFR3** Day boundary = device-local 4:00 AM (late-night smokes count toward the evening's day).
- **NFR4** Dark theme per Nocturne tokens is the default and v1-only theme.
- **NFR5** Accessibility: hit targets ≥ 44px, text ≥ 12px, WCAG AA contrast on dark bg.
- **NFR6** Privacy: health-adjacent data never leaves device without explicit sign-in consent; DPDP Act compliant; 18+ gate.
- **NFR7** All user-facing copy exists in roast + gentle variants from a single strings table.

## Suggested build order

1. S22 (storage) → S13 (onboarding) → S1–S4 (logging) — usable core
2. S5–S8 (stats) → S9–S11 (goal) — full v1 parity with prototype
3. S12, S14, S21 — quick wins
4. S15–S17 (notifications), S18–S19 (nicotine DB), S20 (SOS), S23 (sync)
