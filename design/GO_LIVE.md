# Stub — Go-live plan (living doc)

Refreshed **2026-07-21**; supersedes the 2026-07-17 research write-up.
What shipping to real users requires, what it costs, which rules apply, which
decisions are already made, and — new in this revision — the owner's
operational questions answered plus a register of the questions nobody has
asked yet. The goal: progress to go-live with **all questions known**, even
the ones without answers yet.

Scope: this doc was written iOS / App Store first. **That order changed on
2026-11-02** — see the revision note below. The iOS pipeline here still
stands for when Apple enrollment is unblocked.

### Revision 2026-11-16

- **Launch moved to Google Play.** Apple Developer enrollment is blocked, so
  Android goes first. The Android plan, including findings from reviewing
  the code for Android, is in `ANDROID_LAUNCH.md`. The critical path is
  Google's closed test: 12 testers opted in for 14 continuous days before a
  personal account can publish.
- **Monetisation now has its own doc**, `MONETISATION.md`: a review of the
  BACKLOG plan plus revenue estimates. Headline: the plan's direction holds;
  at ₹249 one-time on organic India installs the base case is about ₹21,500
  in year one. Launch stays free with no purchases.
- **The app is not iOS-clean on Android.** Profile's name edit uses
  `Alert.prompt` (iOS only), the notification-permission copy names iOS, and
  the privacy page is written for iPhone. Details: `ANDROID_LAUNCH.md` §2.
- **Statuses below were stale and are corrected**: dev build and Sentry
  wiring are done (§1, §9.3, §9.5), the copy audit passed (§8.4), and the
  timezone and accessibility register items are closed or partly closed
  (§10).
- **DPDP date passed.** The 14 Nov 2026 phase in §5 is now in force. It does
  not change anything for a local-only app; the 14 May 2027 date is the one
  that binds any off-device feature.
- **Whole-app review done** (`REVIEW_FINDINGS_2026-11-16.md`), written from
  the smoker's point of view. Four high findings: the main screens slow down
  as history grows (measured), the Android notification prompt will probably
  never appear, onboarding promises trigger nudges that were never built,
  and export has no import. The July review (`REVIEW_FINDINGS.md`) is fully
  closed and now says so.
- **Privacy page rewritten for both platforms** (`docs/index.html`). Live
  once merged to main and pushed. §4's row and the URL are unchanged.
- **§8.2 needs a caveat:** "onboarding nudges an occasional export" is only
  half true. Profile suggests exporting, but there is no import, so an
  export cannot restore anything yet (R4). Device backup (iCloud, Google)
  is the only real safety net today.
- **Still not started:** no `eas.json` and no EAS project link exist, so no
  EAS cloud build has been made for either platform. The dev build so far is
  a local iOS one.

---

## 1. Where we are (2026-07-21)

Changed since the last revision:

- **Notifications shipped** (S15 budget nudge and S17 milestones.
  *Correction 2026-11-16: S16 craving-window alerts were not built, although
  onboarding still promises them — review finding R3.*) — local scheduled, no server, deterministic copy so reconcile's
  change-detection works. §7's old "notifications before launch?" question is
  answered: they're in.
- **Icon / splash / notification-icon assets exist** and are wired in
  `app.json` (`expo-splash-screen` plugin, adaptive icon, notification icon).
  The old "must land before TestFlight" gate is cleared.
- **Jest suite** over the pure domain modules; code-review round done
  (`REVIEW_FINDINGS.md`), including the P0 zero-budget one-way door
  (explicit "start a new taper" exit, owner-chosen option c).
- **Store hygiene is better than the old doc assumed**: every log entry
  carries a stable `id` + `timestamp` (`store.ts:45`), and a `migrate()`
  ladder already exists (`store.ts:104`). Both matter later — see §8.7 and
  §10.

Unchanged:

- ~~Still runs in Expo Go; no dev build yet.~~ **Updated 2026-11-16:**
  `expo-dev-client` and `expo-updates` are installed and a local iOS dev
  build runs (notifications verified on the simulator, 2026-07-22). No EAS
  cloud build yet, and no Android build of any kind.
- **All data on-device** (AsyncStorage); the only export is manual JSON via
  the share sheet. Still the privacy-compliance simplifier — see §5.
- Pinned to **SDK 54** (Expo Go ceiling). The pin stops mattering at the
  dev-build step and can be revisited then; no rush.

