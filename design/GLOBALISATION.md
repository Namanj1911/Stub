# Stub — Globalisation: review, improvements, release plan

Written **2026-11-16**, after `MONETISATION.md` showed that India-only
revenue is hobby money (about ₹20,000 in year one, base case). This doc
reviews what it takes to release Stub outside India, where each sale is
worth roughly three times as much, and lists the changes the app needs
first. Like the other docs here, nothing in it is a build instruction: each
item needs its own discussion pass.

**How this was checked.** The code findings (§3) come from reading the
source on `main` at `669983d`. Nothing was run on a device set to a
non-Indian region. The market figures (§2, §5, §6: pack prices, quit-line
numbers, tax and store rules) are from memory and were **not** looked up
for this doc. They are marked "verify" and must be checked before anything
ships on them.

**The short version**

- Releasing abroad is the right lever. A Pro sale at US$6.99 nets about
  **₹530 against ₹179** in India, and paying users are a larger share of
  installs in the US, UK, Canada and Australia. An income of ₹1 lakh a
  month needs about **10,000 installs a month abroad, against 56,000 in
  India** (§2).
- It does not fix the hard input. Installs still have to be earned, in
  stores where established quit apps already compete. The base case with
  a global release is about **₹60,000 in year one**, three times the
  India-only figure and still not income (§2.3).
- Ticking "all countries" in Play Console today would ship a broken app.
  A user in London would see rupees, fifteen Indian brands, a price
  stepper that cannot express 80p, an Indian quit-line number that does
  not connect, and a savings goal of a flight to Goa. There are **six
  blocking findings** (G1–G6 in §3).
- The app is in better shape for this than most. Almost all copy is
  already in one file, there is no server and no account, so there is no
  data-residency or GDPR build work, and the health claims already cite a
  US source.
- **Recommended order:** make the app region-neutral in English (§4,
  phase A), release to the US, UK, Canada, Australia and New Zealand
  (phase B), then the EU and others (phase C). Translate only after sales
  exist (phase D).

---

## 1. What "global" should mean for Stub

Three different things get called globalisation. They cost very different
amounts.

| Step | What it is | Cost | Recommendation |
|---|---|---|---|
| Region-neutral | The same English app works for a smoker in any country: their currency, their prices, their dates, their quit line | Moderate. Most of §3 | **Do first** |
| Regional variants | English copy with local references (the Goa flight, chai breaks) swapped per region | Small, once the strings are keyed | Do with the above |
| Translation | Spanish, German, French and so on | Large for this app: the product is a voice, and roast humour does not survive machine translation | **Defer** until sales justify it |

On "diaspora": Indians living in the US, UK, Canada, the Gulf and
Australia smoke local brands at local prices, so they need everything in
§3 exactly as any other user there does. What is different about them is
reach. The planned Hinglish voice (`MONETISATION.md` §3.2) is something no
competitor has, and diaspora communities are a cheap first channel abroad.
Treat the diaspora as the first audience in each new country, and build
for everyone who lives there.

## 2. What it does to the numbers

### 2.1 What one sale is worth abroad

`MONETISATION.md` F7 suggested about US$4.99 outside India. The "Pro costs
about one pack" pitch supports more than that where packs cost more, so
the table uses a price that is under one pack in every market. Assumes the
15% fee tier and ₹89 to the dollar, the rate the monetisation doc used.

| Market | Pack of 20 (approx., verify) | Suggested Pro price | Net per sale | Against India (₹179) |
|---|---|---|---|---|
| India | ₹240 for 10 | ₹249 | ₹179 | 1× |
| United States | US$8–9, wide range by state | US$6.99 | about ₹530 | 3.0× |
| United Kingdom | £16–17 | £5.99 (includes 20% VAT) | about ₹480 | 2.7× |
| Canada | C$17–20 | C$8.99 | about ₹480 | 2.7× |
| Australia | A$40–55 | A$9.99 (includes 10% GST) | about ₹450 | 2.5× |
| Eurozone | €8–18 by country | €6.99 (includes VAT) | about ₹450 | 2.5× |

At US$4.99 the US figure is about ₹377, or 2.1×. Start at US$6.99; it is
easier to lower a price than to raise one.

### 2.2 Why the Money tab is stronger abroad

