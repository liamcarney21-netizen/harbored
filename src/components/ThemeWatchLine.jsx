import ThinkingMark from './ThinkingMark'
import { themeWatch } from '../lib/status'
import { T } from '../ui/tokens'

// The line under a theme that says what Harbored actually watches for it,
// that it's too broad to watch, or that every choice is turned off.
export default function ThemeWatchLine({ theme, first }) {
  const w = themeWatch(theme)
  const text = w.paused && first ? `${w.text} Tap what you'd text ${first} about.` : w.text
  return (
    <div style={{ fontSize: 12, color: w.broad || w.paused ? T.accent : T.muted, marginTop: 3, lineHeight: 1.45 }}>
      {w.refining ? <ThinkingMark size={10} label="Working out what to watch…" labelStyle={{ fontSize: 12 }} /> : text}
    </div>
  )
}
