# Stub — Go-live readiness plan

Research write-up (2026-07-17) for the BACKLOG item "Go-live readiness plan".
What shipping to real users requires, what it costs, which rules apply, and
which core-design decisions must be settled before launch. Nothing here is
built yet — this doc exists so we build things in the right order.

Scope: iOS / App Store first (owner and testers are on iPhones). Play Store
is a later, separate pass.

---

## 1. Where we are

- Prototype runs in **Expo Go** off a local Metro server; only the owner can
  use it, only while the dev server runs.
- **All data is on-device** (AsyncStorage). Nothing leaves the phone except
  the manual JSON export via the share sheet. This is a *massive* simplifier
  for privacy compliance — see §5.
- Pinned to **SDK 54** because App Store Expo Go supports nothing newer.
  Note: once we distribute our own build, Expo Go's SDK ceiling stops
  mattering — the pin can be revisited after the dev-build switch (no rush;
  SDK 54 is fine).

## 2. The distribution pipeline

Each step gates the next; all are one-time setup except builds.

1. **Apple Developer Program** — $99/year (billed in ₹ at enrollment;
   India enrolls via the Apple Developer app, individual account is fine).
   Needed for TestFlight, push certificates, and the store listing.
2. **EAS development build** (`expo-dev-client`) — replaces Expo Go on our
   own phones. EAS Build free tier is 15 iOS builds/month, which is plenty;
   paid Starter tier ($19/mo) only if we hit queue/timeout pain.
3. **TestFlight internal testing** — up to 100 internal testers, no review,
   near-instant. This is where "anyone else installs" first becomes true →
   **app icon/splash must land before this step** (logo already made).
4. **TestFlight external testing** — up to 10,000 testers via a public
   link, requires a lightweight Beta App Review. Builds expire after 90
   days, so a live beta needs a rebuild every ~3 months.
5. **App Store listing** — full App Review, listing assets (screenshots,
   description, keywords), support URL, privacy policy URL, privacy
   "nutrition label", age rating questionnaire.

A reasonable resting state is **living on TestFlight external for a while**:
real users, real feedback, lighter review, no listing-page work — at the
cost of the 90-day rebuild treadmill.

## 3. App Review realities for a cigarette app

- **Guideline 1.4.3**: apps that *encourage* tobacco consumption are
  rejected. Stub is a reduction/cessation tracker, which is the permitted
  side of the line — but the listing copy and in-app framing must
  consistently read "quit gradually", never "track your smokes" neutrally.
  Roast-mode copy is fine; the store description is what reviewers read
  first, write it as a quitting aid.