A note on what "Expo" means here, since it confused the room once: Expo is
the *framework*; Expo Go is a *development sandbox*; the thing users install
from the App Store is a **standalone native build** produced by EAS. There is
no later migration off Expo to become "a real app" — the store build already
is one. The only transition is Expo Go → dev build → TestFlight, and that's
build plumbing, not a rewrite.

## 2. The distribution pipeline

Each step gates the next; all are one-time setup except builds.

1. ☐ **Apple Developer Program** — $99/year (India enrolls via the Apple
   Developer app; individual account is fine). Needed for TestFlight, push
   certificates, and the store listing.
2. ☐ **EAS development build** (`expo-dev-client`) — replaces Expo Go on our
   own phones. EAS Build free tier is 15 iOS builds/month, plenty; paid
   Starter ($19/mo) only if queue pain.
3. ☐ **TestFlight internal testing** — up to 100 testers, no review,
   near-instant. Icon/splash prerequisite: **done**.
4. ☐ **TestFlight external testing** — up to 10,000 testers via public link;
   lightweight Beta App Review; builds expire every 90 days (rebuild
   treadmill).
5. ☐ **App Store listing** — full App Review, screenshots, description,
   support URL, privacy policy URL, privacy label, age questionnaire.

A reasonable resting state is **living on TestFlight external for a while**:
real users, real feedback, lighter review, no listing-page work — at the cost
of the 90-day rebuild treadmill.

## 3. App Review realities for a cigarette app

- **Guideline 1.4.3**: apps that *encourage* tobacco consumption are
  rejected. Stub is a reduction/cessation tracker — the permitted side of the
  line — but listing copy and in-app framing must consistently read "quit
  gradually", never neutral "track your smokes". Roast-mode copy is fine; the
  store description is what reviewers read first — write it as a quitting
  aid.
- **Age rating**: frequent tobacco references land Stub at **18+** under the
  2025 questionnaire. Accept it; minimizing references to duck the rating is
  a rejection vector. The store rating *is* the ROADMAP's 18+ age gate; no
  in-app age screen for v1.
- **Guideline 5.1.3 (health)**: health-adjacent data can't be used for ads or
  shared with third parties. We collect nothing and show no ads — compliant
  by default; becomes a real constraint only when analytics ships (§8.1).
- **Health disclaimers**: NicotineScreen's "not medical guidance" fine print
  exists; mirror one line in the listing description.
- **Privacy nutrition label**: today we truthfully declare **"Data Not
  Collected"** — the best label an app can have and a genuine selling point
  for this audience. Analytics or cloud sync immediately changes the label,
  the review answers, and the DPDP posture. **Sequencing conclusion: launch
  local-only; add off-device features later as a deliberate,
  separately-reviewed step.**

## 4. Required non-code assets

| Asset | Status |
|---|---|
| App icon + splash | **Done** — assets exported, wired in `app.json` |
| Privacy policy URL | **Done** — `docs/index.html` in the repo; owner enables GitHub Pages (main, `/docs`) → `https://namanj1911.github.io/Stub/` |
| Support channel URL + email | **Done** — `stubapp.help@gmail.com` (created 2026-07-22; forwards to owner, 2FA); same page serves as support URL |
| Screenshots | ☐ 6.7" and 6.5" iPhone sets minimum; shoot from the dev build |
| Store description | ☐ Cessation-framed, one health-disclaimer line, no medical claims |

## 5. Privacy law (DPDP) — what binds us and when

DPDP Act 2023 Rules notified **14 Nov 2025**, phased: Data Protection Board
exists now; consent-manager and SDF obligations bite **14 Nov 2026**;
remaining substantive duties (notice formats, 72-hour breach reporting,
penalties to ₹250 crore) bind everyone **14 May 2027**.

- **v1 local-only**: we process no personal data on any server — essentially
  nothing to comply *with*. The privacy policy says exactly that. Strongest
  argument for the local-only launch.
- **The moment analytics or cloud sync ships**, Stub becomes a data fiduciary
  processing health-adjacent personal data: itemized consent notice,
  verifiable consent withdrawal, deletion on request, breach duties,
  published grievance contact. A real project, not a checkbox — it stays
  bundled with the sync/analytics items and must not ride in on a "small"
  update.
- Any off-device feature shipped before 14 May 2027 should still be built to
  the Rules — retrofitting consent records is worse than collecting them
  correctly from day one.

