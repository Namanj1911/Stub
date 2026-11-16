# Stub — Android launch plan (Google Play)

Written **2026-11-16**. Companion to `GO_LIVE.md`, which was written
iOS-first. On 2026-11-02 the owner moved the launch to Google Play because
Apple Developer enrollment is blocked. India is also about 95% Android
(BACKLOG, Later), so this is the larger market regardless.

This doc covers only what is different on Android. Everything in `GO_LIVE.md`
about local-only data, DPDP, crash reporting, updates and the cessation
framing still applies and is not repeated.

**Where this stands today**

- No Android build of Stub has ever been run. There is no `eas.json`, no EAS
  project linked in `app.json`, no `android/` directory, and no Android SDK
  or `adb` on the development machine.
- The owner and both early testers use iPhones.
- The earliest realistic public release is **late December 2026**, and only
  if the 14-day closed test (§3) starts by the end of November. That test is
  the critical path; nothing else on this page takes as long.

---

## 1. What carries over and what does not

| Area | Status on Android |
|---|---|
| App code, domain logic, jest suite | Carries over. One real bug and several unverified surfaces: §2 |
| Icon, adaptive icon, splash, notification icon | Configured in `app.json`. The notification icon has never been seen on a device (BACKLOG ⚠) |
| Package name `com.stubapp.stub` | Already set. **Permanent once uploaded** — confirm before the first upload |
| Privacy/support page | Rewritten for both platforms 2026-11-16; live once merged and pushed |
| Support mailbox | Carries over unchanged |
| Dev build tooling (`expo-dev-client`, `expo-updates`) | Installed. Only ever built for iOS |
| Sentry | Wired, inert until a DSN is set. Keep it unset for this launch: §5 |
| SDK 54 pin | Not a blocker. See A9 |
| 1.4.3 copy audit (passed 2026-07-26) | The same framing is what Google needs: §5 |

## 2. Findings from reviewing the code for Android

Nothing below has been checked on a device, because there is no Android
build yet. Items marked **bug** are certain from reading the code; the rest
are things the first build must confirm.

| # | Finding | Kind | Where |
|---|---|---|---|
| A1 | **Name edit in Profile does nothing on Android.** It uses `Alert.prompt`, which exists only on iOS. The code comment says so: "iOS-only, which is the only platform we ship". Needs a small modal with a text field | **Bug** | `src/screens/ProfileScreen.tsx:93` |
| A2 | Notification permission copy says "We'll ask iOS for permission" | **Bug** (copy) | `src/strings.ts:97` |
| A3 | ~~Privacy page is written for iPhone only.~~ **Fixed 2026-11-16** in the working tree: the page now covers both platforms, both stores and both backup systems. It goes live when the change is merged to main and pushed | Fixed, not yet live | `docs/index.html` |
| A4 | Android 13+ needs a runtime notification permission; confirm the existing prompt flow triggers it and that denial is handled | Verify | `src/notifications.ts` |
| A5 | Scheduled notifications use date triggers. Without the exact-alarm permission Android may deliver them late when the phone is idle. The budget nudge (45 minutes) and craving-window alerts are the time-sensitive ones. Decide whether late is acceptable before requesting exact alarms, which Google restricts | Verify, then decide | `src/notifications.ts:127` |
| A6 | Xiaomi, Oppo, Vivo and Realme phones, which are most of the Indian market, have aggressive battery managers that can drop scheduled notifications. Test on at least one | Verify | — |
| A7 | Gold glow on medals, Health and Goal uses iOS shadow properties, which Android ignores. Only the SOS button sets `elevation`. Cosmetic; the cards will look flatter | Cosmetic | `src/Medal.tsx:42`, `HealthScreen.tsx:237`, `GoalScreen.tsx:536` |
| A8 | Edge-to-edge display is mandatory at this SDK level. Check the tab bar and the SOS button against the gesture bar, and the hardware back button on SOS, Backfill, Nicotine and the setup flow. `predictiveBackGestureEnabled` is already `false` | Verify | `app.json` |
| A9 | Target API level. Google requires new apps to target Android 16 (API 36) since 2026-08-31. Expo SDK 54 is expected to target 36; read the value from the first build before relying on it | Verify | build output |
| A10 | JSON export passes the whole dataset as share text. Android limits how much data one share can carry (about 1 MB in total, less in practice). Measured export size: 361 KB after a year at 10 a day, 722 KB at 20 a day, 1.4 MB after two years. Export a file instead, and add restore (review finding R4) | **Bug** at scale | `ProfileScreen.tsx:83` |
| A11 | Android backs app data up to the user's Google account by default (Expo's `android.allowBackup` defaults to true, confirmed in the config plugin). That softens the single-device risk in `GO_LIVE.md` §8.2 the same way iOS backup does. The privacy page now says so. Confirm a restore actually brings the data back on a second device | Verify | — |
| A12 | The expanding rows in the nicotine screen use `LayoutAnimation`, enabled on Android by an experimental flag that may do nothing under the new architecture. Worst case is no animation | Cosmetic | `NicotineScreen.tsx:31` |
| A13 | Keyboard handling on the setup name step and steppers: no keyboard-avoiding wrapper anywhere. iOS happened to be fine | Verify | `SetupScreen.tsx` |
| A14 | No `android.versionCode`. Let EAS manage it (`appVersionSource: remote`, `autoIncrement`) | Config | `eas.json` (to create) |
| A15 | Haptics vary widely across Android phones; the haptic vocabulary was tuned on iPhone | Verify | `src/haptics.ts` |
| A16 | **The notification permission prompt will probably never appear.** The code asks for permission before creating the notification channel; Expo's documentation says Android 13+ shows no prompt until a channel exists. Every nudge and milestone would be silently off. Create the channel first. From documentation, not a device: check this first on the first build (review finding R2) | **Likely bug** | `src/notifications.ts:109,118` |
| A17 | No link to the privacy policy inside the app. Google's user data policy asks for one in the app as well as on the listing. Add an About section to Profile (review finding R10) | Gap | `ProfileScreen.tsx` |

