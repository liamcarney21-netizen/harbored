import ThinkingMark from './ThinkingMark'
import { themeWatch } from '../lib/status'
import { T } from '../ui/tokens'

// The line under a theme that says what Harbored actually watches for it, or
// that it's too broad to watch well.
export default function ThemeWatchLine({ theme }) {
  const w = themeWatch(theme)
  return (
    <div style={{ fontSize: 12, color: w.broad ? T.accent : T.muted, marginTop: 3, lineHeight: 1.45 }}>
      {w.refining ? <ThinkingMark size={10} label="Working out what to watch…" labelStyle={{ fontSize: 12 }} /> : w.text}
    </div>
  )
}
