# Stub — Monetisation: plan, review, revenue estimates

Written **2026-11-16**. Until now the monetisation plan was one paragraph in
`BACKLOG.md` (Later → Monetization) plus one row in `GO_LIVE.md` §10
("Free forever?"). This doc restates that plan, reviews it, and puts numbers
on it. Nothing here is a build instruction: per the BACKLOG rule, each item
needs its own discussion pass first.

**The short version**

- The plan's direction (free at launch, one-time Pro unlock at ₹199–299, no
  ads, never paywall logging or SOS) is sound and should stand.
- At that price, in India, on organic installs, Stub earns **hobby money, not
  income**: roughly **₹20,000 in year one** in the base case, with a
  plausible range of about ₹1,500 to ₹2 lakh. With Pro arriving around
  month 4 the first twelve months come to about ₹17,000–19,000 (§3.5). The
  estimates are in §4.
- The plan had three gaps: no defined Pro feature set, a "decide from
  retention data" step with no data source, and a billing library choice
  that decides whether the "no data collected" claim survives.
- **§3 is the strategy:** the quit path is free for ever; Pro is new comfort
  features (widget, full history, monthly report, pattern breakdown, roast
  voices); a tip jar around month 2, Pro around month 4; the offer appears
  only after the user has kept ₹500, and never on Log, in SOS or after a
  slip.

---

## 1. The plan as it stands

From `BACKLOG.md`, decided 2026-07-17:

| Element | Current position |
|---|---|
| Timing | Deferred until after beta testing and product-market fit |
| Model | One-time Pro unlock, India-priced at about ₹199–299; possibly a tip jar |
| Ads | Never. They break the "Data Not Collected" label and the trust positioning |
| Hard limits | Never paywall logging or SOS |
| Free/Pro split | Undecided; "decide from beta retention data — pay for what people demonstrably stay for" |

`GO_LIVE.md` §10 adds that v1 ships free with no in-app purchases, to keep
review, tax and banking paperwork out of the first launch.

## 2. Review findings

Ordered by how much each one changes what gets built.

### F1. There is nothing defined to sell (gap, blocks everything else)

Every feature Stub has today ships free, and the first testers will have all
of it. Locking any of it later takes something away from existing users,
which costs reviews and trust in an app whose pitch is trust.

The full free/Pro split and its timing are in §3.2 and §3.4.

**Recommendation:** adopt one rule now: **Pro is only ever made of things
built after launch; nothing free at launch is ever locked.** Candidates
already on the roadmap that fit this rule and are not logging or SOS:

| Candidate | Source | Fit as Pro |
|---|---|---|
| Home-screen widget (today vs budget, time since last) | BACKLOG Later, ROADMAP v3.6 | Strong. Visible daily, clearly "extra" |
| Monthly report | ROADMAP v3.7 | Strong. One-off build, no running cost. The milestone share card stays free because every share is an advert |
| Full history (all-time and 90-day charts) | Review R12 | Strong. Extends the free 28-day view without removing anything |
| Trigger tagging and insights | ROADMAP v3.2 | Good. Tagging stays free; the insight view is Pro |
| Extra roast voices | New | Good. Hinglish itself should be free: it is the main lever on installs |
| Alternate app icons / accent themes | New | Cheap filler; fine as a bonus, weak as a reason to pay |
| Cloud backup and sync | ROADMAP v2.7, GO_LIVE §7.7 | **Poor fit for a one-time price** — see F5 |

### F2. "Decide from beta retention data" has no data source (contradiction)

The plan says to choose the split from retention data. The launch plan
(`GO_LIVE.md` §7.1) deliberately ships no product analytics, so there is no
feature-level usage data to decide from. The store consoles report installs,
uninstalls and coarse retention only.

**Recommendation:** keep analytics off, and replace the data step with three
things that need no telemetry:

1. Ask the closed-test group directly (the 12+ Android testers, see
   `ANDROID_LAUNCH.md`): which screen would you miss, what would you pay for.
