import { Check, Plus } from 'lucide-react'
import { T } from '../ui/tokens'

const chipStyle = (on) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 34, padding: '6px 12px', borderRadius: 999,
  fontSize: 13, fontWeight: 600, lineHeight: 1.2, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
  background: on ? T.accentSoft : 'transparent', color: on ? T.accent : T.muted,
  border: `1px solid ${on ? T.accentLine : T.hairlineStrong}`,
  transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
})

// "What would you text them about?" — a theme's choices as a row of toggles.
// The checked ones are what counts for the theme. Used in the quiz, on the
// profile, in the themes manager and in the "wouldn't care" step on a card.
// `noneHint` is shown when every choice is off (the theme is then paused).
export default function TextAboutChips({ choices = [], onChange, noneHint, style }) {
  if (!choices.length) return null
  const none = !choices.some(c => c.on)
  return (
    <div style={style}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {choices.map((c, i) => (
          <button
            key={c.label}
            type="button"
            className="hb-press"
            aria-pressed={c.on}
            onClick={() => onChange(choices.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
            style={chipStyle(c.on)}
          >
            {c.on && <Check style={{ width: 12, height: 12, flexShrink: 0 }} />}
            {c.label}
          </button>
        ))}
      </div>
      {none && noneHint && <div style={{ fontSize: 12, color: T.accent, marginTop: 7, lineHeight: 1.45 }}>{noneHint}</div>}
    </div>
  )
}

// A bare category's way out: narrower subjects to watch instead. Tapping one
// replaces the theme.
export function NarrowerPicks({ narrower = [], onPick, style }) {
  if (!narrower.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
      {narrower.map(n => (
        <button key={n} type="button" className="hb-press" onClick={() => onPick(n)} style={chipStyle(false)}>
          <Plus style={{ width: 12, height: 12, flexShrink: 0 }} />
          {n}
        </button>
      ))}
    </div>
  )
}
