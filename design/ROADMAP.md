# Stub — Roadmap

App: **Stub** — a cigarette reduction tracker for young Indian professionals who want to quit gradually via a taper plan, not cold turkey. Tone: playful, lightly sarcastic ("roast mode"), never preachy.

Companion file: `SPEC.md` — user stories + acceptance criteria for development (Claude Code ready).
Design reference: `Stub Prototype.dc.html` (interactive prototype, Nocturne design system).

---

## v1 — Built (in prototype)

Everything below exists in the prototype and is specified as stories S1–S12 in SPEC.md.

1. **Quick log** — 1 / ½ / ⅓ fractional logging, undo, toast feedback, today's entry list, time-since-last-cigarette counter.
2. **Adaptive daily budget** — 90% of trailing 7-day average, budget meter, "left today" line.
3. **Stats dashboard** — Day/Week/Month segmented charts, budget ring, stat tiles (7-day avg, vs last week, days under budget, longest gap).
4. **Goal & taper plan** — pace picker (Chill −¼/wk, Steady −½/wk, Beast −1/wk) → computed quit date, glide-path chart, tomorrow's budget.
5. **Dashboard variants** — rings summary (budget used / days under budget / progress to quit day) and month heatmap with weekend-pattern insight.
6. **Roast mode** — toggle between sarcastic and gentle copy across all feedback messages.

## v2 — Complete the core loop

1. **Onboarding** — baseline questionnaire (current count, brand, price, triggers) that seeds the taper plan. *Do first — everything derives from baseline.*
2. **Backfill flow** — retroactively log cigarettes ("forgot to log at the bar last night"): pick date + time-of-day bucket; stats and streaks adjust honestly.
3. **Reminders & notifications** —
   - Budget nudge ("2 left today, it's only 3pm")
   - Craving-window alerts based on user's usual smoking times
   - Milestone celebrations (first day under budget, first smoke-free day)
4. **Nicotine database** — tobacco/nicotine content per cigarette brand sold in India (Classic, Gold Flake, Marlboro, etc.); personal intake insights ("~84mg nicotine this week").
5. **Craving SOS** — "craving hit" button: 5-min delay timer + distraction prompt; logs cravings survived vs. given-in-to.
6. **Money saved tracker** — Rs saved vs. baseline, framed in things the user cares about (flights, gadgets, EMIs).
7. **Persistence & accounts** — local-first storage with cloud sync; anonymous start, sign-in to sync.

## v3 — Depth & stickiness

1. **Adaptive taper engine** — plan auto-adjusts when the user consistently over/under-shoots; suggests holding a plateau week instead of failing.
2. **Trigger tagging** — tag each log (chai break, stress, drinks, after meals); dashboard surfaces the top trigger and suggests one swap.
3. **Slip recovery mode** — after a bad day/relapse, a gentle reset flow instead of a broken streak; roast mode softens automatically.
4. **Health timeline** — "what's healing now" milestones (20 min → BP, 48 hrs → taste, 1 yr → heart risk) tied to smoke-free hours.
5. **Buddy / accountability** — share progress with one friend; optional weekly digest.
6. **Widgets & quick actions** — home-screen widget for one-tap log + today's budget ring; lock-screen countdown to quit day.
7. **Reports** — monthly PDF/share card: reduction curve, money saved, nicotine avoided.

## Off-app launch checklist (not design work)

- Native build (React Native / Flutter / Swift+Kotlin) from this spec
- Backend: accounts, sync, nicotine DB, notification scheduling
- App Store / Play Store accounts, review, listing assets
- Privacy policy, DPDP Act compliance, health disclaimers, 18+ age gate
- Analytics + crash reporting; TestFlight / Play beta before launch
