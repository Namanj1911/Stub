// Brand dataset from the prototype (2a onboarding + 2d nicotine database).
// Placeholder values — production needs a vetted dataset (see handoff README
// and BACKLOG "Later"). Per-stick price is pack MRP ÷ pack size: money math
// is deliberately approximate (MRP, not street price) so the user never has
// to type a number.

export type Brand = {
  id: string;
  name: string;
  variant: string;
  packMrp: number; // ₹, printed MRP of the pack
  packSize: number; // sticks per pack
  price: number; // ₹ per stick = packMrp / packSize (pre-divided, rounded)
  nicotineMg: number;
  tarMg: number;
};

// Bump when shipped MRPs are revised; the store appends a dated price record
// for the user's brand on first launch after an update (BACKLOG P1 design).
export const DATASET_VERSION = 1;
export const DATASET_AS_OF = 'Jul 2026 · placeholder, vetting pending';

export const BRANDS: Brand[] = [
  { id: 'goldflake', name: 'Gold Flake', variant: 'Kings', packMrp: 360, packSize: 20, price: 18, nicotineMg: 1.1, tarMg: 15 },
  { id: 'classic', name: 'Classic', variant: 'Milds', packMrp: 360, packSize: 20, price: 18, nicotineMg: 0.9, tarMg: 12 },
  { id: 'marlboro', name: 'Marlboro', variant: 'Advance', packMrp: 320, packSize: 20, price: 16, nicotineMg: 0.8, tarMg: 10 },
  { id: 'wills', name: 'Wills', variant: 'Navy Cut', packMrp: 340, packSize: 20, price: 17, nicotineMg: 1.0, tarMg: 14 },
  { id: 'foursquare', name: 'Four Square', variant: 'Regular', packMrp: 130, packSize: 10, price: 13, nicotineMg: 1.2, tarMg: 17 },
  { id: 'charminar', name: 'Charminar', variant: 'Regular (non-filter)', packMrp: 80, packSize: 10, price: 8, nicotineMg: 1.6, tarMg: 22 },
];

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
};

export function brandInfo(brandId?: string, customName?: string): BrandInfo | null {
  const b = BRANDS.find((x) => x.id === brandId);
  if (b) {
    return { label: `${b.name} ${b.variant}`, nicotineMg: b.nicotineMg, tarMg: b.tarMg, estimated: false };
  }
  if (customName) {
    return {
      label: customName,
      nicotineMg: BRAND_AVERAGES.nicotineMg,
      tarMg: BRAND_AVERAGES.tarMg,
      estimated: true,
    };
  }
  return null;
}
