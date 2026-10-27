import { RELATIONS } from '../lib/relations'
import { T } from '../ui/tokens'

// "How do you know Colin?" — one tap, never required. Tapping the chosen one
// again clears it.
export default function RelationPicker({ value, onChange, style }) {
  return (
    <div role="group" aria-label="How you know them" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
      {RELATIONS.map(r => {
        const on = value === r.id
        return (
          <button
            key={r.id}
            type="button"
            className="hb-press"
            aria-pressed={on}
            onClick={() => onChange(on ? null : r.id)}
            style={{
              minHeight: 34, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600,
              background: on ? T.accentSoft : 'transparent', color: on ? T.accent : T.body,
              border: `1px solid ${on ? T.accentLine : T.hairlineStrong}`,
              transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
