import { T } from './tokens'

// A raised surface on the navy ground. `flush` drops the padding for lists.
export default function Card({ as: Tag = 'div', flush = false, style, children, ...rest }) {
  return (
    <Tag
      style={{
        background: T.card, border: `1px solid ${T.hairline}`, borderRadius: 16,
        padding: flush ? 0 : 18, overflow: flush ? 'hidden' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// Eyebrow label above a group of cards.
export function Eyebrow({ style, children }) {
  return (
    <div style={{
      fontFamily: T.font, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: T.muted, margin: '24px 0 10px', paddingLeft: 4, ...style,
    }}>
      {children}
    </div>
  )
}

// Screen title + one-line subtitle, the same on every page.
export function PageTitle({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <h1 className="hb-display" style={{ fontSize: 30, fontWeight: 500, color: T.ink, lineHeight: 1.1, margin: 0 }}>
          {title}
        </h1>
        {sub && <p style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// A settings-style row: text on the left, one control on the right.
export function Row({ title, sub, control, last = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', minHeight: 44,
        borderBottom: last ? 'none' : `1px solid ${T.hairline}`, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: T.ink }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      {control && <div style={{ flexShrink: 0 }}>{control}</div>}
    </div>
  )
}
