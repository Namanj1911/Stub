// Dataset integrity guards for src/brands.ts. These encode the schema rules
// stated in that file's header + design/BRANDS_DATA_PLAN.md, so a future edit
// can't quietly reintroduce a dangling citation, mislabel a yield as printed,
// or point a legacy id at nothing. Pure data — no RN, runs in jest directly.
//
// Loop checks collect offenders into an array and assert it's empty, so a
// failure names the exact brand/field rather than just "expected true".

import {
  BRANDS,
  BRAND_AVERAGES,
  ONBOARDING_BRANDS,
  SOURCES,
  DATASET_VERSION,
  findBrand,
  type FieldSource,
} from '../brands';

// The three provenance-bearing fields on every brand.
const fields = (b: (typeof BRANDS)[number]): [string, FieldSource][] => [
  ['packMrp', b.src.packMrp],
  ['nicotineMg', b.src.nicotineMg],
  ['tarMg', b.src.tarMg],
];

describe('brands dataset integrity', () => {
  test('dataset is non-empty and version is set', () => {
    expect(BRANDS.length).toBeGreaterThan(0);
    expect(DATASET_VERSION).toBeGreaterThanOrEqual(1);
  });

  test('brand ids are unique', () => {
    const ids = BRANDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every citation resolves in SOURCES (no dangling references)', () => {
    const dangling = BRANDS.flatMap((b) =>
      fields(b)
        .filter(([, fs]) => SOURCES[fs.source] === undefined)
        .map(([field, fs]) => `${b.id}.${field} → "${fs.source}"`),
    );
    expect(dangling).toEqual([]);
  });

  // The regulatory invariant (brands.ts header, COTPA §7(5)): Indian packs
  // print no tar/nicotine, so those figures can never be 'printed' — only a
  // measured study, a proxy SKU, or an estimate.
  test('nicotine and tar are never labelled "printed"', () => {
    const offenders = BRANDS.flatMap((b) =>
      [
        ['nicotineMg', b.src.nicotineMg],
        ['tarMg', b.src.tarMg],
      ]
        .filter(([, fs]) => (fs as FieldSource).confidence === 'printed')
        .map(([field]) => `${b.id}.${field as string}`),
    );
    expect(offenders).toEqual([]);
  });

  // MRP is tier-1: a real printed pack price, or a derived estimate when none
  // was observed. It is never a yield tier (study/proxy).
  test('MRP confidence is printed or estimate only', () => {
    const offenders = BRANDS.filter(
      (b) => !['printed', 'estimate'].includes(b.src.packMrp.confidence),
    ).map((b) => `${b.id} → ${b.src.packMrp.confidence}`);
    expect(offenders).toEqual([]);
  });

  test('all values are positive and asOf is YYYY-MM', () => {
    const bad = BRANDS.flatMap((b) =>
      fields(b)
        .filter(([, fs]) => !(fs.value > 0) || !/^\d{4}-\d{2}$/.test(fs.asOf))
        .map(([field, fs]) => `${b.id}.${field} (value ${fs.value}, asOf ${fs.asOf})`),
    );
    expect(bad).toEqual([]);
  });

  test('per-stick price is the rounded MRP over pack size', () => {
    const wrong = BRANDS.filter(
      (b) => b.price !== Math.round(b.src.packMrp.value / b.packSize) || b.price <= 0,
    ).map((b) => `${b.id} price=${b.price} mrp=${b.src.packMrp.value}/${b.packSize}`);
    expect(wrong).toEqual([]);
  });

  test('every SOURCES entry carries a title', () => {
    const untitled = Object.entries(SOURCES)
      .filter(([, s]) => !s.title)
      .map(([key]) => key);
    expect(untitled).toEqual([]);
  });

  test('onboarding set is the first five brands', () => {
    expect(ONBOARDING_BRANDS).toHaveLength(5);
    expect(ONBOARDING_BRANDS.map((b) => b.id)).toEqual(
      BRANDS.slice(0, 5).map((b) => b.id),
    );
  });

  // Legacy ids persist in existing profiles; a mapping to a non-existent brand
  // would silently drop a real user's cigarette on the v2 upgrade.
  test('legacy brand ids still resolve to a real brand', () => {
    const broken = ['goldflake', 'classic', 'marlboro', 'wills', 'foursquare'].filter(
      (legacy) => findBrand(legacy) === undefined,
    );
    expect(broken).toEqual([]);
  });

  test('brand averages are positive', () => {
    expect(BRAND_AVERAGES.price).toBeGreaterThan(0);
    expect(BRAND_AVERAGES.nicotineMg).toBeGreaterThan(0);
    expect(BRAND_AVERAGES.tarMg).toBeGreaterThan(0);
  });
});