A1, A2, A16 and A17 are code changes and each needs the usual branch and
owner check. The rest need a build and a phone. The whole-app review of
2026-11-16 (`REVIEW_FINDINGS_2026-11-16.md`) has more findings that are not
Android-specific; R1 (speed) matters most on budget Android phones.

## 3. Google Play requirements that shape the schedule

### 3.1 Account

- **Registration: US$25, once.** Identity verification is required.
- A new personal account must also verify access to a **real Android
  device** through the Play Console mobile app. The owner needs an Android
  phone in hand for this and for §2, even briefly. A budget Xiaomi or Realme
  is the right choice because it doubles as the A6 test device.
- Google shows the developer's legal name and country on the listing. See
  `MONETISATION.md` F8 for what changes when the app earns money.

### 3.2 The 12-tester, 14-day closed test

Personal accounts created after 13 November 2023 cannot publish to
production until a **closed test has had at least 12 testers opted in for 14
continuous days**. Then the owner applies for production access and answers
questions about how the test went. (The number was 20 until late 2024.)

What this means in practice:

- **Recruit 15–20, not 12.** If the count drops below 12 on any day the
  clock is at risk. Each tester needs a Google account, must accept the
  opt-in link and install from Play, and must stay opted in.
- **They must be real users.** Several 2026 write-ups report Google rejecting
  production applications for low tester engagement. Paid tester pools are
  the usual cause and are not worth the risk. Stub's testers should be
  people who smoke, or at least will open the app daily for two weeks.
- **Ship at least two updates during the window** and keep notes on what
  testers said and what changed. The production application asks for exactly
  that.
- The closed test is also the only user research this launch gets. Use it
  for the monetisation questions in `MONETISATION.md` F2.

Where to find them: the owner's Android-using friends and colleagues first.
The two iPhone testers cannot count.

### 3.3 Tracks, in order

1. **Internal testing** — up to 100 testers, available within minutes, no
   review. Use it for the owner's own device and the §2 fixes.
2. **Closed testing** — reviewed by Google before testers get it; this is
   where the 14 days run.
3. **Production access application** — after day 14. Allow about a week.
4. **Production** — reviewed again. Use a staged rollout.

Open testing is not a shortcut: it unlocks only after production access.

## 4. Build pipeline

1. Install the EAS CLI, run `eas init` (links the Expo project) and
   `eas build:configure` (creates `eas.json`). Profiles: `development`
   (dev client, APK), `preview` (APK for sideloading), `production` (AAB).
2. First build: `eas build -p android --profile development`. Android builds
   run in EAS's cloud, so no local Android SDK is required. The free tier
   includes Android builds each month; check the current allowance on the
   Expo pricing page.
3. **Signing:** let EAS generate and hold the upload key, and enrol in Play
   App Signing when creating the app. The Expo account and the Google account
   are the two things that must never be lost; 2FA on both.
4. **First upload is manual.** Google requires the first AAB to be uploaded
   through the Play Console. After that `eas submit` can do it with a service
   account key.
5. **Updates:** EAS Update works the same on Android as described in
   `GO_LIVE.md` §7.5. Set the runtime version policy when configuring it.

## 5. Play Console declarations and listing

All of these are under Policy → App content, and all must be complete before
the closed test can be reviewed.

