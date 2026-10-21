import { T } from './tokens'

// The app's buttons. `primary` is the one gold action on a screen; `secondary`
// is the outlined alternative; `ghost` is a text link with a real hit area;
// `danger` is for delete flows only.
const VARIANTS = {
  primary:   { background: T.accent, color: T.ground, border: 'none' },
  secondary: { background: 'transparent', color: T.ink, border: `1px solid ${T.hairlineStrong}` },
  ghost:     { background: 'transparent', color: T.muted, border: 'none' },
  danger:    { background: T.danger, color: T.ground, border: 'none' },
}

const SIZES = {
  lg: { height: 54, padding: '0 22px', fontSize: 15, borderRadius: T.radius },
  md: { height: 44, padding: '0 18px', fontSize: 14, borderRadius: 12 },
  sm: { height: 36, padding: '0 14px', fontSize: 13, borderRadius: T.radiusSm },
}

export default function Button({
  variant = 'primary', size = 'md', full = false, icon = null, iconRight = null,
  disabled = false, busy = false, style, children, type = 'button', ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  return (
    <button
      type={type}
      className={variant === 'primary' ? 'hb-cta hb-press' : 'hb-press'}
      disabled={disabled || busy}
      style={{
        display: full ? 'flex' : 'inline-flex', width: full ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: 9,
        fontFamily: T.font, fontWeight: 600, whiteSpace: 'nowrap',
        cursor: disabled || busy ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...v, ...s, ...style,
      }}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  )
}
