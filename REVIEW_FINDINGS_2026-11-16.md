# Review findings — whole app, 2026-11-16

Second review round. The first (`REVIEW_FINDINGS.md`, 2026-07-18 → 20) covered
two days of commits and is fully closed. This one reads the whole app as it
stands on main (`079e214`) with one question in mind: **does this work for a
smoker who is trying to cut down, on the phone they actually own?**

**How it was checked**

- Read: `App.tsx`, `store.ts`, `domain.ts`, `stats.ts`, `postzero.ts`,
  `notifications.ts`, `notificationPlan.ts`, and the Log, Setup, SOS,
  Backfill, Profile, Money and Welcome screens in full. Goal, Stats, Health
  and Nicotine screens, `health.ts` and `strings.ts` were searched for
  specific things, not read end to end.
- Ran: `tsc --noEmit` passes; jest passes (6 suites, 117 tests).
- Measured: the timings in R1 and the sizes in R4 come from a throwaway
  probe run against synthetic histories. The probe was deleted afterwards.
- **Not done:** nothing here was checked on a device. Android findings are
  from reading code and Expo's documentation; there is still no Android
  build.

**Status:** five findings were fixed in code on 2026-11-16 (R1, R2, R7, R9
and the undo part of R6) and merged to main the same day at the owner's
request. None of it has been seen on a phone. See "Fix round" directly below. Everything else is still open and
needs the usual discussion and branch.

---

## Fix round, 2026-11-16

Done without a phone to hand. Each fix was made on its own branch and
**merged to main on 2026-11-16 before any device check**, at the owner's
request. Typecheck passes, jest passes (7 suites, 134 tests, up from
117), and the Android JS bundle builds. Every new test was checked by putting
the bug back and watching it fail.

| Finding | Branch | What changed | Covered by tests |
|---|---|---|---|
| R2 | `fix/android-channel-before-permission` | The Android channel is created before the permission request, in both places that ask. | No. Needs an Android device. |
| R1 | `fix/day-totals-linear` | Per-day totals are built once per `entries` array and shared (`domain.dayTotals`, `totalForDay`). Every day loop in domain, stats, postzero, health, the notification plan and the Stats and Nicotine screens reads from it. Two years at 20 a day: about 8.9 s before, about 28 ms after, for one pass of every screen's maths under jest. | Yes, `perf.test.ts` |
| R7 | `fix/money-completed-days` | Money counts only whole days: the day after install up to yesterday. A "nothing counted yet" line shows until the first day closes. "this week" is now "last 7 days". The Health screen's "What you didn't inhale" totals had the same fault and follow the same rule. | Yes, `domain.test.ts` |
| R9 | `fix/foreground-refresh` | One shared clock in `AppContext` (`useNow`), updated every minute and when the app returns to the foreground. Log, Stats, Goal, Money, Profile and Nicotine read it. | No. Needs a device. |
| R6 (undo only) | `fix/undo-today-only` | "Undo last" takes back the newest entry added in this launch, today. With nothing to take back it says so and points at the entry rows. | Yes, `domain.test.ts` |

Merged in the order R2, R1, R7, R9, R6.

Not done from R6: the day view for correcting past days, and disabling
pre-install days in Backfill.

### Still to check on a phone

Nothing below has been looked at on a device. The code is already on main,
so anything that fails here needs a follow-up fix.

**R2, Android only (first Android build)**

- [ ] Fresh install on Android 13 or later. Log until past 80% of the budget.
      The system notification prompt appears.
- [ ] Allow it. The nudge arrives about 45 minutes later.
- [ ] iPhone: the prompt and the nudge behave as before.

**R1**

- [ ] Log, Stats, Goal, Money, Health and Nicotine show the same numbers as
      before for existing data. Compare against a screenshot from main.
- [ ] Logging feels instant.

**R7**

- [ ] Fresh install: Money shows ₹0 and the "Nothing counted yet" line on the
      install day and the day after. No rupee figure before a full day has
      closed.
- [ ] Existing data: the total is lower than on main by roughly the install
      day plus today. It does not change when a cigarette is logged today.
- [ ] Health, "What you didn't inhale": the same "Nothing counted yet" line on
      a fresh install, not the "above your baseline" line.
