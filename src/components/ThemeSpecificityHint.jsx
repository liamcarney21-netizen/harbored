import { useState, useEffect } from 'react'

// Soft nudge shown while a user types a theme that looks like a bare category.
// A generic theme ("fintech startup", "pickleball") can't be monitored well —
// the news search returns category noise and the scorer caps it below the
// reach-out bar — so steer toward a specific subject at entry time.
//
// Heuristic: no proper noun after the first word and no digit usually means
// generic ("marathon running") vs. specific ("Sunny Benefits", "Formula 1").
// Advisory only — it never blocks adding the theme.
export function looksGeneric(label) {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0 || /\d/.test(label)) return false
  if (words.slice(1).some(w => /^[A-Z]/.test(w))) return false
  return words.length > 1 || !/^[A-Z]/.test(words[0]) || label.trim().length < 4
}

export default function ThemeSpecificityHint({ label, style }) {
  // Judging a label mid-keystroke ("Su", "Superhero mo") makes the hint
  // flash in and out and shove the layout around while someone types. Only
  // speak up once they've paused.
  const [settled, setSettled] = useState(label)
  useEffect(() => {
    const t = setTimeout(() => setSettled(label), 700)
    return () => clearTimeout(t)
  }, [label])

  if (settled !== label || !looksGeneric(label)) return null
  return (
    <p style={{ fontSize: 12, color: '#D3A95C', lineHeight: 1.5, margin: '8px 0 0', ...style }}>
      Sounds broad — Harbored watches specifics best. Try naming it:
      "Sunny Benefits" instead of "fintech startup", "Pickleball in Charleston" instead of "pickleball".
    </p>
  )
}