A cigarette costs ₹12–24 in the app's Indian dataset. It costs roughly ₹38
in the US, ₹94 in the UK and over ₹120 in Australia. A ten-a-day smoker in
the UK burns about £250 a month. The "back in your pocket" number, which
is Stub's best motivator and the place the Pro offer lives, grows several
times faster for these users. The first-offer gate ("₹500 kept",
`MONETISATION.md` §3.1) should become "twice the Pro price in the user's
currency".

### 2.3 Year-one estimate with a global release

Estimates from stated assumptions, same method as `MONETISATION.md` §4.
Stub has no installs anywhere yet, so both inputs are judgement.

| Input | Low | Base | High | Basis |
|---|---|---|---|---|
| Installs outside India, year one | 500 | 4,000 | 20,000 | Judgement. Organic only, English-language stores, no marketing spend, new entrant against established apps |
| Install → Pro | 0.8% | 2.0% | 3.0% | The global median for health apps quoted in the monetisation doc (about 2.9%) is weighted to these markets, so it is the high case here and not out of reach |
| Net per sale, blended | ₹500 | ₹500 | ₹500 | §2.1 |

| Scenario | Sales abroad | Net abroad | Plus India (`MONETISATION.md` §4.3) | Total |
|---|---|---|---|---|
| Low | 4 | about ₹2,000 | ₹1,600 | **about ₹3,600** |
| Base | 80 | about ₹40,000 | ₹21,500 | **about ₹61,500** |
| High | 600 | about ₹3 lakh | ₹2.15 lakh | **about ₹5.15 lakh** |

As in the monetisation doc, Pro arrives around month 4, so the first
twelve months come in below these.

### 2.4 What it would take to be income

₹1 lakh a month net is about 200 sales a month at ₹500. At 2% conversion
that is **about 10,000 installs a month outside India**. The India-only
route needed 56,000 a month. That is the whole case for this doc: the
target moves from the scale of the category leaders to the scale of a
well-run niche app. It still has to be earned, and §6 is about how.

## 3. Review findings

Ordered by how badly each one breaks the app for a user outside India.
G1–G6 block a release abroad. G7–G12 do not.

| # | Finding | Severity abroad |
|---|---|---|
| G1 | Currency is hard-coded to the rupee, in about 25 places | **Blocking** |
| G2 | Price per cigarette is a whole number from 1 to 99 | **Blocking** |
| G3 | The brand list, and onboarding step 2, are India-only | **Blocking** |
| G4 | The quit line is one Indian number, and the app dials it | **Blocking** |
| G5 | The savings goal is a flight to Goa at ₹4,500 | **Blocking** |
| G6 | India-specific wording in shared copy | **Blocking** (small) |
| G7 | Dates and times are forced to Indian format | Medium |
| G8 | Day boundaries move when the phone changes time zone; tests cover one zone | Medium |
| G9 | About 60 user-facing strings live in screens, outside `strings.ts` | Low now, blocking for translation |
| G10 | Product gaps: roll-your-own, vapes, pack sizes | Low now |
| G11 | Store listing and screenshots are India-shaped | Medium |
| G12 | Legal and tax items that only appear abroad | Owner tasks |

### G1. Currency is hard-coded to the rupee — BLOCKING

The `₹` sign and `en-IN` number grouping are written directly into the
screens. There is no currency anywhere in the saved profile.

| Where | What |
|---|---|
| `src/screens/MoneyScreen.tsx:26-28`, `:56-59`, `:99`, `:202`, `:207` | `inr()` / `inrSigned()` helpers and every amount on the Money tab |
| `src/stats.ts:179` | A second, separate `inr()` for the Stats tiles |
| `src/screens/SetupScreen.tsx:103`, `:240`, `:259`, `:301`, `:305`, `:445` | Onboarding: brand prices, "₹…/month going up in smoke", the plan card |
| `src/screens/NicotineScreen.tsx:243`, `:254`, `:384` | Brand list and the custom-brand price |
| `src/screens/ProfileScreen.tsx:225` | Price per stick |
| `App.tsx:122` | The Money tab icon is a coin with a ₹ on it |
| `src/strings.ts:102` | "Every log, craving and rupee saved — gone." |

**Improvement.** One `src/money.ts` with a single `fmtMoney(amount,
currency)` built on `Intl.NumberFormat`, and every site above calls it.
Add `currency` (an ISO code such as `INR`, `USD`, `GBP`) to the profile.
Onboarding sets it from the phone's region using `expo-localization`,
which is not installed yet, and Profile lets the user change it. Existing
profiles migrate to `INR`. The export should carry the currency so a
restored file means the same thing. The tab icon becomes a plain coin or
takes its glyph from the currency.