2. Ask willing testers to send their JSON export; it already contains
   everything needed to see what they used.
3. Run the tip jar first (F3) and treat it as the willingness-to-pay signal.

### F3. The tip jar should come first, not "possibly"

A tip jar (a "Buy the dev a chai" row in Profile at two or three price
points) gates nothing, so it cannot violate F1 or the hard limits. It also
forces all the one-time plumbing through once: merchant profile, bank and
tax details, billing library, purchase restore, store review with a purchase
in the build. On both stores tips must go through the store's own billing.

Expect it to earn very little (§4.4). Its value is the plumbing and the
signal, and it makes the later Pro launch a small change.

### F4. The billing library choice decides the privacy claim

Stub's listing claim is that nothing leaves the phone. Purchases made through
Play Billing or StoreKit are handled by the store under the user's store
account; the app can read "does this account own Pro" on-device with no
server and no login. That keeps the claim intact.

Routing purchases through a subscription-management SDK that keeps a server-
side customer record (RevenueCat and similar) sends an app user ID and
purchase history to a third party. That changes the Play Data safety form
and the App Store privacy label, and it starts the DPDP obligations that
`GO_LIVE.md` §5 is built around avoiding.

**Recommendation:** use a direct store-billing library (`expo-iap` or
`react-native-iap`), store the entitlement locally, restore from the store
account. Both need a native build, which the dev-build setup already
provides. Confirm SDK 54 compatibility at build time.

### F5. One-time price and running costs do not mix

A one-time unlock pays once; cloud backup costs money every month the user
stays. If sync ever ships it should be free (as a trust feature), or a
separate small subscription, and not part of a ₹249 lifetime Pro. Keep Pro
to features with no per-user running cost.

### F6. One-time is the right model for this product (confirms the plan)

Stub is designed to be finished: a 10-a-day smoker on the Steady pace reaches
zero in about 20 weeks. A subscription would earn only while the user is
still smoking, which puts revenue in conflict with the product's purpose and
would read that way to this audience. A one-time price near the cost of a
single pack is honest and easy to explain. The cost is that revenue tracks
new installs only; there is no recurring base (§4).

### F7. Price: keep ₹199–299, anchor it on the user's own numbers

- A pack of 10 Gold Flake Kings is ₹240 in the app's own dataset. **₹249 is
  one pack.** The Money tab already knows the user's spend; a 10-a-day Kings
  smoker spends about ₹7,200 a month, so Pro is about one day of smoking.
  That comparison is the entire pitch and it is in Stub's voice.
- Set prices per country instead of letting the store convert ₹249. A
  default near US$4.99 outside India costs nothing and each non-India sale
  nets about twice an Indian one.
- Do not discount below ₹199. At ₹99 the net is about ₹71 a sale and no
  realistic volume makes up the difference.

### F8. Paperwork the plan has not costed

These are one-time setup, but they are owner tasks with lead time:

- **Payments profile** on Google Play (and paid-apps agreement on Apple):
  bank account, PAN, tax details.
- **Public address.** Google shows a developer's legal name and country on
  the listing, and for developers who earn money on Play it shows the full
  address. For a personal account that is a home address. Confirm the current
  rule in Play Console before turning on any paid product; an organisation
  account or a registered business address avoids it.
- **Tax.** The stores collect and remit GST on sales to Indian buyers; the
  proceeds are still personal income. At the volumes in §4 this is well under
  the GST registration threshold. Confirm with a CA before the first payout.
- **Service fee.** The 15% tier on the first US$1M a year is the working
  assumption. On Google Play it has required enrolment in Play Console and is
  not automatic. A restructuring of Play's fees was reported during 2026,
  with India reportedly unchanged until 2027; this is from third-party
  write-ups and should be checked in Play Console when the payments profile
  is created.

### F9. Things to keep rejecting

- **Ads:** the plan is right. On top of the privacy label, both stores
  restrict ad use of health-related data, and the audience is 18+.
