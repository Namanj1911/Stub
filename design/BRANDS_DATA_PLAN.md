# Brands dataset — sourcing & build plan

Plan for replacing the placeholder `src/brands.ts` with a vetted dataset of
brands, variants, pack MRP / pack size, and nicotine + tar content. Gates the
external-TestFlight step in `GO_LIVE.md` §7.1 / §8.7. **Discuss before build**
(BACKLOG rule).

## 1. The core constraint that shapes everything

The two kinds of data we need have **completely different reliability**, and
one legal fact drives the split:

- **Price (pack MRP + pack size) is authoritative.** MRP is printed on every
  Indian pack and is legally binding under the Legal Metrology Act. It is
  citable, verifiable, and — post the Feb 2026 excise hike — freshly public.
- **Nicotine / tar is NOT authoritative for Indian brands.** COTPA §7(5)
  requires nicotine + tar to be printed on packs, but the government **has
  never brought it into force** (litigated in Kerala HC; the Centre actively
  opposes it). So Indian packs carry **no** tar/nicotine numbers. There is no
  printed, per-variant source to cite. Every widely-circulated "Gold Flake =
  10mg tar" figure online traces back to uncited editorial content
  (indiabrand.org, worldblaze, etc.) — not usable as fact.

**Consequence:** we ship price as fact, and we ship nicotine/tar as clearly
flagged **estimates** for essentially every Indian brand. This is not a
research gap we can close — it is a structural feature of the Indian market.
The app already has the `estimated: true` → `~` prefix mechanism for exactly
this; the plan leans on it hard rather than pretending to precision we can't
source.

## 2. Sourcing strategy, per field

### 2a. Pack MRP + pack size — TIER 1 (citable)

Priority order of sources:

1. **Printed MRP on a physically-purchased pack** — gold standard, and the
   only thing GO_LIVE calls "the only citable source". For the owner's own
   brand and the top sellers, buy/photograph the pack. Date it (`asOf`).
2. **AICPDF (All India Consumer Products Distributors Federation) circulars**
   and the Feb 2026 post-excise price lists carried by mainstream business
   press (india.com, Angel One, Trade Brains). These reflect the manufacturer
   revisions after the Feb 1 2026 excise + 40% GST change. Good for brands we
   can't physically buy.
3. **ITC / Godfrey Phillips / VST investor & trade communications** for
   official pack-price revisions where available.

Known post-Feb-2026 anchors already found (verify before shipping):
- Gold Flake Kings, Wills Classic, Classic Milds (84mm): ~₹220–225 / pack of 10.
- Wills Navy Cut (76mm): ~₹120 / pack of 10.
- Classic Connect (97mm slim): ~₹350 / pack of 20.

Pack size matters as much as price — India sells 10s and 20s, and per-stick
price = MRP ÷ size. Record size explicitly per variant (some are sold in
both; pick the common retail unit and note it).

### 2b. Nicotine / tar — TIER 2 (best-effort estimate)

No source is authoritative for Indian variants. Ranked by how defensible:

1. **Peer-reviewed machine-smoked yield studies** (PubMed / PMC). These use
   ISO/FTC smoking-machine methods and are the most credible numbers that
   exist, but they rarely name the exact Indian variant and are often old.
   Candidates found:
   - Determination of tar, nicotine, CO in mainstream smoke of selected
     *international* cigarettes (PMC1747810) — good for Marlboro-class brands.
   - Estimation of nicotine content in popular Indian smoking/chewing tobacco
     (PubMed 18445921) — Indian, but content-per-gram, not per-stick yield.
   - Bidi yield studies (PubMed 14577991) — out of scope (not cigarettes).
2. **International yields for the same global brand** (e.g. Marlboro yields
   published by regulators in AU/EU/US) as a proxy where the brand is global.
   Flag that it's a non-Indian SKU.
3. **Dataset average** (already implemented) for anything unmatched.

**Decided (owner-authorized 2026-07-17):** per-field provenance + a one-line
disclaimer on the Nicotine screen. Because tier-1 tar/nicotine doesn't exist
for Indian brands, `confidence` on those two fields will be `study`/`proxy`/
`estimate` — never `printed` — and anything not `study`/`proxy`-backed renders
with the `~` prefix. This keeps the money math (price-driven, solid) separate
from the health numbers (soft) in the user's mind.

## 3. Schema changes to `src/brands.ts`