`Intl` is available in Hermes, the engine this app runs on, but its
currency output differs between iOS and Android. Check both on a device.

### G2. Price per cigarette is a whole number from 1 to 99 — BLOCKING

`brands.ts:84` rounds pack price over pack size to a whole number, and the
only place a user types a price (`NicotineScreen.tsx:363-386`) is a
stepper from 1 to 99 in steps of 1. That fits rupees. A cigarette is
about US$0.43, £0.83 or A$2.20, so outside India the price is either
unenterable or off by a large factor, and every number on the Money tab
inherits the error.

**Improvement.** Stop asking for a price per cigarette. Ask what people
know: **what a pack costs and how many are in it**. Store the per-stick
price as a decimal, or as pack price and pack size, and let the formatter
handle the currency's decimals. This is also more honest in India, where
the dataset already works from pack MRP. `PriceRecord` keeps its shape;
the value just stops being an integer. Check `computeSavings` and the
Stats tiles for anything that assumes whole numbers.

### G3. The brand list is India-only — BLOCKING

`src/brands.ts` holds fifteen Indian brands with Indian MRPs.
`SetupScreen.tsx:60` preselects Gold Flake Kings. "Something else" prices
the user at `BRAND_AVERAGES.price`, the Indian average, shown as "~₹19".
`NicotineScreen.tsx:121` is titled "brands sold in India", and
`HealthScreen.tsx:492` explains the estimates by reference to Indian
packs.

Building a brand database per country is not realistic and not needed.
Prices vary by state and shop, and nicotine and tar are not printed on
packs in the US or (verify) the EU and UK either, so the numbers would be
estimates everywhere.

**Improvement.** Gate the dataset by region. In India nothing changes.
Elsewhere, onboarding step 2 becomes "what do you smoke, and what does a
pack cost": a free-text brand name (optional), pack price, pack size. The
nicotine and tar figures use one generic per-cigarette estimate, labelled
as an estimate exactly as custom brands are today. The Nicotine screen
hides the brand table outside India and keeps its totals. The provenance
model in `brands.ts` already supports this: it is the "custom brand" path
made the default.

### G4. The quit line is one Indian number — BLOCKING

`src/links.ts:14` holds `1800-11-2356`. `callQuitLine()` dials it, and the
number is printed in Profile's About section and on the SOS result after a
slip (`strings.ts:128-129`). Abroad it will not connect, and a dead number
at the moment someone asked for a person to talk to is the worst place in
the app for an error.

**Improvement.** A small table keyed by country, each entry with the
number, the name of the service and the date it was checked, as the Indian
one is now. Where there is no verified entry, **hide the row** and the SOS
line; show nothing in preference to a wrong number. Candidates to verify
against each service's own site before use (from memory, unverified):

| Country | Service | Number (verify) |
|---|---|---|
| United States | 1-800-QUIT-NOW | 1-800-784-8669 |
| Canada | Smokers' Helpline | 1-866-366-3667 |
| United Kingdom (England) | NHS Smokefree helpline | 0300 123 1044 |
| Australia | Quitline | 13 7848 |
| New Zealand | Quitline | 0800 778 778 |
| Ireland | HSE Quit | 1800 201 203 |

The copy says "run by the health ministry". That is true of India's line
and wrong for most of these, so the description belongs in the table too.

### G5. The savings goal is a flight to Goa — BLOCKING

`MoneyScreen.tsx:24` fixes the goal at `GOA_FLIGHT = 4500` rupees. The
progress bar, the "weeks away" line and the yearly "N Goa flights" figure
all hang off it, and `strings.ts:98` ("Goa is drifting further away") and
`:341-349` (Goa, a Himalayan trek, a scooter down payment) repeat it.

**Improvement.** `MONETISATION.md` §3.2 already lists "one savings goal of
your own" as a free feature to build. Build it as part of this work: the
user names the goal and its cost in their own currency. A regional default
fills the blank until they do. This removes the constant instead of
translating it. The temptation lines become a pool per region (§G6).

### G6. India-specific wording in shared copy — BLOCKING (small)

Each of these reads as odd or wrong outside India. All are one-line
changes once strings are keyed by region.

