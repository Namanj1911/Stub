// Brand dataset (2a onboarding + 2d nicotine database).
// Schema per design/BRANDS_DATA_PLAN.md: every sourced number carries
// provenance (value + asOf + source + confidence) so it is auditable and the
// UI can flag softness precisely. Price is tier-1 (MRP is printed on Indian
// packs and legally binding); nicotine/tar is tier-2 (COTPA §7(5) was never
// brought into force, so Indian packs print no tar/nicotine — those fields
// are study/proxy/estimate, never 'printed').

export type Confidence =
  | 'printed' // an official/reported MRP from a cited source (MRP only —
  //             never tar/nicotine; Indian packs don't print those)
  | 'study' // peer-reviewed machine-smoked yield for this exact variant
  | 'proxy' // regulator-published yield for the same global brand, non-Indian SKU
  | 'estimate'; // derived figure or editorial judgement — renders with ~

export type FieldSource = {
  value: number;
  asOf: string; // 'YYYY-MM' the figure was valid/observed
  source: string; // citation key, resolved in SOURCES
  confidence: Confidence;
};

// Citation key → where the number came from. Shared source list with the
// plan doc; every FieldSource.source must resolve here.
export const SOURCES: Record<string, { title: string; url?: string }> = {
  'itc-feb2026': {
    title:
      'ITC official price revision after Feb 1 2026 excise + 40% GST (Gold Flake 10s ₹170→₹240, Classic 20s ₹340→₹480)',
    url: 'https://www.goodreturns.in/news/cigarette-price-hike-alert-itc-raises-gold-flake-classic-rates-up-to-41-after-tax-increase-1490281.html',
  },
  'press-feb2026': {
    title:
      'Feb 2026 post-excise distributor price lists (Navy Cut 76mm ₹120/10, Classic Connect 97mm ₹350/20)',
    url: 'https://www.businesstoday.in/personal-finance/news/story/cigarette-price-shock-from-feb-1-navy-cut-now-at-rs-120-gold-flake-and-classic-at-rs-220-225-514281-2026-02-02',
  },
  'qcom-2026': {
    title:
      'Quick-commerce MRP listings, Jun 2026 (Zepto/Blinkit sell at printed MRP)',
    url: 'https://www.zepto.com/pn/marlboro-gold-advance-cigarettes/pvid/a6016a0d-f3de-46d2-a1e8-88a64079db56',
  },
  'derived-duty-2026': {
    title:
      'Derived: pre-hike street MRP + Feb 2026 length-based excise structure — not an observed pack price',
    url: 'https://www.angelone.in/news/taxation/cigarette-prices-rise-up-to-55-per-pack-after-new-excise-duty',
  },
  'hk-govtlab-2025': {
    title:
      'Hong Kong Government Laboratory tar & nicotine report 2025 (ISO machine-smoked, non-Indian SKUs)',
    url: 'https://www.govtlab.gov.hk/en/our_work/publications/tar_and_nicotine_report.html',
  },
  'editorial-estimate': {
    title:
      'Editorial judgement from format (length/filter/lights/capsule) calibrated to typical ISO yield ranges — no measurement exists for Indian variants',
  },
};

export type Maker = 'ITC' | 'Godfrey Phillips' | 'VST';

// Authoring shape: provenance-bearing fields.
type BrandRow = {
  id: string;
  name: string; // brand family, e.g. 'Classic', 'Marlboro'
  variant: string; // product name on the pack, e.g. 'Ice Burst'
  maker: Maker;
  lengthMm?: 64 | 69 | 74 | 76 | 84 | 97; // regular/kingsize/slim — affects yield
  capsule?: boolean; // crush-ball "switch"/"burst" flavour variant
  packSize: number; // sticks per pack (10 or 20 — the common retail unit)
  packMrp: FieldSource;
  nicotineMg: FieldSource; // per stick
  tarMg: FieldSource; // per stick
};

// Public shape: plain numbers for the screens/stats code, provenance under
// `src` for the UI softness treatment and audits.
export type Brand = Omit<BrandRow, 'packMrp' | 'nicotineMg' | 'tarMg'> & {
  price: number; // ₹ per stick = round(packMrp / packSize)
  nicotineMg: number;
  tarMg: number;
  src: { packMrp: FieldSource; nicotineMg: FieldSource; tarMg: FieldSource };
};

