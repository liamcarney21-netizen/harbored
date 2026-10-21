import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { refineTheme } from '../services/themes'
import ThemeSpecificityHint from './ThemeSpecificityHint'
import { haptic } from '../services/haptics'
import { T } from '../ui/tokens'

// The one way to add a theme outside the quiz: type the specific thing, it is
// saved at once and refined into a precise watch in the background — exactly
// what the quiz does, so a theme behaves the same wherever it was added.
export default function ThemeAdder({ contact, placeholder = 'Add something you share…', autoFocus = false, onAdded, style }) {
  const addTheme = useDataStore(s => s.addTheme)
  const updateTheme = useDataStore(s => s.updateTheme)
  const [label, setLabel] = useState('')

  function add() {
    const l = label.trim()
    if (!l || !contact) return
    haptic.tick()
    const saved = addTheme(contact.id, l, 'topic')
    refineTheme(l, contact).then(r => { if (r) updateTheme(contact.id, saved.id, r.refinement) })
    setLabel('')
    onAdded?.(saved)
  }

  return (
    <div style={style}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'stretch' }}>
        <input
          value={label}
          autoFocus={autoFocus}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          aria-label="New theme"
          style={{
            flex: 1, minWidth: 0, fontSize: 16, color: T.ink, fontFamily: 'inherit',
            padding: '12px 14px', borderRadius: 13, outline: 'none', background: T.ground,
            border: `1px solid ${label.trim() ? T.accentLine : T.hairlineStrong}`, boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
          }}
        />
        <button
          type="button"
          className="hb-press"
          onClick={add}
          aria-label="Add theme"
          disabled={!label.trim()}
          style={{
            flexShrink: 0, width: 48, borderRadius: 13, border: 'none', cursor: label.trim() ? 'pointer' : 'default',
            background: label.trim() ? T.accent : T.accentSoft, color: label.trim() ? T.ground : T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>
      </div>
      <ThemeSpecificityHint label={label} style={{ marginTop: 8 }} />
    </div>
  )
}
