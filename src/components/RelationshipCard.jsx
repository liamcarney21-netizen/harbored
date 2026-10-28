import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import ThinkingMark from './ThinkingMark'
import { ThemeSheet, AddThemeSheet, RelationshipSheet } from './CardSheets'
import { useDataStore } from '../store/dataStore'
import { refineTheme } from '../services/themes'
import { track } from '../services/events'
import { haptic } from '../services/haptics'
import { themeRefining, themeWatch } from '../lib/status'
import { checkedChoices, choiceKey, isPausedTheme } from '../lib/themeChoices'
import { relationshipLine } from '../lib/relations'
import { useToast } from '../ui/toastStore'
import { T } from '../ui/tokens'

// The relationship card (build 13): one plain line per thing, and a tap on a
// line opens a sheet for just that thing (CardSheets). The quiz shows it for
// a draft; the profile and the themes manager show it for what's saved.

// A tappable line: a title, an optional second line, and a chevron.
export function CardLine({ title, sub, subTone = 'muted', thinking = false, onClick, last = false }) {
  return (
    <button
      type="button"
      className="hb-press"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        background: 'none', border: 'none', borderBottom: last ? 'none' : `1px solid ${T.hairline}`, padding: '12px 0', minHeight: 52,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.35 }}>{title}</span>
        {thinking ? (
          <ThinkingMark size={10} label="Working out what to watch…" style={{ marginTop: 3 }} labelStyle={{ fontSize: 12 }} />
        ) : sub ? (
          <span style={{ display: 'block', fontSize: 13, color: subTone === 'accent' ? T.accent : T.muted, marginTop: 2, lineHeight: 1.45 }}>{sub}</span>
        ) : null}
      </span>
      <ChevronRight style={{ width: 16, height: 16, color: T.faint, flexShrink: 0 }} />
    </button>
  )
}

// What a theme's second line says: the choices that are on, in words.
function themeSub(view) {
  if (view.bare) return { text: 'Too broad to watch · pick one', tone: 'accent' }
  if (view.textAbout?.length) {
    const on = checkedChoices(view.textAbout)
    return on.length ? { text: on.join(', '), tone: 'muted' } : { text: 'Not watching anything here', tone: 'accent' }
  }
  return { text: view.display || '', tone: 'muted' }
}

export function ThemeLine({ view, onClick, last }) {
  const sub = themeSub(view)
  return <CardLine title={view.label} sub={sub.text} subTone={sub.tone} thinking={view.refining} onClick={onClick} last={last} />
}

// "+ Add something you share", and any quick suggestions beside it.
export function AddLine({ label = 'Add something you share', onClick }) {
  return (
    <button
      type="button"
      className="hb-press"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: T.accent }}
    >
      <Plus style={{ width: 15, height: 15 }} />{label}
    </button>
  )
}

// A saved theme as the card shows it.
function storedView(t) {
  return {
    key: t.id, label: t.label, refining: themeRefining(t), textAbout: t.textAbout, bare: t.bare, narrower: t.narrower,
    display: themeWatch(t).text, paused: isPausedTheme(t),
  }
}

// How you know someone, on their profile: one line, and the sheet to change it.
export function RelationshipButton({ contact }) {
  const setRelationship = useDataStore(s => s.setRelationship)
  const [open, setOpen] = useState(false)
  const first = (contact.name || '').split(' ')[0]
  const text = relationshipLine(contact)
  function save(v) {
    haptic.tick()
    setRelationship(contact.id, v)
    track('relation_set', { relation: v.relation || 'none', where: 'profile' })
  }
  return (
    <>
      <button
        type="button"
        className="hb-press"
        onClick={() => setOpen(true)}
        style={{ display: 'block', background: 'none', border: 'none', padding: '4px 0', marginTop: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left', color: text ? T.body : T.muted, textDecoration: text ? 'none' : 'underline', textUnderlineOffset: 3 }}
      >
        {text || `How do you know ${first}?`}
      </button>
      <RelationshipSheet open={open} first={first} value={contact} onClose={() => setOpen(false)} onSave={save} />
    </>
  )
}

// A person's saved themes as card lines, with the sheets to change them.
// Edits save as they're made, like everything else on the profile.
export function StoredThemes({ contact, themes }) {
  const setTextAbout = useDataStore(s => s.setTextAbout)
  const removeTheme = useDataStore(s => s.removeTheme)
  const restoreTheme = useDataStore(s => s.restoreTheme)
  const replaceTheme = useDataStore(s => s.replaceTheme)
  const addTheme = useDataStore(s => s.addTheme)
  const updateTheme = useDataStore(s => s.updateTheme)
  const showToast = useToast(s => s.show)
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const first = (contact.name || '').split(' ')[0]
  const open = themes.find(t => t.id === openId)
  const suggestions = contact.company && !themes.some(t => choiceKey(t.label) === choiceKey(contact.company)) ? [contact.company] : []

  function refineInto(saved, label) {
    refineTheme(label, contact).then(r => { if (r) updateTheme(contact.id, saved.id, r.refinement) })
  }
  function add(label) {
    haptic.tick()
    refineInto(addTheme(contact.id, label, 'topic'), label)
  }
  function remove(t) {
    const index = themes.findIndex(x => x.id === t.id)
    removeTheme(contact.id, t.id)
    haptic.soft()
    showToast(`Stopped watching ${t.label}`, { action: 'Undo', onAction: () => restoreTheme(contact.id, t, index) })
  }
  function pickNarrower(t, label) {
    haptic.tick()
    refineInto(replaceTheme(contact.id, t.id, label), label)
  }
  function changeChoices(t, list) {
    haptic.tick()
    setTextAbout(contact.id, t.id, list)
    if (!list.some(c => c.on)) track('text_about_off', { where: 'profile' })
  }

  return (
    <>
      {themes.map((t, i) => <ThemeLine key={t.id} view={storedView(t)} onClick={() => setOpenId(t.id)} last={i === themes.length - 1} />)}
      <AddLine onClick={() => setAdding(true)} />
      <ThemeSheet
        open={!!open}
        first={first}
        theme={open && storedView(open)}
        display={open && themeWatch(open).text}
        onClose={() => setOpenId(null)}
        onChangeChoices={(list) => changeChoices(open, list)}
        onRemove={() => remove(open)}
        onPickNarrower={(label) => pickNarrower(open, label)}
      />
      <AddThemeSheet open={adding} first={first} suggestions={suggestions} onClose={() => setAdding(false)} onAdd={add} />
    </>
  )
}