## 6. Crash reporting

Sentry (`@sentry/react-native`): supports SDK 50+, config-plugin setup,
EAS-integrated source maps, free tier 5k events/mo. JS-only inside Expo Go —
native crash capture needs the dev build (another reason it comes first).

Privacy interaction: crashes are off-device data. Label changes from "Data
Not Collected" to "Diagnostics — Crash Data (not linked to you)" — still an
excellent label, worth the trade **at the TestFlight-external step**; flying
blind with 100+ testers is worse. One line in the privacy policy; under DPDP
materiality for now.

## 7. Owner's operational questions, answered

Asked 2026-07-21; answers are decisions unless marked open.

### 7.1 "Do I need a backend to monitor analytics?"

**No.** Three layers exist, none of which we build or host:

1. **App Store Connect** (free, automatic, zero code): downloads, updates,
   country, sessions, crashes, retention proxies. This alone answers "who
   downloaded / who's using it" at launch scale.
2. **TestFlight metrics** during beta: installs, sessions, crashes per
   build — testers consent to this as part of TestFlight, no privacy-label
   impact.
3. **Product analytics SDK** (PostHog/Amplitude — funnels, screen flows,
   D1/D7/D30 retention): **deliberately deferred.** An earlier working
   recommendation was to ship PostHog at launch; on reflection against §3
   and §5 it is *reversed* — for an 18+ health app whose store label
   ("Data Not Collected") is a selling point and whose DPDP surface
   triggers on the first off-device byte, store-level metrics cover the
   launch questions and product analytics waits for the deliberate
   consent-and-label project it belongs to.

### 7.2 "Do I need a separate mailbox / mail IDs?"

**Yes, one address** — the support field in the listing is mandatory, and it
becomes the DPDP grievance contact later. **Created 2026-07-22:
`stubapp.help@gmail.com`** (personal Google account named "Stub Support",
forwarding to the owner's inbox, 2FA on; a custom domain stays
nice-to-have, not required). Same address is on the privacy-policy page.
App Store Connect correspondence itself arrives at the Apple ID used to
enroll — that stays the owner's personal one.

### 7.3 "Do I need a backend dashboard?"

**No.** Every service in this plan ships its own console: App Store Connect
(downloads/sales), TestFlight (beta), Sentry (crashes), and later
PostHog/Supabase if/when those arrive. Building a custom dashboard is
justified only when you need one pane across all of them — a v-much-later
problem.

### 7.4 "How do I collect beta feedback in-app, temporarily?"

Two layers, zero backend, both consistent with local-only:

1. **TestFlight's built-in feedback** (free, already there): testers
   screenshot → "Share Beta Feedback" → it lands in App Store Connect with
   device/OS context attached. Most feedback should flow here; tell testers
   about it in the TestFlight "What to Test" notes.
2. **A temporary "Send feedback" row in Profile** that opens a prefilled
   `mailto:` to the §7.2 address (via `Linking.openURL`), optionally
   attaching the existing JSON export. Nothing leaves the device except the
   email the user consciously sends. Ship it behind a simple flag so it can
   be removed (or kept) at GA. Small feature — but per the BACKLOG rule it
   gets its own discussion pass before building.

### 7.5 "How do I push updates?"

Two lanes, different speeds:

- **JS-only changes** (screens, copy, domain logic — most of what we ship):
  **EAS Update** delivers over-the-air; users get the new bundle on next app
  restart, no store review, minutes not days. Requires adding
  `expo-updates` at the dev-build step. Free tier: 1,000 monthly active
  users. Works into TestFlight builds too.
- **Native changes** (new SDK, new native module, icon, permissions):
  new **EAS Build** → TestFlight (internal: instant; external: light
  review) → App Store (full review, typically 24–48 h). Version bump +
  build-number auto-increment via EAS.

Rule of thumb: OTA for fixes and copy, builds for anything touching
`app.json` plugins or native deps. The 90-day TestFlight expiry (§2.4) sets
a floor of one rebuild per quarter regardless.

### 7.6 "Do I need loading screens? How fast does it start? How big is it?"

- **Splash already exists** — `expo-splash-screen` is configured in
  `app.json` and fonts load via `useFonts` before first render. That *is*
  the loading screen; no extra work needed. One polish item: verify the
  splash holds until AsyncStorage hydration finishes, so users never see a
  frame of empty state (check when the dev build lands — Expo Go masks
  this).
