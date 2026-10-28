import { useState } from 'react'
import { Plus } from 'lucide-react'
import RelationPicker from './RelationPicker'
import TextAboutChips, { NarrowerPicks } from './TextAboutChips'
import ThinkingMark from './ThinkingMark'
import ThemeSpecificityHint from './ThemeSpecificityHint'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { Input } from '../ui/Field'
import { CLOSENESS, RELATION_NOTE_MAX } from '../lib/relations'
import { T } from '../ui/tokens'

// The edit sheets behind a relationship card's lines (build 13): one sheet,
// one thing. Used by the quiz's card, the profile and the themes manager;
// `zIndex` lets the quiz (an overlay itself) put them on top.

const sectionLabel = { fontSize: 12, fontWeight: 600, color: T.muted, margin: '0 0 8px' }

// Fresh values each time a sheet opens for something new.
function useOpenedWith(open, key, init) {
  const [state, setState] = useState(init)
  const [shownFor, setShownFor] = useState(null)
  const id = open ? key : null
  if (id !== shownFor) {
    setShownFor(id)
    if (open) setState(init)
  }
  return [state, setState]
}

// How you know them, where from, and how close you are.
export function RelationshipSheet({ open, first, value = {}, onClose, onSave, zIndex }) {
  const [v, setV] = useOpenedWith(open, `${value.relation}|${value.relationNote}|${value.closeness}`, {
    relation: value.relation || null, relationNote: value.relationNote || '', closeness: value.closeness || null,
  })
  function save() {
    onSave({ relation: v.relation, relationNote: v.relationNote.trim(), closeness: v.closeness })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`How do you know ${first}?`} zIndex={zIndex} footer={<Button size="md" onClick={save}>Done</Button>}>
      <RelationPicker value={v.relation} onChange={(relation) => setV(s => ({ ...s, relation }))} />
      <Input
        value={v.relationNote}
        onChange={e => setV(s => ({ ...s, relationNote: e.target.value }))}
        maxLength={RELATION_NOTE_MAX}
        placeholder="at High Point"
        aria-label={`Where you know ${first} from`}
        style={{ marginTop: 12, background: T.ground, padding: '11px 13px' }}
      />
      <p style={{ ...sectionLabel, margin: '20px 0 8px' }}>How close are you?</p>
      <div role="group" aria-label="How close you are" style={{ display: 'grid', gridTemplateColumns: `repeat(${CLOSENESS.length}, minmax(0, 1fr))`, borderRadius: 11, border: `1px solid ${T.hairlineStrong}`, overflow: 'hidden' }}>
        {CLOSENESS.map((c, i) => {
          const on = v.closeness === c.id
          return (
            <button
              key={c.id}
              type="button"
              className="hb-press"
              aria-pressed={on}
              onClick={() => setV(s => ({ ...s, closeness: on ? null : c.id }))}
              style={{
                minHeight: 40, padding: '8px 4px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                borderLeft: i ? `1px solid ${T.hairlineStrong}` : 'none',
                background: on ? T.accentSoft : 'transparent', color: on ? T.accent : T.body,
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

// One thing you share: what Harbored watches, the choices of what you'd text
// about, and the way out (a narrower pick for a bare category, or Stop
// watching).
export function ThemeSheet({ open, first, theme, display, onClose, onChangeChoices, onRemove, onPickNarrower, zIndex }) {
  if (!theme) return <Sheet open={false} onClose={onClose} zIndex={zIndex} />
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={theme.label}
      sub={theme.refining || theme.bare ? undefined : display}
      zIndex={zIndex}
      footer={<>
        <Button variant="ghost" size="md" onClick={() => { onRemove(); onClose() }} style={{ color: T.danger }}>Stop watching</Button>
        <Button size="md" onClick={onClose}>Done</Button>
      </>}
    >
      {theme.refining ? (
        <ThinkingMark size={12} label="Working out what to watch…" labelStyle={{ fontSize: 13 }} />
      ) : theme.bare ? (
        <>
          <p style={{ fontSize: 14, color: T.body, lineHeight: 1.55, margin: '0 0 12px' }}>
            {theme.narrower?.length ? 'Too broad to watch. Pick one to watch instead:' : 'Too broad to watch. Add something more specific instead.'}
          </p>
          <NarrowerPicks narrower={theme.narrower} onPick={(n) => { onPickNarrower(n); onClose() }} />
        </>
      ) : theme.textAbout?.length ? (
        <>
          <p style={sectionLabel}>What would you text {first} about?</p>
          <TextAboutChips
            choices={theme.textAbout}
            onChange={onChangeChoices}
            noneHint={`Nothing on, so Harbored won't watch ${theme.label} for ${first}.`}
          />
        </>
      ) : (
        <p style={{ fontSize: 14, color: T.body, lineHeight: 1.55, margin: 0 }}>Harbored watches the news for {theme.label}.</p>
      )}
    </Sheet>
  )
}

// A fact worth remembering, before it's saved to their notes.
export function FactSheet({ open, value = '', onClose, onSave, onRemove, zIndex }) {
  const [text, setText] = useOpenedWith(open, value, value)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Good to know"
      sub="Saved to their notes."
      zIndex={zIndex}
      footer={<>
        <Button variant="ghost" size="md" onClick={() => { onRemove(); onClose() }} style={{ color: T.danger }}>Remove</Button>
        <Button size="md" onClick={() => { if (text.trim()) onSave(text.trim()); else onRemove(); onClose() }}>Done</Button>
      </>}
    >
      <Input data-autofocus value={text} onChange={e => setText(e.target.value)} maxLength={80} aria-label="Good to know" style={{ background: T.ground }} />
    </Sheet>
  )
}

// Something else you share: type it, or take a suggestion.
export function AddThemeSheet({ open, first, suggestions = [], placeholder = 'A team, a place, a company…', onClose, onAdd, zIndex }) {
  const [label, setLabel] = useOpenedWith(open, placeholder, '')
  function add(l) {
    const clean = String(l || '').trim()
    if (!clean) return
    onAdd(clean)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`What do you share with ${first}?`} zIndex={zIndex} footer={<Button size="md" onClick={() => add(label)} disabled={!label.trim()}>Add</Button>}>
      <Input
        data-autofocus
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(label) } }}
        placeholder={placeholder}
        aria-label="Something you share"
        style={{ background: T.ground }}
      />
      <ThemeSpecificityHint label={label} style={{ marginTop: 8 }} />
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              className="hb-press"
              onClick={() => add(s)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 34, padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: 'transparent', color: T.muted, border: `1px solid ${T.hairlineStrong}` }}
            >
              <Plus style={{ width: 12, height: 12 }} />{s}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
