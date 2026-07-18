// Brand dataset (2a onboarding + 2d nicotine database).
// Schema per design/BRANDS_DATA_PLAN.md: every sourced number carries
// provenance (value + asOf + source + confidence) so it is auditable and the
// UI can flag softness precisely. Price is tier-1 (MRP is printed on Indian
// packs and legally binding); nicotine/tar is tier-2 (COTPA §7(5) was never
// brought into force, so Indian packs print no tar/nicotine — those fields
// are study/proxy/estimate, never 'printed').
//
// Data below is still the prototype placeholder set — replaced row-by-row in
// the price and nicotine/tar passes (plan §5.2–5.3). DATASET_VERSION stays
// at 1 until real data lands so the store's price-record append doesn't fire
// on placeholder values.

export type Confidence =
  | 'printed' // read off a physical pack (MRP only — never tar/nicotine)
  | 'study' // peer-reviewed machine-smoked yield for this variant
  | 'proxy' // published yield for the same global brand, non-Indian SKU
  | 'estimate'; // dataset average or editorial judgement

export type FieldSource = {
  value: number;
  asOf: string; // 'YYYY-MM' the figure was valid/observed
  source: string; // citation key, resolved in SOURCES
  confidence: Confidence;
};

// Citation key → where the number came from. Shared source list with the
// plan doc; every FieldSource.source must resolve here.
export const SOURCES: Record<string, { title: string; url?: string }> = {
  placeholder: { title: 'Prototype placeholder — not vetted' },
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
export const DATASET_VERSION = 1;
export const DATASET_AS_OF = 'Jul 2026 · placeholder, vetting pending';

const ph = (value: number): FieldSource => ({
  value,
  asOf: '2026-07',
  source: 'placeholder',
  confidence: 'estimate',
});

const ROWS: BrandRow[] = [
  { id: 'goldflake', name: 'Gold Flake', variant: 'Kings', maker: 'ITC', lengthMm: 84, packSize: 20, packMrp: ph(360), nicotineMg: ph(1.1), tarMg: ph(15) },
  { id: 'classic', name: 'Classic', variant: 'Milds', maker: 'ITC', lengthMm: 84, packSize: 20, packMrp: ph(360), nicotineMg: ph(0.9), tarMg: ph(12) },
  { id: 'marlboro', name: 'Marlboro', variant: 'Advance', maker: 'Godfrey Phillips', lengthMm: 84, packSize: 20, packMrp: ph(320), nicotineMg: ph(0.8), tarMg: ph(10) },
  { id: 'wills', name: 'Wills', variant: 'Navy Cut', maker: 'ITC', lengthMm: 76, packSize: 20, packMrp: ph(340), nicotineMg: ph(1.0), tarMg: ph(14) },
  { id: 'foursquare', name: 'Four Square', variant: 'Regular', maker: 'Godfrey Phillips', lengthMm: 69, packSize: 10, packMrp: ph(130), nicotineMg: ph(1.2), tarMg: ph(17) },
  { id: 'charminar', name: 'Charminar', variant: 'Regular (non-filter)', maker: 'VST', lengthMm: 69, packSize: 10, packMrp: ph(80), nicotineMg: ph(1.6), tarMg: ph(22) },
];

export const BRANDS: Brand[] = ROWS.map(toBrand);

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
  // study/proxy-backed renders with ~ (UI pass, plan §5.5).
  nicotineConfidence: Confidence;
  tarConfidence: Confidence;
};

export function brandInfo(brandId?: string, customName?: string): BrandInfo | null {
  const b = BRANDS.find((x) => x.id === brandId);
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
