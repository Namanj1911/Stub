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

  // Deliberate exceptions to Nocturne (which has no alert colors). Two are
  // sanctioned; add no others:
  // 1. The craving SOS button must read as an emergency control.
  sos: '#e04a3f',
  sosText: '#1c0f0d',
  // 2. Destructive data actions (profile reset) wear a quiet blood-red so
  //    they register as "not a casual tap" without shouting for attention.
  //    Danger affordances only — never for emphasis or decoration.
  danger: '#b03a30',
  dangerBorder: 'rgba(176, 58, 48, 0.55)',
  dangerText: '#cf7a71',
  dangerTint8: 'rgba(176, 58, 48, 0.08)',
  // 3. Health milestones (owner call, 2026-07-19). Accent purple is the app's
  //    ambient color — it says "this is Stub", not "you won something", and a
  //    milestone rendered in it read as just another card. Gold is the one
  //    color the interface never otherwise uses, so it can only mean "earned".
  //    Milestone marks and their cards only — never for general emphasis, and
  //    never on a control (an award is not a button).
  //
  //    Contrast on bg #161826: gold 9.6:1, goldDim 5.0:1; on surface #232532:
  //    gold 8.2:1, goldDim 5.3:1. All pass AA for body text.
  gold: '#e8b64c', // live / just-earned marks and badges
  goldDim: '#bb924a', // banked, not currently active
  goldBright: '#f7dc9a', // hero text on a gold ground
  goldBorder: 'rgba(232, 182, 76, 0.55)',
  goldBorderDim: 'rgba(232, 182, 76, 0.24)',
  goldTint8: 'rgba(232, 182, 76, 0.08)',
  goldTint14: 'rgba(232, 182, 76, 0.14)',
  // deep warm ground + glow stop for the celebration card, the gold analogue
  // of section/sectionGlow
  goldGround: '#2b2110',
  goldGlow: '#5f4718',
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
// `bold` exists solely for the SOS button (the documented theme exception).
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
} as const;