- [ ] **Owner decision on feel:** a new user now sees ₹0 for up to two days
      (the first figure arrives on the second morning after install). That is
      honest but slow. The alternative is to pro-rate today by time of day.
- [ ] Copy check on the two new lines (`moneyNotYet`, `healthNotYet` in
      `strings.ts`) and on "last 7 days".

**R9**

- [ ] Open the app in the evening with cigarettes logged. Leave it in the
      background overnight. Open it after 4 am without force-quitting. Log
      shows a clean day at once, and Stats, Goal and Money show today.
- [ ] Leave Log open for a few minutes. "last one … ago" still moves each
      minute.
- [ ] Log a cigarette. "last one … ago" resets at once.

**R6, undo**

- [ ] Log one, tap "undo last". It is removed and the toast says "Undone."
- [ ] Add a backfill for yesterday, return to Log, tap "undo last". The
      backfill is removed.
- [ ] Force-quit, reopen, tap "undo last". Nothing is removed and the toast
      says "Nothing new to undo. Tap an entry below to fix it."
- [ ] Known trade-off to judge: after the app has been closed, a cigarette
      logged a minute earlier can no longer be undone with the button. It can
      still be removed from today's list.
- [ ] Copy check on `nothingToUndo`.

---

## Who this is for

The person using Stub is a smoker, usually mid-craving or just after a
cigarette, often one-handed, often a little annoyed with themselves. Four
things follow, and the findings are judged against them:

1. **Logging must be instant, every time, for months.** An unlogged
   cigarette makes every number in the app wrong.
2. **The app must never claim something it cannot back.** This user has
   heard a lot of promises about quitting. One false "you saved ₹240" or one
   nudge that never arrives and the roast voice stops being charming.
3. **Their history is the product.** A streak or a savings total lost to a
   new phone is a reason to start smoking "properly" again.
4. **The worst moments matter most:** a craving, a relapse, the first
   cigarette of the morning.

## Summary

| # | Finding | Severity | Principle |
|---|---|---|---|
| R1 | Log, Money and Stats get slower with every day of use — *fixed, not device-checked* | **High** | 1 |
| R2 | Android: the notification permission prompt will probably never appear — *fixed, not device-checked* | **High** (Android) | 2 |
| R3 | Onboarding promises trigger-time nudges that were never built | **High** | 2 |
| R4 | Export cannot be imported, and will fail on Android as history grows | **High** | 3 |
| R5 | A failed or corrupt load silently starts a fresh install over the old data | Medium | 3 |
| R6 | "Undo last" can delete yesterday's entry; past days cannot be corrected — *undo fixed, not device-checked; rest open* | Medium | 3 |
| R7 | Money shows a full day "saved" the moment the app is installed, and again every morning — *fixed, not device-checked* | Medium | 2 |
| R8 | SOS: the screen sleeps mid-countdown and nothing tells you that you made it | Medium | 4 |
| R9 | Screens do not refresh when the app comes back to the foreground — *fixed, not device-checked* | Medium | 4 |
| R10 | No privacy, support or help link anywhere inside the app | Medium | 2, 4 |
| R11 | The permission prompt appears while logging the cigarette that nears the budget | Low/Med | 4 |
| R12 | Smaller items | Low | — |

---

## R1. The main screens get slower with every day of use — HIGH

Several calculations walk every day since install and, for each day, filter
the whole entries array (`entriesForDay`, which calls `dayKey` and builds a
`Date` per entry). That is days × entries. `budgetSeries` was rewritten to
avoid exactly this and says so in its comment; the others were not:

- `postzero.smokeFree` — called on every Log render
- `domain.computeSavings` — every Money render
- `stats.underBudgetStreaks`, `underBudgetCount` — Stats, and the evening
  notification plan
- `notificationPlan.countCleanDays` — runs on store writes in the evening

Measured on a Mac under Node, one pass of each screen's calculations:

| History | Entries | Log | Money | Streaks |
|---|---|---|---|---|
| 90 days at 10/day | 910 | 37 ms | 31 ms | 29 ms |
| 1 year at 10/day | 3,660 | 363 ms | 344 ms | 340 ms |
| 1 year at 20/day | 7,320 | 718 ms | 673 ms | 684 ms |
| 2 years at 20/day | 14,620 | 2,984 ms | 2,676 ms | 2,706 ms |