- **Cold start**: expect ~1–2.5 s on recent iPhones for a Hermes-compiled
  RN app this size; the splash covers it. Measure on the first dev build,
  not in Expo Go (Go adds its own overhead).
- **Download size**: expect roughly **25–40 MB** on the App Store — the RN
  runtime dominates; our assets are tiny. The authoritative number appears
  in App Store Connect's App Size report after the first upload. User data
  growth is trivial: a year of heavy logging is well under 1 MB.

### 7.7 "If I add logins later, how does existing data sync?"

The design is **local-first, cloud as opt-in backup** — login is a feature
("Back up my progress"), never a wall on first launch:

1. Device keeps working exactly as today; AsyncStorage stays the source of
   truth.
2. On sign-in (Sign in with Apple — mandatory on iOS anyway — plus
   Google/magic-link; Supabase is the standing recommendation for
   auth + Postgres + row-level security in one free tier), the local
   records upload keyed by their existing `id`s.
3. Merge is mechanical because the pre-work already exists: every entry has
   a stable `id` + `timestamp` (`store.ts:45`), so multi-device merge is
   union-by-id with last-write-wins on settings. **No schema work is needed
   now** — this was the one thing worth auditing early, and it passes.
4. The whole feature arrives bundled with its DPDP surface (§5) as one
   deliberate project.

### 7.8 "If I take a name/username, how do I personalize?"

**A name does not need an account.** It's one optional local field:

- Ask once ("what should we call you?", skippable) in Setup or Profile →
  store in the AsyncStorage profile → interpolate in `strings.ts` copy and
  roasts ("Naman, that's the third one before noon").
- No login, no server, no privacy-label change — a locally stored name the
  user typed for display is still "Data Not Collected" territory since it
  never leaves the device.
- Include it in the JSON export; if sync ever ships, it rides along.
- BACKLOG candidate; needs its own discussion pass (where to ask, how roast
  copy uses it, opt-out).

## 8. Core-design risks to settle before a public listing

Ordered by hurt-if-ignored; statuses updated.

1. ✅ **Nicotine/tar/MRP data in `src/brands.ts`** — DONE (dataset BUILT
   2026-07-18, `DATASET_VERSION` 2; re-verified 2026-07-22). 15 real brands
   with per-field provenance: every MRP is `printed` confidence tied to a
   URL-cited source (ITC Feb-2026 revision, distributor lists,
   quick-commerce), every nicotine/tar figure honestly carries
   `study`/`proxy`/`estimate` confidence and the `~` softness prefix. No
   dangling source refs. See `design/BRANDS_DATA_PLAN.md`. Guarded by
   `src/__tests__/brands.test.ts` (11 assertions, mutation-checked) so the
   invariants can't silently regress.
2. ☐ **Single-device data with no backup** — decision stands: ship v1
   explicitly single-device (listing copy says so; onboarding nudges an
   occasional export). Two softeners discovered since: iOS device backups
   (iCloud/local) *do* include AsyncStorage, so new-phone-via-restore keeps
   data — the real loss case is a dead/stolen phone with no backup; and the
   sync pre-work already passes (§7.7.3), so the escape hatch is cheaper
   than feared.
3. ✅ **Notifications** — S15–S17 shipped with deterministic copy; they need
   the dev build to ship to others, which the pipeline provides anyway.
4. ✅ **Copy audit for 1.4.3** — passed 2026-07-26 with no changes:
   `src/strings.ts` roasts the behaviour and never celebrates smoking.
   Carried forward: the store description on both stores must frame Stub as
   a reduction/quit aid.

## 9. Recommended sequence

Nothing here builds ahead of the BACKLOG's discussion rule — ⚠ items need
their own design/discussion pass first.

1. ☐ Apple Developer enrollment ($99/yr) — pure paperwork, start now.
2. ✅ Icon + splash — done, wired in `app.json`.
3. ◐ Dev build — `expo-dev-client` + `expo-updates` installed and a local
   iOS build runs. Still open: EAS project + `eas.json`, and a build on a
   physical phone (now Android first, `ANDROID_LAUNCH.md` §4).
4. ✅ Notifications S15–S17 — shipped.
5. ◐ Sentry crash reporting — wired in `App.tsx`, inert until
   `EXPO_PUBLIC_SENTRY_DSN` is set. No Sentry project yet; stays off for the
   Android closed test.
