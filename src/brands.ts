// Brand dataset from the prototype (2a onboarding + 2d nicotine database).
// Placeholder values — production needs a vetted dataset (see handoff README).

export type Brand = {
  id: string;
  name: string;
  variant: string;
  price: number; // ₹ per stick
  nicotineMg: number;
  tarMg: number;
};

export const BRANDS: Brand[] = [
  { id: 'goldflake', name: 'Gold Flake', variant: 'Kings', price: 18, nicotineMg: 1.1, tarMg: 15 },
  { id: 'classic', name: 'Classic', variant: 'Milds', price: 18, nicotineMg: 0.9, tarMg: 12 },
  { id: 'marlboro', name: 'Marlboro', variant: 'Advance', price: 16, nicotineMg: 0.8, tarMg: 10 },
  { id: 'wills', name: 'Wills', variant: 'Navy Cut', price: 17, nicotineMg: 1.0, tarMg: 14 },
  { id: 'foursquare', name: 'Four Square', variant: 'Regular', price: 13, nicotineMg: 1.2, tarMg: 17 },
  { id: 'charminar', name: 'Charminar', variant: 'Regular (non-filter)', price: 8, nicotineMg: 1.6, tarMg: 22 },
];

// the five shown in onboarding step 2 (2a mockup)
export const ONBOARDING_BRANDS = BRANDS.slice(0, 5);