A phone is slower than this, and a budget Android phone running Hermes is
several times slower. Log re-renders on every tap and every minute. So the
log button, the one control that must never lag (NFR1: under 100 ms), is the
first thing to degrade, and it degrades for the most loyal users. A tapering
smoker has fewer entries than these rows, but the three-month row is already
close to the limit on a slow phone.

**Fix:** total the entries by day once per `entries` array (a map built in
one pass and cached against the array reference) and have every caller read
from it. One helper, and each loop above becomes linear. Add a jest test that
fails if a year of data takes more than a few milliseconds.

## R2. Android: the permission prompt will probably never appear — HIGH on Android

`reconcile()` calls `ensurePermission()` and only afterwards
`ensureChannel()` (`src/notifications.ts:109,118`). Expo's notifications
documentation says that on Android 13 and later the system prompt is not
shown until the app has created at least one notification channel. With the
current order the request is made first, no prompt is shown, permission
stays denied, the function returns before the channel is ever created, and
the same thing happens on every later attempt. Every nudge and milestone
would be silently off for every Android user.

This is from the documentation, not from a device. It is the first thing to
check on the first Android build.

**Fix:** create the channel before asking. One line moved.

## R3. Onboarding promises nudges that were never built — HIGH

Setup step 4 asks "When do you usually light up?" and says: *"Pick your
triggers — we'll watch those windows and nudge you before they hit."*
(`SetupScreen.tsx:294`). The answers are saved to `profile.triggers` and
never read again by anything. `notificationPlan.ts:28` records that
craving-window alerts (S16) were deliberately left out.

So the app asks a smoker a personal question, makes a specific promise, and
does nothing. `GO_LIVE.md` §1 also listed craving-window alerts as shipped;
that is corrected in this round.

**Options**

- **(a) Build it, from measured data.** Stats already works out the user's
  real danger window from their logs (`stats.pickInsight`). A nudge 15
  minutes before that window, once a day, is more accurate than the stated
  triggers and keeps the promise. Needs a discussion pass on copy and on how
  it interacts with the quiet hours.
- **(b) Change the sentence** to what is true today, for example "we'll use
  this to show you your patterns", and use the triggers in the Stats insight.
- **(c) Drop the step.** Shorter onboarding, one fewer promise.

Minimum before any public build: (b). Recommended: (a) as the first feature
after launch, since it is also the best retention lever available without
collecting data.

## R4. Export cannot be imported, and will fail on Android — HIGH

Profile's "Export everything" says *"Your data lives only on this phone.
Export it somewhere safe once in a while."* There is no import. A user who
follows that advice, then loses or replaces the phone, has a JSON blob and
no way to put it back. `GO_LIVE.md` §8.2 leans on export as the answer to
single-device risk; today it is not one.

The export is also sent as share-sheet *text*, pretty-printed
(`ProfileScreen.tsx:83`). Measured sizes:

| History | Stored | Exported text |
|---|---|---|
| 1 year at 10/day | 240 KB | 361 KB |
| 1 year at 20/day | 479 KB | 722 KB |
| 2 years at 20/day | 957 KB | 1,442 KB |

Android passes share content through a channel limited to about 1 MB in
total, and failures are common well below that. The call's error is
swallowed (`.catch(() => {})`), so the user would tap Export and see nothing
happen. The privacy page also described the export as "a JSON file", which
it is not; the page now says "JSON text".

**Fix:** write the export to a file and share the file (`expo-file-system`
+ `expo-sharing`), and add "Restore from a file" (`expo-document-picker`),
validated through the existing `migrate()`. Offer restore on the Welcome
screen too, since a new phone is where it is needed.

## R5. A failed load silently starts over the old data — MEDIUM

`useAppData` treats any read or parse error as "no data"
(`store.ts:178-183`). The user then sees onboarding, and the first write
replaces whatever was in storage. A recoverable problem becomes permanent
loss, with no message. Write failures are swallowed the same way
(`store.ts:189`), so a full disk loses logs with no sign.

**Fix:** on a parse failure, copy the raw string to a second key before
continuing, and tell the user. Surface a write failure once.