- **Sponsorship or affiliate links for nicotine gum, patches, vapes:** they
  are ads by another name, they turn general information into a health
  recommendation, and vapes are banned in India.
- **Selling or sharing data:** not compatible with anything else in this
  repo.

One route is worth recording as a later, separate idea and not part of this
plan: licensing Stub to employers or insurers as a wellness benefit. It pays
per seat, not per install, but it needs accounts, reporting and a sales
effort that do not exist.

## 3. Strategy: what to charge for, and when

Added 2026-11-16 after the whole-app review
(`REVIEW_FINDINGS_2026-11-16.md`). The user is a smoker trying to cut down.
The strategy follows from that: **everything that helps someone smoke less is
free; Pro is the things that make the app nicer to live with.** Nobody should
ever be able to say Stub held their quit attempt to ransom.

### 3.1 Rules

1. **The quit path is free for ever.** Logging, the budget and taper, SOS,
   nudges, the health timeline, money saved, and getting your data out and
   back in.
2. **Nothing free at launch is ever locked** (F1).
3. **Never ask for money at a weak moment.** No offer on the Log screen,
   inside SOS, after a slip, when over budget, or in the first seven days.
4. **Ask when the app has earned it.** The first unprompted offer appears
   only once the Money tab shows at least ₹500 kept, twice the price, so the
   user is paying out of money Stub helped them not spend.
5. **One price, once.** No subscription, no ads, no data sold (F6, F9).
6. **Quiet after a no.** Dismissing an offer silences unprompted offers for
   30 days. The Pro row in Profile is always there for anyone looking.

### 3.2 Free or Pro, feature by feature

"Exists" means it ships today. Everything in the Pro column is new work, so
rule 2 holds.

| Feature | Tier | Status | Reasoning |
|---|---|---|---|
| Log 1 / ½ / ⅓, undo, backfill, edit | **Free** | Exists | The product. An unlogged cigarette breaks every number |
| Daily budget, taper plan, restart a taper | **Free** | Exists | The quit mechanism |
| Craving SOS, breathing, end-of-timer push | **Free** | Exists / R8 | A craving is the worst possible moment for a paywall |
| Budget nudge, milestones, danger-window nudge, Sunday recap | **Free** | Exists / proposed | Retention. A lapsed user buys nothing |
| Health timeline, nicotine and tar data | **Free** | Exists | Health information is not sold |
| Money saved, plus one savings goal of your own | **Free** | Exists / proposed | The best motivator, and the Money tab is where the Pro pitch lives |
| Stats: day, week, 28 days, heatmap, one insight | **Free** | Exists | Already shipped |
| Export, and restore from a file (R4) | **Free** | Exists / proposed | Trust. Charging for someone's own history would undo the privacy pitch |
| Hinglish as a language | **Free** | Proposed | It is the main lever on installs, and installs drive everything in §4 |
| Milestone share card | **Free** | Proposed | Every share is an advert; charging for it taxes our own marketing |
| Home-screen widget (today vs budget, time since last, one-tap log) | **Pro** | To build | On the home screen every day, so it is the feature people will most see the value of. In-app logging stays free |
| Full history: all-time and 90-day charts, "where I started" | **Pro** | To build | Extends what exists without taking any of it away. Only matters to people who stayed, who are the people willing to pay |
| Monthly report (reduction, rupees kept, nicotine avoided) | **Pro** | To build | One-off build, no running cost |
| Pattern breakdown: by hour, weekday and trigger | **Pro** | To build | The single insight stays free; the full breakdown is depth for the committed user |
| Extra roast voices (for example "Mom mode", "Bollywood mode") | **Pro** | To build | Pure fun, fits the brand, cheap to add one at a time |
| More than one savings goal | **Pro** | To build | The first one is free |
| Accent themes and alternate app icons | **Pro** | To build | Bonus, never the reason to buy |
| Cloud backup and sync | **Not in Pro** | Later | Running cost; see F5 |

