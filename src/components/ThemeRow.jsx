import { X } from 'lucide-react'
import ThemeWatchLine from './ThemeWatchLine'
import TextAboutChips, { NarrowerPicks } from './TextAboutChips'
import { useDataStore } from '../store/dataStore'
import { refineTheme } from '../services/themes'
import { track } from '../services/events'
import { cleanBar } from '../lib/themeChoices'
import { haptic } from '../services/haptics'
import { T } from '../ui/tokens'

// One theme on a profile or in the themes manager: what it watches, the
// choices of what you'd text them about, anything a card changed ("Only big
// news", "No pass-alongs") with a way back, and for a bare category the
// narrower subjects to watch instead.
export default function ThemeRow({ contact, theme, onRemove }) {
  const setTextAbout = useDataStore(s => s.setTextAbout)
  const resetTheme = useDataStore(s => s.resetTheme)
  const replaceTheme = useDataStore(s => s.replaceTheme)
  const updateTheme = useDataStore(s => s.updateTheme)
  const first = (contact.name || '').split(' ')[0]
  const raised = !!cleanBar(theme.bar)
  const noFavors = theme.favors === false

  function pickNarrower(label) {
    haptic.tick()
    const saved = replaceTheme(contact.id, theme.id, label)
    refineTheme(label, contact).then(r => { if (r) updateTheme(contact.id, saved.id, r.refinement) })
  }

  function toggle(list) {
    haptic.tick()
    setTextAbout(contact.id, theme.id, list)
    if (!list.some(c => c.on)) track('text_about_off', { where: 'profile' })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: T.ground, border: `1px solid ${T.hairline}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{theme.label}</div>
        <ThemeWatchLine theme={theme} first={first} />
        {theme.bare ? (
          <NarrowerPicks narrower={theme.narrower} onPick={pickNarrower} style={{ marginTop: 8 }} />
        ) : (
          <TextAboutChips choices={theme.textAbout} onChange={toggle} style={{ marginTop: 8 }} />
        )}
        {(raised || noFavors) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8 }}>
            {raised && <Setting label="Only big news" onReset={() => resetTheme(contact.id, theme.id, 'bar')} />}
            {noFavors && <Setting label="No pass-alongs" onReset={() => resetTheme(contact.id, theme.id, 'favors')} />}
          </div>
        )}
      </div>
      <button
        className="hb-press"
        onClick={onRemove}
        aria-label={`Stop watching ${theme.label}`}
        style={{ width: 36, height: 36, margin: '-6px -8px -6px 0', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  )
}

function Setting({ label, onReset }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted }}>
      {label} ·
      <button
        type="button"
        className="hb-press"
        onClick={onReset}
        style={{ background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: T.accent }}
      >
        Reset
      </button>
    </span>
  )
}