## R6. "Undo last" reaches into yesterday; past days cannot be corrected — MEDIUM

- `undoLast` removes the last entry in the array regardless of its day
  (`store.ts:363`). On a morning with nothing logged yet, tapping "undo
  last" deletes last night's final cigarette, shows "Undone. It never
  happened.", and nothing on screen changes. The user has altered
  yesterday's verdict without knowing.
- Entries can be edited or removed only from today's list. A wrong backfill
  ("3" on the wrong day) can only be reversed by tapping undo immediately.
  After that it is permanent, and it can break a streak or relock a
  milestone.
- Backfill allows days before the install day. Those entries are saved but
  no calculation counts pre-install days, so the toast confirms something
  that changes nothing.

**Fix:** limit undo to the most recent action if it was made in this
session (or today); add a simple day view for the last few days with the
same edit/remove row Log already has; disable pre-install days in Backfill.

## R7. Money credits a full day before anything has happened — MEDIUM

`computeSavings` values each day as (baseline − smoked) and counts today "as
it stands", starting from the install day (`domain.ts:88-98`). Consequences:

- **Minute one.** A 10-a-day Gold Flake Kings smoker finishes setup, opens
  Money, and reads "Saved since you started: ₹240" before doing anything.
  If they installed at 9 pm after smoking eight, it still says ₹240.
- **Every morning.** The total jumps by a full day's baseline at 4 am and is
  then eaten down by each cigarette logged. "This week" swings the same way.