| Where | Text | Problem abroad |
|---|---|---|
| `SetupScreen.tsx:32` | Trigger "Chai breaks" | Should be "Coffee breaks" or similar |
| `MoneyScreen.tsx:233-234`, `NicotineScreen.tsx:254` | "MRP" | An Indian retail term. "Pack price" |
| Throughout | "stick" for a cigarette | Indian English. Readable abroad, but "cigarette" or "a smoke" is safer in visible copy |
| `strings.ts:701` | "About average for your age group" | An India-based claim with no source shown |
| `SetupScreen.tsx:58` | Default of 10 a day, "~India daily average" | Keep 10 as a neutral default; the comment's basis is Indian |
| `strings.ts:128` | "run by the health ministry" | See G4 |
| `strings.ts:102` | "rupee saved" | See G1 |

**Improvement.** Give `strings.ts` a region dimension: a default English
table plus small override tables (`IN`, later others). India keeps every
line it has today, including Goa and chai, because those are part of why
the voice works there. The roast voice itself needs a read-through by a
native speaker from each launch market before release. Most lines are
neutral; "Bar night, huh" and "don't be that guy" are fine; a few may not
land.

### G7. Dates and times are forced to Indian format — MEDIUM

Eight call sites pass `'en-IN'` to `toLocaleDateString`
(`BackfillScreen.tsx:37-38`, `GoalScreen.tsx:58` and `:119`,
`HealthScreen.tsx:136`, `MoneyScreen.tsx:77`, `ProfileScreen.tsx:343`,
`SetupScreen.tsx:105`). A US user sees "16 Nov" where they expect
"Nov 16". Times are built by hand as 12-hour am/pm in three places:
`fmtHour` in `strings.ts:793`, the Backfill ranges
(`BackfillScreen.tsx:16-19`, "6 am – 12 pm") and the Stats day labels
(`stats.ts:50`, "6–9p"). Most of Europe uses the 24-hour clock.
`domain.fmtTime` already does this correctly by passing no locale.

**Improvement.** One `fmtDate` / `fmtHour` pair in a shared module that
uses the device locale, and the eight sites call it. Not blocking for the
first English-speaking markets, where the worst outcome is day-before-
month in the US, but cheap to do alongside G1.

### G8. Day boundaries and time zones — MEDIUM

`domain.dayKey()` (`domain.ts:197`) turns a timestamp into a day using the
phone's **current** time zone. `installDayKey` and plan start days are
saved as fixed numbers. Read together, this means that when the phone
changes zone, past entries near the 4am boundary are counted on a
different day than before, while the saved keys do not move. Budgets,
streaks and the money total can shift by a day's worth. This was reasoned
from the code and has not been reproduced.

In India, with one zone and no daylight saving, this only affects
international travellers. In the US, Canada and Australia, crossing zones
is ordinary, and the clocks change twice a year.

The test suite cannot see any of it: `jest.config.js:17` pins
`Asia/Kolkata`, and `fixtures.test.ts:15` asserts that it does. No test
runs in a zone with daylight saving.

**Improvement, in two parts.**

1. **Tests first.** Run the domain and notification suites a second time
   under `America/New_York` and `Europe/London`, with cases on the
   clock-change days. This is a second jest project, since the zone is
   set per process. It may find nothing; it is still the cheapest way to
   know.
2. **Then decide the model.** The durable fix is to save each entry's
   local day (or its UTC offset) when it is logged, so history stops
   depending on where the phone is now. That is a data migration and
   deserves its own design pass. It should not be folded into the
   currency work.

### G9. Strings outside `strings.ts` — LOW now

`strings.ts` holds the feedback copy, and its header says all user-facing
copy lives there. A rough count finds about 60 further lines of literal
text in the screens and `App.tsx`: headings, labels, the onboarding steps,
the trigger names, the Backfill buckets. Plurals are built by hand in the
English pattern (`day${n === 1 ? '' : 's'}`).

None of this matters for an English release. It all has to move before any
translation, and regional variants (G6) are much easier once it has.

**Improvement.** Move the literals into the table as part of the G6 work,
screen by screen, with no wording changes. Leave plural handling until a
second language is actually planned.

A note for the Hinglish and Hindi plans: the app's font is Inter, which
has no Devanagari glyphs. Hinglish in Latin script is unaffected. Hindi in
Devanagari would fall back to the system font.

### G10. Product gaps that show up abroad — LOW now

These do not block a release. They decide how well the app fits once it is
there.

- **Roll-your-own tobacco** is a large share of smoking in the UK,
  Ireland, Australia and New Zealand, because of pack prices. The pack
  price and pack size model in G2 does not describe a pouch. A "roughly
  how much do you spend a week" input would cover it.