const toBrand = ({ packMrp, nicotineMg, tarMg, ...rest }: BrandRow): Brand => ({
  ...rest,
  price: Math.round(packMrp.value / rest.packSize),
  nicotineMg: nicotineMg.value,
  tarMg: tarMg.value,
  src: { packMrp, nicotineMg, tarMg },
});

// Bump when shipped MRPs are revised; the store appends a dated price record
// for the user's brand on first launch after an update (BACKLOG P1 design).
export const DATASET_VERSION = 2;
export const DATASET_AS_OF = 'Jul 2026';

// FieldSource shorthands per source tier.
const mrp = (value: number, source: string, asOf: string): FieldSource => ({
  value, asOf, source, confidence: 'printed',
});
const mrpEst = (value: number, asOf = '2026-02'): FieldSource => ({
  value, asOf, source: 'derived-duty-2026', confidence: 'estimate',
});
const hkProxy = (value: number): FieldSource => ({
  value, asOf: '2025-12', source: 'hk-govtlab-2025', confidence: 'proxy',
});
const est = (value: number): FieldSource => ({
  value, asOf: '2026-07', source: 'editorial-estimate', confidence: 'estimate',
});

// 15 core rows frozen 2026-07-18 (plan §4). First five = onboarding set.
const ROWS: BrandRow[] = [
  { id: 'gf-kings', name: 'Gold Flake', variant: 'Kings', maker: 'ITC', lengthMm: 84, packSize: 10,
    packMrp: mrp(240, 'itc-feb2026', '2026-02'), nicotineMg: est(1.1), tarMg: est(15) },
  { id: 'classic-milds', name: 'Classic', variant: 'Milds', maker: 'ITC', lengthMm: 84, packSize: 20,
    packMrp: mrp(480, 'itc-feb2026', '2026-02'), nicotineMg: est(0.8), tarMg: est(11) },
  { id: 'marlboro-advance', name: 'Marlboro', variant: 'Advance', maker: 'Godfrey Phillips', lengthMm: 84, packSize: 20,
    packMrp: mrp(480, 'qcom-2026', '2026-06'), nicotineMg: hkProxy(0.6), tarMg: hkProxy(7) },
  { id: 'navycut', name: 'Wills', variant: 'Navy Cut', maker: 'ITC', lengthMm: 76, packSize: 10,
    packMrp: mrp(120, 'press-feb2026', '2026-02'), nicotineMg: est(1.0), tarMg: est(14) },
  { id: 'foursquare-kings', name: 'Four Square', variant: 'Kings', maker: 'Godfrey Phillips', lengthMm: 84, packSize: 10,
    packMrp: mrpEst(120, '2026-06'), nicotineMg: est(0.9), tarMg: est(13) },
  { id: 'gf-kings-lights', name: 'Gold Flake', variant: 'Kings Lights', maker: 'ITC', lengthMm: 84, packSize: 10,
    packMrp: mrpEst(240), nicotineMg: est(0.8), tarMg: est(11) },
  { id: 'gf-premium', name: 'Gold Flake', variant: 'Premium Filter', maker: 'ITC', lengthMm: 69, packSize: 10,
    packMrp: mrp(115, 'qcom-2026', '2026-06'), nicotineMg: est(1.0), tarMg: est(15) },
  { id: 'gf-indie-mint', name: 'Gold Flake', variant: 'Indie Mint', maker: 'ITC', lengthMm: 69, capsule: true, packSize: 10,
    packMrp: mrpEst(120), nicotineMg: est(0.8), tarMg: est(12) },
  { id: 'classic-regular', name: 'Classic', variant: 'Regular', maker: 'ITC', lengthMm: 84, packSize: 20,
    packMrp: mrp(480, 'itc-feb2026', '2026-02'), nicotineMg: est(1.0), tarMg: est(14) },
  { id: 'classic-connect', name: 'Classic', variant: 'Connect', maker: 'ITC', lengthMm: 97, packSize: 20,
    packMrp: mrp(350, 'press-feb2026', '2026-02'), nicotineMg: est(0.7), tarMg: est(9) },
  { id: 'classic-iceburst', name: 'Classic', variant: 'Ice Burst', maker: 'ITC', lengthMm: 84, capsule: true, packSize: 20,
    packMrp: mrpEst(480), nicotineMg: est(0.8), tarMg: est(11) },
  { id: 'redwhite', name: 'Red & White', variant: 'Regular', maker: 'Godfrey Phillips', lengthMm: 69, packSize: 10,
    packMrp: mrpEst(115), nicotineMg: est(1.0), tarMg: est(15) },
  { id: 'marlboro-double-switch', name: 'Marlboro', variant: 'Double Switch', maker: 'Godfrey Phillips', lengthMm: 84, capsule: true, packSize: 20,
    packMrp: mrpEst(480, '2026-06'), nicotineMg: hkProxy(0.5), tarMg: hkProxy(6) },
  { id: 'charminar', name: 'Charminar', variant: 'Special Filter', maker: 'VST', lengthMm: 69, packSize: 10,
    packMrp: mrpEst(100), nicotineMg: est(1.1), tarMg: est(16) },
  { id: 'total', name: 'Total', variant: 'Regular', maker: 'VST', lengthMm: 69, packSize: 10,
    packMrp: mrpEst(90), nicotineMg: est(1.1), tarMg: est(16) },
];