The first is the app's first claim about money and it is not true. The same
partial-install-day problem was fixed for the smoke-free count (old finding
#5) and for milestone pushes; Money was missed.

**Fix:** leave the install day out, and either count only completed days in
the total or pro-rate today by the time of day. Completed days is simpler
and matches how the flip and milestones already reason.

## R8. SOS: the screen sleeps, and nothing tells you that you made it — MEDIUM

The craving timer runs five minutes and the breathing guide asks the user to
watch a circle without touching the phone. Nothing keeps the screen awake, so
the phone dims and locks after its normal timeout, usually 30 seconds. The
timer itself is correct (it reads the clock), but the guide is gone.

A smoker in a craving also commonly leaves the app. If they do, the five
minutes end with no signal. The survived result appears only if they come
back.

**Fix:** keep the screen awake while the countdown is on (`expo-keep-awake`),
and schedule one local notification for the end of the timer, cancelled if
they finish or leave the screen. The copy for that push needs the same care
as the other pushes (no smoking vocabulary on a lock screen).

Small related item: when the budget is zero, the "I smoked it anyway" flow
still says "it goes against today's budget" (`SosScreen.tsx:299`,
`strings.ts:240`). There is no budget in that state.

## R9. Screens do not refresh when the app returns to the foreground — MEDIUM

Stats, Goal, Money and Profile read the time once per render and only
re-render when the store changes. Log has a one-minute timer, which is
paused in the background. Tabs stay mounted. So a user who opens the app in
the morning without a cold start sees last night's numbers: Log still shows
yesterday's count and "budget torched" for up to a minute, and the other
tabs stay on yesterday until something is logged.

The first cigarette of the day is when a smoker most wants a clean slate and
an accurate budget.

**Fix:** one shared "now" in `AppContext`, updated on `AppState` → active
and once a minute, read by every screen.

## R10. No privacy, support or help link inside the app — MEDIUM

There is no way from inside the app to reach the privacy policy, the support
address, or any help. The only outbound link is the CDC source on the Health
screen.

- Google's user data policy asks for the privacy policy to be available in
  the app as well as on the listing. Confirm the current wording, but assume
  it is needed for the Play submission.
- The temporary "Send feedback" row from `GO_LIVE.md` §7.4 was never built.
  The Android closed test needs evidence of tester feedback.
- A smoker who wants real help has nowhere to go from here. India runs a
  free National Tobacco Quit Line (1800-11-2356; verify the number and hours
  before printing it). One quiet row on Profile and on the SOS "I smoked it
  anyway" result costs nothing and is the right thing for a cessation app to
  carry. It also supports the store framing as a quit aid.

**Fix:** an "About" section at the bottom of Profile: Privacy policy, Email
support (prefilled `mailto:` with app version and platform), Quit line.

## R11. The permission prompt appears at the wrong moment — LOW/MEDIUM

The system notification prompt is requested from inside `reconcile()` the
first time something is planned. In practice that is immediately after the
user logs the cigarette that takes them past 80% of the budget, or on
opening the app in the evening. It arrives with no explanation, at a moment
when the user is least receptive, and on iOS a refusal is final.

`GO_LIVE.md` §10 lists this as an open question. Recommendation: ask at the
end of onboarding, on the plan-ready card, with one line of context ("Want a
heads-up before you run out for the day?"), and keep the current path as the
fallback.

## R12. Smaller items — LOW

- **Savings goal is the same for everyone.** "Goa flight, one way, ₹4,500"
  is hard-coded (`MoneyScreen.tsx:24`). Letting the user name their own goal
  and price is cheap and makes the Money tab theirs.
- **Stats stops at 28 days.** There is no view of the whole journey from the
  first week to now, which is the most motivating picture for someone three
  months into a taper.
- **Range of smokers.** The baseline is 1 to 40 a day with a half-cigarette
  budget floor. Someone who smokes a few a week cannot be represented, and
  bidi smokers are not served (already in BACKLOG). `design/TRACK_MODE.md`
  covers the not-yet-committed user.
- **Accessibility.** Backfill's "Add" button has no role or label
  (`BackfillScreen.tsx:168`); Profile's pace chips have a label but no role
  (`ProfileScreen.tsx:289`). The Welcome screen clipping risk from the
  July audit is still unverified.
- **Storage growth.** All data is one AsyncStorage value rewritten on every
  log. Android cannot read a single value much above 2 MB. At 20 a day that
  is roughly four years away, so it is not urgent, but it is a hard wall.
- **iOS-only wording in dev-only UI** (`ProfileScreen.tsx:377`). Never ships;
  tidy when A2 is fixed.

## Android findings

The Android list lives in `design/ANDROID_LAUNCH.md` §2 (A1–A17). Changes in
this round:

- **A3 fixed:** the privacy page now covers iPhone and Android, both stores,
  and both backup systems.
- **A16 added** (= R2 above): channel must be created before the permission
  request.
- **A17 added** (= R10 above): in-app privacy policy link.
- **A10 confirmed with numbers** (= R4 above).
- A1 (name edit dead on Android) and A2 ("We'll ask iOS") are still open.

---

## Suggested improvements

Beyond fixing the above. Ordered by what a smoker would feel first.

| # | Improvement | Why it matters to the user | Effort |
|---|---|---|---|
| 1 | Nudge before the user's measured danger window (R3a) | Help arrives before the craving, which is when it can work | Medium |
| 2 | Restore from file, offered on Welcome (R4) | A new phone no longer costs the streak | Medium |
| 3 | SOS end-of-timer push and screen kept awake (R8) | The craving tool works when the phone is in a pocket | Small |
| 4 | Ask for notifications on the plan-ready card (R11) | More people get nudges at all | Small |
| 5 | Sunday recap push: fewer smoked than last week, rupees kept | One positive, earned message a week; brings lapsed users back with nothing leaving the phone | Small |
| 6 | Own savings goal in place of the Goa flight (R12) | "My bike down payment" beats a stock example | Small |
| 7 | About section: privacy, support, quit line (R10) | Trust, and a route to real help | Small |
| 8 | Home-screen widget with one-tap log | Cuts the friction that causes unlogged cigarettes. Also the strongest Pro candidate (`MONETISATION.md`) | Large, native |
| 9 | All-time "where I started" chart | The picture that keeps a three-month user going | Medium |
| 10 | Hinglish roast pack | Sounds like the user's friends; no competitor has it | Large, mostly copy |

## What is working and should not be disturbed

Recorded so later changes do not undo it.

- Post-zero mode asks instead of assuming, and a relapse gets a quiet note
  instead of a roast. This is the hardest thing in the app to get right and
  it is right.
- Push copy is deterministic, carries no smoking vocabulary, and nothing is
  scheduled that could be false on delivery.
- History is effective-dated everywhere: changing baseline, brand or pace
  never rewrites past verdicts.
- Health and nicotine figures carry sources, confidence and a disclaimer.
- All copy is in one file with its rules written down next to it.
