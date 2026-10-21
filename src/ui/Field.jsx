import { T } from './tokens'

const base = {
  width: '100%', boxSizing: 'border-box', fontFamily: T.font, fontSize: 16, color: T.ink,
  background: T.card, border: `1px solid ${T.hairlineStrong}`, borderRadius: 13, outline: 'none',
  padding: '13px 14px', lineHeight: 1.4, transition: 'border-color 0.15s ease',
}

// One text input/textarea style for the whole app (16px so iOS never zooms).
export function Input({ style, ...props }) {
  return <input style={{ ...base, ...style }} {...props} />
}

export function TextArea({ style, rows = 4, ...props }) {
  return <textarea rows={rows} style={{ ...base, resize: 'vertical', ...style }} {...props} />
}

export function Label({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.body, marginBottom: 6, fontFamily: T.font }}>
      {children}{hint && <span style={{ fontWeight: 400, color: T.muted }}> {hint}</span>}
    </label>
  )
}

// Inline error text that screen readers announce.
export function ErrorText({ children, style }) {
  if (!children) return null
  return <p role="alert" style={{ fontSize: 12, color: T.danger, lineHeight: 1.5, margin: 0, ...style }}>{children}</p>
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className="hb-press"
      onClick={() => onChange(!checked)}
      aria-label={label}
      aria-pressed={checked}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        flexShrink: 0, transition: 'background 0.2s', background: checked ? T.accent : 'rgba(255,255,255,0.15)',
      }}
    >
      <span style={{
        position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: T.ground,
        top: 3, transition: 'left 0.2s', left: checked ? 21 : 3,
      }} />
    </button>
  )
}
