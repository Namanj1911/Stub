// Nocturne design tokens — ported from design_handoff_stub_app/styles.css.
// That file is the source of truth; keep values in sync with its :root block.

export const color = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  accent2: '#a7a1db',
  divider: 'rgba(233, 233, 237, 0.16)',

  neutral100: '#f3f5fe',
  neutral200: '#e4e7f5',
  neutral300: '#cfd3e5',
  neutral400: '#b2b6ca',
  neutral500: '#9397ab',
  neutral600: '#75798c',
  neutral700: '#595d6c',
  neutral800: '#3f424d',
  neutral900: '#292b31',

  accent100: '#f5f4ff',
  accent200: '#e7e5fe',
  accent300: '#d2cefd',
  accent400: '#b5abfc',
  accent500: '#968ae0',
  accent600: '#796cbf',
  accent700: '#5d5294',
  accent800: '#423a6a',
  accent900: '#2b2741',

  // deck-scale grounds for hero/plan cards only
  section: '#262a60',
  sectionGlow: '#353b80',

  // color-mix(in srgb, accent 10%, transparent) equivalent
  accentTint10: 'rgba(145, 132, 217, 0.10)',
  accentTint12: 'rgba(145, 132, 217, 0.12)',

  // Deliberate exception to Nocturne (which has no alert colors): the craving
  // SOS button must read as an emergency control, so it breaks theme on
  // purpose. Use nowhere else.
  sos: '#e04a3f',
  sosText: '#1c0f0d',
} as const;

export const space = {
  s1: 2.8,
  s2: 5.6,
  s3: 8.4,
  s4: 11.2,
  s6: 16.8,
  s8: 22.4,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  pill: 999,
} as const;

// Inter everywhere; headings max weight 500 — hierarchy via size/space, not bold.
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
} as const;