6. ✅ Support mailbox (`stubapp.help@gmail.com`) + privacy/support page
   (`docs/index.html`, 2026-07-22). Last click: owner enables GitHub Pages
   (repo Settings → Pages → deploy from `main`, folder `/docs`).
7. ☐ TestFlight internal (owner + a few friends) — first real-user feedback,
   via TestFlight's built-in feedback. ⚠ Optional in-app feedback row
   (§7.4) discussed/built here if wanted.
8. ✅ Vetted brands dataset + real MRPs — done (BUILT 2026-07-18, re-verified
   2026-07-22; §8.1).
9. ☐ Copy audit (§8.4), screenshots, listing draft → TestFlight external.
10. ☐ Decide App Store listing vs. staying on TestFlight based on beta
    signal.

Explicitly deferred, each a deliberate future project with its own DPDP/label
pass: product analytics (§7.1.3), cloud sync + accounts (§7.7), monetisation
(`MONETISATION.md`), remote-fetch brand DB. Play Store is no longer
deferred (`ANDROID_LAUNCH.md`). Independent small candidates: name personalization
(§7.8) — local-only, can ship any time after discussion.

## 10. Questions not yet asked (register)

The unknown-unknowns, so they stop being unknown. Each gets promoted to a
numbered section when it becomes live.

| Question | When it bites | Short answer / stance |
|---|---|---|
| Is the name "Stub" available on the App Store? | Listing creation | App names aren't globally unique but collisions hurt search; check in ASC early, plan a subtitle ("Stub — smoke less") regardless |
| Is `com.stubapp.stub` final? | First TestFlight upload | Bundle ID is **permanent** once shipped; confirm before step 3 of §2 |
| Who owns the keys? | First build | Let EAS manage signing credentials (default, recommended); the Apple ID + Expo account are the crown jewels — 2FA both |
| What if Apple rejects? | First review | Common, recoverable; rejections cite a guideline and you reply/resubmit in the Resolution Center — budget a week of back-and-forth into any launch date |
| Free forever? | Before listing | v1 free with no IAP. Reviewed 2026-11-16 in `MONETISATION.md`: tip jar first, then a one-time Pro at about ₹249 made only of post-launch features |
| Oldest supported iPhone? | External beta | SDK 54 floors at iOS 15.1; test small screens (SE) before external — layout was designed on big phones |
| Store schema changes after launch? | First post-launch feature | Once real users have data, every `store.ts` shape change needs a `migrate()` rung — the ladder exists (`store.ts:104`); the discipline becomes mandatory, not optional |
| Notification opt-in rate? | Beta | The prompt currently fires right after logging the cigarette that passes 80% of budget, with no context. Recommended: ask on the plan-ready card (review finding R11). On Android the prompt may not appear at all (R2) |
| Accessibility pass? | Before listing | Roles pass done 2026-07-26. Still open: WelcomeScreen has no scroll view and a large scaling headline, so it may clip on a small phone at maximum text size. Check on an iPhone SE and a small Android phone; TalkBack has never been run |
| Time zones / DST in day-keyed data? | First traveling user | Audited 2026-07-26, clean and now under test. Known limit: history is bucketed with the device's current offset, so travel can shift entries near midnight. Deferred to the sync project |
| What does "delete my data" mean? | Listing questionnaire | Local-only: the reset flow *is* deletion; say so in the privacy policy. Becomes a legal duty (DPDP) only when data goes off-device |
| Play Store pass? | **Now** | Active launch path since 2026-11-02. See `ANDROID_LAUNCH.md` |

---

## Sources

- [Expo EAS pricing](https://expo.dev/pricing) · [EAS plans docs](https://docs.expo.dev/billing/plans/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/) · [expo-dev-client](https://docs.expo.dev/develop/development-builds/introduction/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.4.3, 5.1.3)
- [Apple age rating update](https://developer.apple.com/news/?id=ks775ehf) · [values & definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [TestFlight feedback docs](https://developer.apple.com/testflight/)
- [DPDP Rules 2025 notification (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) · [phased-timeline analysis](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/) · [implementation checklist](https://www.scrut.io/post/dpdp-rules)
- [expo-notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Sentry for Expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) · [Expo guide](https://docs.expo.dev/guides/using-sentry/)