One call the owner should make deliberately: the widget's one-tap log. It is
listed as Pro because logging in the app remains free and two taps away. If
that sits badly with rule 1, the fallback is a free plain log widget and a
Pro widget with the budget ring and styles.

### 3.3 Where the offer appears

| Place | What the user sees | Trigger |
|---|---|---|
| Profile | A "Stub Pro" row, always present once Pro exists | None; it is a menu item |
| A Pro feature | Tapping it shows what it does and the price | User action |
| Money tab | One line under the total: "You've kept ₹1,240. Pro costs ₹249, about one pack." | Kept ≥ ₹500 and at least day 8 |
| A milestone card (7-day streak, first clean day) | A single quiet line beneath the celebration | Earned milestone, not more than once per milestone |
| Never | Log, SOS, slip notes, over-budget states, onboarding, any push notification | — |

### 3.4 Phases and what unlocks each

| Phase | When | What ships | Gate to enter |
|---|---|---|---|
| **0. Free launch** | Now → about 4 weeks after production release | No purchases. Fix the review findings. Interview closed-test users about what they would pay for (F2) | — |
| **1. Supporter** | About month 2 | Tip jar in Profile: ₹49 / ₹99 / ₹249, "Buy the dev a chai". Anyone who tips is marked a Supporter and gets Pro free when it exists | Production access; payments profile set up; address rule checked (F8); roughly 300 installs so there is someone to ask |
| **2. Pro v1** | About month 4 | Pro at ₹249 with the widget and full history; monthly report if ready. Founding price ₹199 for the first 30 days | Two Pro features built and device-checked; the tip jar has run a month; about 1,000 installs |
| **3. Pro grows** | Months 6–12 | Pattern breakdown, roast voices, themes, extra goals. Existing owners get all of it. Consider ₹299 for new buyers once Pro holds four or more features | Pro v1 reviewed against §4; a sales number to compare with |
| **4. Beyond the user** | Year 2, only if 1–3 work | Gift codes so family can buy Pro for a smoker (in India the person who most wants the quit is often not the smoker). Employer or insurer licences (F9) | Evidence that people buy at all |

If a gate is missed, stay in the phase. Phase 1 producing no tips at all from
a few hundred users is a reason to rethink Pro before building it, which is
cheaper than finding out after.

### 3.5 What the timing does to year one

The table in §4.3 assumes Pro is on sale all year. With Pro arriving around
month 4, only about nine months of installs meet a paywall. For the base
case that is roughly 90 sales, or **about ₹16,000**, plus ₹1,000–3,000 from
the tip jar: **₹17,000–19,000 in the first twelve months after launch.**
Year two has Pro on sale throughout and more features in it.

## 4. Revenue estimates

These are estimates built from stated assumptions, not forecasts. Stub has no
installs yet, so the two inputs that matter most (installs and conversion)
are judgement calls. The method is shown so the numbers can be redone as soon
as real ones exist.

### 4.1 What one sale is worth

Store prices in India include 18% GST, and the store takes its fee from the
pre-tax amount. Assuming the 15% fee tier:

| Listed price | Before GST | Net to owner per sale |
|---|---|---|
| ₹199 | ₹169 | **₹143** |
| ₹249 | ₹211 | **₹179** |
| ₹299 | ₹253 | **₹215** |

At a 30% fee the ₹249 figure drops to about ₹148.

### 4.2 Assumptions

| Input | Low | Base | High | Basis |
|---|---|---|---|---|
| Installs in year one | 3,000 | 15,000 | 60,000 | Judgement. Organic only, India only, no marketing spend. For scale: the global category leaders show 1M+ (Kwit) and 5M+ (QuitNow) lifetime installs on Google Play after many years |
| Install → Pro | 0.3% | 0.8% | 2.0% | Judgement. The global median for health and fitness apps is about 2.9% of downloads paying within 35 days (RevenueCat 2026), and about 2.1% for freemium apps across categories. Those figures are weighted to the US and to subscription trials; India converts well below that, so the global median is used as the high case |
| Price | ₹249 | ₹249 | ₹249 | F7 |