- **Vapes, heated tobacco and nicotine pouches.** Many smokers in these
  markets use both. Stub counts cigarettes only. Stay out of this for
  now, and say so plainly in the listing.
- **Pack sizes.** 20 is standard in most places; 25s exist in Canada and
  Australia. G2's pack-size input covers it.
- **Approach.** Tapering down is less common advice abroad than quitting
  on a set date with nicotine replacement. That is Stub's niche, not a
  flaw: "for people who are not ready to quit cold" is the pitch (§6).

### G11. Store listing and screenshots — MEDIUM

`ANDROID_LAUNCH.md` §5 plans one listing. Every screenshot taken from the
current build shows rupees and Indian brands.

**Improvement.** After phase A, shoot a second screenshot set from a build
set to a US or UK region, and add a custom store listing per country group
in Play Console. Search terms differ by market: "quit smoking" in the US,
"stop smoking" in the UK, and "cut down" everywhere for Stub's actual
niche. On the name: in the UK and Australia "stub it out" is exactly the
right association. In the US "stub" also means a pay stub, so the subtitle
("Stub: smoke less") carries more weight there.

### G12. Legal and tax items that only appear abroad — OWNER TASKS

All of these need confirming at the time; the rules are stated from
memory.

| Item | What it means for Stub | When |
|---|---|---|
| **Privacy law (GDPR, UK GDPR, US state laws)** | The local-only design carries over: no account, no server, nothing collected. The privacy page already says so in plain terms. This holds only while Sentry has no DSN, the same condition `GO_LIVE.md` §6 sets for India | Before phase B: re-read the privacy page as a UK or US reader would |
| **EU trader status** | Both stores ask developers who distribute in the EU to declare whether they are a trader under the Digital Services Act. A developer who earns money generally is one, and a trader's address, phone and email are shown on the listing. This is the same public-address problem as `MONETISATION.md` F8, and stronger | Before phase C. A reason to release in the EU after the other English markets |
| **Tax forms** | Google and Apple ask non-US developers for a US tax form (W-8BEN for an individual) before paying out US sales. The stores collect and remit VAT, GST and US sales tax in most countries. Foreign earnings are still Indian income, and may count as exports for GST | Before the first paid product abroad. One conversation with a CA covers this and F8 together |
| **Health claims** | Keep Stub a tracker. In the US and EU, software that claims to treat nicotine addiction can be regulated as a medical device. Nothing in the app claims that now; the listing copy for new markets must not start | Each new listing |
| **Age** | The store rating is the age gate (`GO_LIVE.md` §3). The legal age to buy tobacco is 21 in the US. No change needed, but answer each store's regional rating questions honestly | Each new listing |
| **Per-country pricing** | Set each price by hand (§2.1). Do not accept the store's automatic conversion of ₹249, which gives about US$2.80 | When Pro is created |

## 4. Improvements, in build order

Phase A is the work that makes the app safe to release abroad. Each row
follows the repo's rule: its own branch, tests where the logic is pure,
and a check on a phone before merging.

| # | Change | Fixes | Size | Tests |
|---|---|---|---|---|
| A1 | Add `expo-localization`; add `currency` and `region` to the profile, set at onboarding, editable in Profile; migrate existing profiles to `INR` / `IN` | G1 | Small | Store migration test |
| A2 | `src/money.ts` formatter; replace every `₹` and `inr()` site; currency-neutral tab icon | G1 | Medium | Unit tests per currency, including negative amounts |
| A3 | Price as pack price and pack size, decimal per-cigarette value; new price input | G2 | Medium | Savings maths with fractional prices |
| A4 | Region-gate the brand dataset; onboarding step 2 and the Nicotine screen for users outside India | G3 | Medium | Brand tests stay India-only; new test for the generic path |
| A5 | Quit-line table by country; hide the rows where there is no verified entry | G4 | Small | Table test: every entry has a number, a name and a checked date |
| A6 | User-defined savings goal with a regional default; remove `GOA_FLIGHT` | G5 | Medium | Goal maths |
| A7 | Region overrides in `strings.ts`; move India-only lines into the `IN` table; move screen literals into the table | G6, G9 | Medium, mostly mechanical | Extend the existing swept tests to every region table |
| A8 | Shared date and hour formatters using the device locale | G7 | Small | Unit tests for `en-US`, `en-GB`, `en-IN` |
| A9 | Second jest run under `America/New_York` and `Europe/London`, with clock-change cases | G8 | Small | This is the test work |