Extend the `Brand` type to carry **provenance**, so every number is auditable
and the UI can flag softness precisely:

```ts
type FieldSource = {
  value: number;
  asOf: string;        // 'YYYY-MM' the figure was valid/observed
  source: string;      // short citation key, resolved in SOURCES below
  confidence: 'printed' | 'study' | 'proxy' | 'estimate';
};

type Brand = {
  id: string;
  name: string;              // brand family, e.g. 'Classic', 'Marlboro'
  variant: string;           // the actual product name, e.g. 'Ice Burst',
                             //   'Double Switch', 'Kings Lights' (§4)
  maker: 'ITC' | 'Godfrey Phillips' | 'VST';
  lengthMm?: 64 | 69 | 74 | 84 | 97; // regular/kingsize/slim — affects yield
  capsule?: boolean;         // crush-ball "switch"/"burst" flavour variant
  packSize: number;
  packMrp: FieldSource;       // confidence: 'printed'
  nicotineMg: FieldSource;    // confidence: 'study' | 'proxy' | 'estimate'
  tarMg: FieldSource;         // ditto — never 'printed' (no §7(5) on packs)
  // derived, kept for the existing money code:
  price: number;              // = round(packMrp.value / packSize)
};
```

The existing UI already shows brand + variant on each row, so mapping the
product name into `variant` needs no screen changes — "Classic · Ice Burst"
and "Marlboro · Double Switch" render like today's "Classic · Milds".

- Keep `price`, `nicotineMg`, `tarMg` accessible as plain numbers via small
  getters so existing screens/`stats.ts` don't churn — provenance is additive.
- Bump `DATASET_VERSION` (currently 1) and set a real `DATASET_AS_OF`
  ('Jul 2026', not 'placeholder'). The store already appends a dated price
  record on first launch after a version bump — this is the trigger.
- Add a top-of-file `SOURCES` map from citation key → URL + title, so the doc
  and the code share one source list.

## 4. Brand coverage

Each row is a **specific product**, not just a brand — `name` = family,
`variant` = the actual product name on the pack (verified real names below;
capsule = the crush-ball "switch/burst" flavour type).

**FROZEN 2026-07-18 (owner call): trimmed from ~28 to 15 core rows** — top
sellers + the capsule variants, long tail deferred to a future dataset rev.
Owner also confirmed no physical packs are available, so the price pass runs
entirely off AICPDF / Feb-2026 press lists (no `printed`-tier upgrades).

### ITC (market leader) — 9 rows

| id | name | variant | mm | capsule |
|----|------|---------|----|---------|
| gf-kings | Gold Flake | Kings | 84 | |
| gf-kings-lights | Gold Flake | Kings Lights | 84 | |
| gf-premium | Gold Flake | Premium Filter | 69 | |
| gf-indie-mint | Gold Flake | Indie Mint | 69 | ✓ |
| classic-regular | Classic | Regular | 84 | |
| classic-milds | Classic | Milds | 84 | |
| classic-connect | Classic | Connect | 97 | |
| classic-iceburst | Classic | Ice Burst | 84 | ✓ |
| navycut | Wills | Navy Cut | 76 | |

### Godfrey Phillips (incl. Marlboro under licence) — 4 rows

| id | name | variant | mm | capsule |
|----|------|---------|----|---------|
| foursquare-kings | Four Square | Kings | 84 | |
| redwhite | Red & White | Regular | 69 | |
| marlboro-advance | Marlboro | Advance | 84 | |
| marlboro-double-switch | Marlboro | Double Switch | 84 | ✓ |

### VST Industries — 2 rows

| id | name | variant | mm | capsule |
|----|------|---------|----|---------|
| charminar | Charminar | Special Filter | 69 | |
| total | Total | Regular | 69 | |

Deferred (future rev): Gold Flake Super Star, Classic Ultra Milds, Wills Navy
Cut Deluxe, Wills Flake, Bristol, Capstan, Scissors, Insignia, Four Square
Regular, Cavanders Slim, Marlboro Red, Marlboro Clove Mix, Marlboro Advance
Compact, Charms Virginia Filter.

Capsule variants are called out because their flavour-crush design can shift
the yield story and they're the fast-growing segment worth featuring.

## 5. Build process (once the plan is approved)

1. **Freeze the brand/variant list** (§4) — one row per SKU we'll ship.
2. **Price pass (tier 1):** fill `packMrp` + `packSize` from physical packs
   where possible, else AICPDF / Feb-2026 press lists. Each gets `asOf` +
   `source` + `confidence: 'printed'`. Physically verify the owner's brand
   and the top 5.