| Item | What to enter |
|---|---|
| Privacy policy | The GitHub Pages URL, once the rewritten page is pushed |
| Data safety | No data collected, no data shared. True only while Sentry has no DSN. If crash reporting is turned on, declare crash logs first and update the privacy page, as `GO_LIVE.md` §6 already says for iOS |
| Ads | No ads |
| App access | No login; all features available |
| Content rating | Answer the questionnaire honestly about tobacco references. Expect a high rating; do not soften answers to lower it |
| Target audience | 18 and over only |
| Health apps declaration | Required of every app. Declare Stub as a health app in the category that matches habit/cessation tracking, with the "not medical guidance" position |
| Category | Health & Fitness |
| Contact details | `stubapp.help@gmail.com` |

**Framing.** Google's policy bars apps that facilitate the sale of tobacco or
encourage its use; cessation tools are a normal Play category. The same rule
as the App Store applies: the listing must read as a way to smoke less and
quit, never as a neutral smoking log. One health-disclaimer line in the
description. No medical claims. I did not find Google's current tobacco
policy text in this research pass, so read the Inappropriate Content and
Health Content policy pages before submitting.

**Listing assets still to make**

| Asset | Spec |
|---|---|
| App name | 30 characters max. Check "Stub" for collisions; plan "Stub: smoke less" or similar |
| Short description | 80 characters |
| Full description | 4,000 characters; cessation-framed |
| App icon | 512×512 PNG |
| Feature graphic | 1024×500. Required. No iOS equivalent exists yet |
| Phone screenshots | At least 2, up to 8. Shoot from an Android build, not the iOS simulator |

Sell local-only privacy as a listed feature (BACKLOG): "your data never
leaves your phone".

## 6. Sequence

| # | Step | Who | Depends on |
|---|---|---|---|
| 1 | Get an Android phone (budget Xiaomi/Realme) | Owner | — |
| 2 | Create the Play Console account, pay US$25, verify identity and device | Owner | 1 |
| 3 | Start recruiting 15–20 Android testers | Owner | — (start now) |
| 4 | `eas init`, `eas.json`, first development build on the phone | Dev | 1 |
| 5 | Fix A1, A2, A16, A17 and review findings R1 and R3 (copy at minimum); walk every screen for the rest of §2 and fix what is found | Dev + owner | 4 |
| 6 | ~~Rewrite the privacy page for both platforms~~ Done 2026-11-16; merge and push to publish | Dev | — |
| 7 | Create the app in Play Console; complete §5 declarations; draft listing | Owner + dev | 2, 6 |
| 8 | Production build, manual first upload to internal testing | Dev | 5, 7 |
| 9 | Promote to closed testing; send opt-in link; **day 0** | Owner | 3, 8 |
| 10 | Two or more updates during the 14 days; log feedback and changes | Dev + owner | 9 |
| 11 | Day 14: apply for production access | Owner | 10 |
| 12 | Screenshots, feature graphic, final listing | Dev + owner | 5 |
| 13 | Production release, staged rollout | Owner | 11, 12 |

Steps 1–3 are the owner's and none of them need code. Step 3 is the one most
likely to slip the date.

**Timeline if steps 1–8 finish by 30 November:** closed test runs to about
14 December, production access about a week later, public release in the
last week of December. Each week of delay in starting the closed test moves
the release by a week.

## 7. Costs

| Item | Cost |
|---|---|
| Play Console registration | US$25 once (about ₹2,200) |
| Android test phone | About ₹8,000–12,000 if none can be borrowed |
| EAS, GitHub Pages, Sentry | Free tiers |

## 8. Open questions

| Question | When it bites | Stance |
|---|---|---|
| Does the Play Console account exist yet? | Step 2 | Not recorded anywhere in the repo |
| Is "Stub" usable as the Play title? | Step 7 | Check early; have a subtitle form ready |
| Are late notifications acceptable (A5)? | Step 5 | Probably yes for milestones, test the budget nudge before deciding |
| Sentry on for the closed test? | Step 8 | Off. The Play pre-launch report and Console vitals give crash data with no privacy change. Revisit after production |
| In-app "Send feedback" row (`GO_LIVE.md` §7.4)? | Step 9 | Worth building now: Play's tester feedback is easy to miss and step 11 needs evidence of feedback |
| Does iOS resume when Apple enrollment works? | After step 13 | Yes, on `GO_LIVE.md` as written; the Android fixes do not affect iOS |
| Monetisation | After production | See `MONETISATION.md`. Launch free, no purchases |

## Sources

- [Google Play target API level requirements](https://developer.android.com/google/play/requirements/target-sdk) · [Play Console help](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291) · [Health content and services policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en)
- 12-tester rule (secondary sources; Google's own help page was not retrieved, so confirm the numbers in Play Console): [ProAndroidDev](https://proandroiddev.com/how-to-get-12-testers-for-google-play-closed-testing-and-actually-pass-6a2ab52a0779) · [Choicely](https://www.choicely.com/blog/google-play-12-tester-rule) · [engagement rejections, vendor source](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/) · [EAS Submit](https://docs.expo.dev/submit/android/) · [Expo pricing](https://expo.dev/pricing)