The time-zone model (G8, part 2) is a separate project after A9 reports.

One rule to hold through all of it: **an Indian user must see no change.**
Every India-specific line, brand and number stays, behind the region. The
check for phase A is the app on two phones or simulators side by side, one
set to India and one to the UK or US.

## 5. Release plan

| Phase | What ships | Countries | Gate to enter |
|---|---|---|---|
| **A. Region-neutral** | §4, A1–A9. No new countries yet | India | Android production release done (`ANDROID_LAUNCH.md`); fix rounds device-checked |
| **B. English markets** | The same build, with local listings, screenshots and verified quit lines | United States, United Kingdom, Canada, Australia, New Zealand | Phase A checked on a device set to each region; a native-speaker read of the copy; quit lines verified |
| **C. Wider English use** | EU trader declaration; more quit-line entries | Ireland and the rest of the EU, UAE, Singapore, South Africa | Trader and address question settled (G12); phase B has been live a month without region bugs |
| **D. Languages** | First translation, with the roast voice rewritten by a native writer, not translated | Decided by where phase B and C installs came from | Pro sales exist abroad; one language shows clear demand |

Phase B is five countries on purpose. They share a language, the stores
handle their taxes, none needs the EU trader declaration, and together
they are most of the English-speaking paying market.

Pro and the tip jar follow the phases in `MONETISATION.md` §3.4 unchanged.
The only additions are the per-country prices in §2.1 and the tax form in
G12. Releasing abroad before Pro exists is fine and useful: it starts the
install count that every estimate here depends on.

## 6. Getting installs abroad

Price and conversion improve by releasing abroad. Installs do not arrive
by themselves, and they are the input everything in §2 multiplies.

- **Lead with the niche.** The large quit apps are built around a quit
  date. Stub is for someone who wants to cut down first. Say that in the
  first line of every listing.
- **Lead with privacy.** "No account, nothing leaves your phone" is rarer
  and more valued in the US and EU than in India, and it is true.
- **Diaspora first.** Hinglish, once built, is a reason for Indian
  communities abroad to pick Stub over a bigger app, and those
  communities are reachable without ad spend.
- **Communities, honestly.** Quit-smoking forums and subreddits are large
  and wary of promotion. Read each one's rules; a developer asking for
  feedback is usually welcome, a link drop is not.
- **Reviews in each country count separately.** The first few ratings in a
  new store matter more than the hundredth in India.

## 7. Open decisions for the owner

| Decision | Recommendation |
|---|---|
| Release abroad at all? | Yes. It is the largest lever on revenue that does not change the product (§2) |
| Region-neutral English first, translation later? | Yes (§1) |
| First countries | US, UK, Canada, Australia, New Zealand (§5) |
| Pro price abroad | US$6.99 and the local equivalents in §2.1, set by hand per country |
| Brand data outside India | None. Pack price and size from the user, generic nicotine estimate (G3) |
| Quit line where none is verified | Hide the row (G4) |
| Savings goal | User-defined, replacing the Goa constant, free (G5) |
| Does phase A wait for the Android production release? | Yes. It is not needed for the India launch and should not delay it |
| Time-zone model | Decide after the two-zone test run reports (G8) |
| EU and the public address | Settle together with `MONETISATION.md` F8 before phase C |

## 8. What is already right and should not be disturbed

- **Copy in one table.** `strings.ts` and its tests are what make regional
  variants a small job.
- **Local-only data.** No server, no account. This is why there is no
  privacy-law build work in this doc.
- **A US source for health claims.** The milestones cite the US Surgeon
  General's report, which is accepted in every market listed here.
- **Day keys follow the phone's local time**, with the 4am boundary. The
  idea is right everywhere; only the zone-change case in G8 is open.
- **The India experience.** Goa, chai and Gold Flake are why the voice
  works at home. Globalising means putting them behind a region, not
  removing them.

## Sources

- `MONETISATION.md` (F7, F8, §3, §4) for prices, fees and the India
  estimates this doc extends.
- `GO_LIVE.md` §3, §5, §6 and `ANDROID_LAUNCH.md` §5 for the store and
  privacy positions restated here.
- Code references are to `main` at `669983d`.
- Pack prices, quit-line numbers, and the tax and trader rules were not
  looked up for this doc. Verify each before relying on it.