### 4.3 Year-one Pro revenue

| Scenario | Installs | Sales | Net revenue |
|---|---|---|---|
| Low | 3,000 | 9 | **about ₹1,600** |
| Base | 15,000 | 120 | **about ₹21,500** |
| High | 60,000 | 1,200 | **about ₹2.15 lakh** |

Sensitivity at ₹249 (net, year one):

| Installs ↓ / Conversion → | 0.3% | 0.8% | 2.0% |
|---|---|---|---|
| 3,000 | ₹1,600 | ₹4,300 | ₹10,700 |
| 15,000 | ₹8,100 | ₹21,500 | ₹53,800 |
| 60,000 | ₹32,300 | ₹86,100 | ₹2.15 lakh |

Because the product is one-time, year two is not year one plus growth. It is
whatever year two's new installs convert at.

### 4.4 Tip jar

Tip jars in free utilities typically convert a small fraction of a percent of
users. At 0.1–0.3% of 15,000 installs and an average tip near ₹100 (about
₹72 net), that is **roughly ₹1,000–3,500 a year**. Treat it as plumbing and
signal (F3).

### 4.5 Against costs

| Cost | Amount |
|---|---|
| Google Play registration | US$25 once (about ₹2,200) |
| Apple Developer Program, if iOS proceeds | US$99 a year (about ₹8,800) |
| EAS Build / Update, Sentry, GitHub Pages | Free tiers |

- Android only: **about 12 Pro sales** recover the Play fee, once.
- Both stores: **about 50 sales a year** cover the recurring Apple fee.
- The base case covers costs with a little left over. It does not pay for
  time.

### 4.6 What it would take to be income

₹1 lakh a month net at ₹249 is about 560 sales a month. At 1% conversion
that is roughly **56,000 installs a month**, which is the scale of the
category leaders and is not reachable on organic India installs alone. The
realistic levers, in order of effect:

1. **Installs.** Store listing quality, Hinglish (no competitor has it),
   and word of mouth from the roast voice. This input moves everything.
2. **Non-India pricing** (F7). A sale at US$4.99 nets about twice a sale
   at ₹249.
3. **Conversion.** A Pro feature that is on the home screen every day (the
   widget) and a pitch priced in cigarettes.
4. **A second product line** such as the employer route in F9, which is the
   only path here that is not capped by India consumer pricing.

## 5. Open decisions for the owner

| Decision | Recommendation |
|---|---|
| Adopt "nothing free at launch is ever locked"? | Yes (F1) |
| Tip jar before Pro? | Yes, after production access (F3) |
| Billing library: direct store billing vs RevenueCat-style SDK | Direct, to keep the privacy claim (F4) |
| Pro price | ₹249, per-country pricing, about US$4.99 elsewhere (F7) |
| First Pro features | Widget + full history, then the monthly report, confirmed by tester interviews (§3.2, F2) |
| Is the one-tap log widget Pro or free? | Pro, with a free plain log widget as the fallback (§3.2) |
| First-offer gate | ₹500 kept and day 8 or later (§3.1, §3.3) |
| Founding price | ₹199 for the first 30 days of Pro, ₹249 after (§3.4) |
| Personal vs organisation Play account, given the public-address rule | Check the rule in Play Console before enabling payments (F8) |

## Sources

- [RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) — conversion medians (global; no India breakdown was found)
- [Google Play: billing requirements for India](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en) · [user choice billing](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en)
- Third-party reports of the 2026 Play fee restructuring (unconfirmed against Google): [ecorpit](https://ecorpit.com/google-play-service-fee-split-2026-app-economics/) · [vmobify](https://vmobify.com/blog/google-play-service-fees-india)
- Competitor install counts and price ranges: [bequit comparison](https://bequit.app/best-quit-smoking-apps) · [habitbox](https://habitbox.app/blog/quit-smoking-tracker)
- Pack price: `src/brands.ts` (`gf-kings`, ITC Feb-2026 MRP)