3. **Nicotine/tar pass (tier 2):** pull the study numbers, map to variants,
   set `confidence` honestly (`study`/`proxy`/`estimate`). Anything unmatched
   → dataset average + `estimate`. Record which study in `source`.
4. **Encode** into the new `src/brands.ts` schema; wire the getters so no
   downstream file breaks; run typecheck + tests.
5. **UI pass:** ensure the `~` estimated treatment renders for every
   non-`printed` nicotine/tar value; add the one-line "indicative, not a
   safety measure" disclaimer to the Nicotine screen; confirm the "MRP as
   of <date>" fine print on Money picks up the new `asOf`.
6. **QA:** sanity table — per-stick price sane vs pack MRP, nicotine 0.3–1.6mg
   / tar 6–24mg plausibility bounds, no missing provenance, spot-check 3 rows
   against their cited source.
7. **Device test** in Expo Go (onboarding brand pick, Nicotine DB search +
   switch roast, Money "MRP as of"), then branch → merge per the git rule.

## 6. Legal / display guardrails

- Never present tar/nicotine as a safety ranking (the Centre's own stated fear
  about §7(5)). The Nicotine screen's roast tone already avoids "lower = safer"
  — keep it; add an explicit "these numbers are indicative, not a health
  claim" line.
- Money math stays MRP-based and labelled approximate (already designed).
- Keep everything client-bundled (no remote DB) — matches GO_LIVE's deferred
  list and the Expo Go / no-server posture.

## 7. Maintenance

- MRPs move with the budget/excise cycle (Feb 2026 was a big jump; expect
  annual). A dataset refresh = new values + `asOf` + `DATASET_VERSION` bump;
  the store's first-launch price-record append handles user history honestly.
- Provenance keys make a future re-vet cheap — every number says where it came
  from and when.

## 8. What I need from you to start execution

1. **Brand/variant list** — approve §4 or strike/add rows.
2. **Estimate posture** — DECIDED: per-field provenance + one disclaimer
   (owner-authorized 2026-07-17).
3. **Pack details (typed, no photo needed).** For any pack in hand — ideally
   your own brand and a couple of top sellers — read me these off it and I'll
   mark that row `printed` instead of `proxy`. From one face + the side of the
   pack:
   - **Exact brand + product name** as printed (e.g. "Gold Flake Kings",
     "Classic Ice Burst") — so I map it to the right §4 row.
   - **MRP** — the "Maximum Retail Price (incl. of all taxes) ₹…" line.
   - **Number of sticks** in the pack (10 or 20).
   - **Length** if printed (e.g. "84 mm") — optional, helps the yield estimate.
   - **"Mfd. …" month/year** if visible — sets the `asOf` date precisely.
   - Whether it's a **capsule/"switch"/"burst"** pack (there'll be a crush /
     click callout on the pack).
   Note: Indian packs do **not** print tar/nicotine (§1), so there's nothing
   to read for those — don't go looking.

## Sources (starting set — to be verified during the price/yield passes)

- COTPA §7(5) status: [Tobacco Control Laws — India packaging/labeling](https://www.tobaccocontrollaws.org/legislation/india/packaging-labeling/other-packaging-and-labeling-requirements) · [Centre opposes mandatory disclosure (Bar & Bench)](https://www.barandbench.com/news/disclosure-of-nicotine-tar-levels-on-cigarette-packs-may-be-counter-productive-centre-to-kerala-hc)
- Feb 2026 price revisions: [india.com budget-2026 pack prices](https://www.india.com/news/india/union-budget-2026-nirmala-sitharam-finance-minister-narendra-modi-wills-navy-cut-wills-classic-milds-classic-connect-aicpdf-gold-flake-kings-8290378/) · [Angel One — cigarette prices rise](https://www.angelone.in/news/taxation/cigarette-prices-rise-up-to-55-per-pack-after-new-excise-duty)
- Machine-smoked yields: [Selected international cigarettes tar/nicotine/CO (PMC1747810)](https://pmc.ncbi.nlm.nih.gov/articles/PMC1747810/) · [Nicotine in Indian smoking/chewing tobacco (PubMed 18445921)](https://pubmed.ncbi.nlm.nih.gov/18445921/)
- Not-a-source (uncited editorial, do not cite): indiabrand.org, worldblaze.in