- **Age rating**: Apple's 2025 revamp added 13+/16+/18+ tiers with a new
  mandatory questionnaire. Frequent tobacco references — Stub's entire
  subject — lands at **18+**. Accept it; do not try to minimize references
  to duck the rating (that's a rejection vector). This also satisfies the
  ROADMAP's "18+ age gate" line — the store rating *is* the gate; no in-app
  age screen needed for v1.
- **Guideline 5.1.3 (health)**: health-adjacent user data can't be used for
  advertising or shared with third parties. We collect nothing and show no
  ads, so we comply by default — this becomes a real constraint only if
  analytics (BACKLOG "Later") ever ships.
- **Health disclaimers**: NicotineScreen's "not medical guidance" fine
  print already exists; mirror one line of it in the listing description.
- **Privacy nutrition label**: today we can truthfully declare **"Data Not
  Collected"** — the best label an app can have, and a genuine selling
  point for this audience. Analytics or cloud sync would immediately change
  the label, the review answers, and the DPDP posture. **Sequencing
  conclusion: launch local-only first; add off-device features later as a
  deliberate, separately-reviewed step.**

## 4. Required non-code assets

| Asset | Notes |
|---|---|
| App icon + splash | Logo exists (Claude Design); needs export at required sizes via `app.json` — do before any TestFlight install |
| Privacy policy URL | Required by App Store Connect even for "Data Not Collected". One static page; GitHub Pages is fine and free |
| Support channel URL | Required listing field. Simplest: same GitHub Pages site + a dedicated email alias |
| Screenshots | 6.7" and 6.5" iPhone sets minimum; can screenshot from the dev build |
| Store description | Cessation-framed, one health-disclaimer line, no medical claims |

## 5. Privacy law (DPDP) — what actually binds us and when

The DPDP Act 2023's Rules were notified **14 Nov 2025**, with phased
enforcement: the Data Protection Board exists now; consent-manager and
Significant Data Fiduciary obligations bite **14 Nov 2026**; the remaining
substantive duties (notice formats, 72-hour breach reporting, penalties up
to ₹250 crore) bind everyone from **14 May 2027**.

What this means for Stub, concretely:

- **v1 local-only**: we do not process users' personal data on any server —
  there is essentially nothing to comply *with*. The privacy policy states
  exactly that. This is the strongest argument for the local-only launch.
- **The moment analytics or cloud sync ships**, Stub becomes a data
  fiduciary processing health-adjacent personal data: itemized consent
  notice (plain language, English + listed Indian languages at full
  enforcement), verifiable consent withdrawal, data deletion on request
  (the "delete account" requirement already flagged in BACKLOG), breach
  notification duties, and a published grievance contact. That is a real
  project, not a checkbox — it stays bundled with the sync/analytics items
  and must not ride in on a "small" update.
- Timing note: full enforcement lands **14 May 2027** — any off-device
  feature shipped before then should still be built to the Rules, since
  retrofitting consent records is worse than collecting them correctly
  from day one.

## 6. Crash reporting

Sentry is the default choice: `@sentry/react-native` supports Expo SDK 50+,
has a config-plugin setup (`npx @sentry/wizard -i reactNative`), integrates
with EAS, and the free tier (5k events/mo) is far more than a beta needs.
Caveats: inside Expo Go it captures JS errors only — native crash capture
needs the dev build (one more reason the dev build comes first); source-map
upload is automatic with EAS Build.

Privacy interaction: crash reports are off-device data. Sentry can be
configured to scrub PII and Stub's crashes shouldn't contain user data, but
the privacy label changes from "Data Not Collected" to "Diagnostics —
Crash Data (not linked to you)". That label is still excellent and worth
the trade **at the TestFlight-external step** — flying blind with 100+
testers is worse. Requires one line in the privacy policy; well under DPDP
materiality for now, revisit at full enforcement.

## 7. Core-design risks to settle before a public listing

Ordered by how much they'd hurt if ignored.

1. **Placeholder nicotine/tar data in `src/brands.ts`** — fine for us,
   not fine on a public store listing that shows "12.5 mg nic" as fact.
   Vetted dataset + real printed-MRP sourcing must land **before external
   TestFlight**, or the numbers ship with a much louder ~estimated
   treatment. (BACKLOG "Later" item, now with a deadline attached.)
2. **Single-device data with no backup** — a real user who loses their
   phone loses their streak and history; the JSON export is the only
   recovery path and nobody will have used it. Decision to make: ship v1
   explicitly single-device (listing copy says so, onboarding nudges an
   occasional export) — recommended — or block launch on cloud sync
   (months of work + the full DPDP surface of §5). Recommendation: ship
   single-device; revisit sync only if retention data (or user complaints)
   demand it.
3. **Notifications before launch?** S15–S17 (budget nudge, craving-window
   alerts, milestones) are all *local scheduled* notifications — they need
   no server and, it turns out, still work in Expo Go for prototyping;
   they only need the dev build to ship. They're the app's main retention
   lever, so they should be in the launch build — but they're not a
   *gate* for starting the pipeline (§2 steps 1–3 can proceed in
   parallel).
4. **Copy audit for 1.4.3** — one pass over `src/strings.ts` with
   reviewer eyes: nothing that reads as celebrating smoking itself. Low
   effort, do it just before first review submission.

## 8. Recommended sequence

Each step is independently shippable; nothing here builds ahead of the
BACKLOG's discussion rule — items marked ⚠ need their own design/discussion
pass first.

1. Apple Developer enrollment ($99/yr) — pure paperwork, start now.
2. Icon + splash from the existing logo (small; already backlogged P2).
3. EAS dev build on owner's phone; retire the Expo Go constraint.
4. ⚠ Notifications S15–S17 + milestone roasts (prototype in Expo Go now,
   ship via dev build).
5. Sentry crash reporting (small; alongside step 3 or 4).
6. TestFlight internal (owner + a few friends) — first real-user feedback.
7. ⚠ Vetted brands dataset + real MRPs (gates step 8, not step 6).
8. Privacy policy + support page (one static site), copy audit, listing
   assets → TestFlight external.
9. Decide App Store listing vs. staying on TestFlight based on beta signal.

Explicitly deferred: cloud sync/accounts, product analytics (both drag in
the §5 DPDP surface), Play Store, remote-fetch brand DB.

---

## Sources

- [Expo EAS pricing](https://expo.dev/pricing) · [EAS plans docs](https://docs.expo.dev/billing/plans/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.4.3, 5.1.3)
- [Apple age rating update](https://developer.apple.com/news/?id=ks775ehf) · [values & definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [DPDP Rules 2025 notification (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) · [phased-timeline analysis](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/) · [implementation checklist](https://www.scrut.io/post/dpdp-rules)
- [expo-notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/) (Expo Go limitations)
- [Sentry for Expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) · [Expo guide](https://docs.expo.dev/guides/using-sentry/)
