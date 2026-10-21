// Harbor dark — the one place the app's colors, type and radii are defined.
// Screens import T instead of re-declaring hex literals.
export const T = {
  ground: '#0a1628',
  card: '#0f2040',
  raised: '#1a3558',
  ink: '#F5F4EF',
  body: '#C2CBD8',
  muted: '#8C9AAD',
  faint: '#5C6B73',
  accent: '#D3A95C',
  accentPressed: '#C29245',
  accentSoft: 'rgba(211,169,92,0.12)',
  accentLine: 'rgba(211,169,92,0.4)',
  danger: '#E8867A',
  success: '#8FC7A2',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.2)',
  radius: 14,
  radiusSm: 10,
  font: "'Inter', system-ui, sans-serif",
  serif: "'Lora', Georgia, serif",
  // Phone-first: every screen is at most this wide, centered on larger displays.
  pageWidth: 520,
  gutter: 24,
}

// Type scale. Sizes are the only ones the app uses.
export const type = {
  display: { fontFamily: T.serif, fontWeight: 500, fontSize: 30, lineHeight: 1.1, color: T.ink },
  headline: { fontFamily: T.serif, fontWeight: 500, fontSize: 25, lineHeight: 1.2, color: T.ink },
  title: { fontFamily: T.font, fontWeight: 600, fontSize: 15, lineHeight: 1.35, color: T.ink },
  body: { fontFamily: T.font, fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: T.body },
  small: { fontFamily: T.font, fontWeight: 400, fontSize: 12, lineHeight: 1.5, color: T.muted },
  eyebrow: { fontFamily: T.font, fontWeight: 600, fontSize: 11, lineHeight: 1.4, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted },
}