export const BRANDS: Brand[] = ROWS.map(toBrand);

// Pre-v2 datasets shipped different ids; profiles persist them. Resolve old →
// new here so an existing profile keeps its brand across the dataset upgrade.
const LEGACY_BRAND_IDS: Record<string, string> = {
  goldflake: 'gf-kings',
  classic: 'classic-milds',
  marlboro: 'marlboro-advance',
  wills: 'navycut',
  foursquare: 'foursquare-kings',
};

export function findBrand(brandId?: string): Brand | undefined {
  if (!brandId) return undefined;
  const id = LEGACY_BRAND_IDS[brandId] ?? brandId;
  return BRANDS.find((b) => b.id === id);
}

// the five shown in onboarding step 2 (2a mockup)
export const ONBOARDING_BRANDS = BRANDS.slice(0, 5);

// Dataset averages — stand in for brands we don't have (custom entries and
// the onboarding "something else" pick). Always presented as estimates (~).
const avg = (f: (b: Brand) => number) =>
  BRANDS.reduce((a, b) => a + f(b), 0) / BRANDS.length;

export const BRAND_AVERAGES = {
  price: Math.round(avg((b) => b.price)),
  nicotineMg: Math.round(avg((b) => b.nicotineMg) * 10) / 10,
  tarMg: Math.round(avg((b) => b.tarMg)),
};

// What we know about "the user's cigarette", wherever it came from.
export type BrandInfo = {
  label: string;
  nicotineMg: number;
  tarMg: number;
  estimated: boolean; // true → dataset averages, render with a ~ prefix
  // Per-field confidence for the plan's softness rule: anything not
  // study/proxy-backed renders with ~.
  nicotineConfidence: Confidence;
  tarConfidence: Confidence;
};

export function brandInfo(brandId?: string, customName?: string): BrandInfo | null {
  const b = findBrand(brandId);
  if (b) {
    return {
      label: `${b.name} ${b.variant}`,
      nicotineMg: b.nicotineMg,
      tarMg: b.tarMg,
      estimated: false,
      nicotineConfidence: b.src.nicotineMg.confidence,
      tarConfidence: b.src.tarMg.confidence,
    };
  }
  if (customName) {
    return {
      label: customName,
      nicotineMg: BRAND_AVERAGES.nicotineMg,
      tarMg: BRAND_AVERAGES.tarMg,
      estimated: true,
      nicotineConfidence: 'estimate',
      tarConfidence: 'estimate',
    };
  }
  return null;
}

// True when a non-price number should carry the ~ softness prefix (plan §2b):
// only study/proxy-backed figures render as-is.
export const isSoft = (c: Confidence) => c !== 'study' && c !== 'proxy';
