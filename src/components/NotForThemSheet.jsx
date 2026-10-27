import { useState } from 'react'
import { useDataStore } from '../store/dataStore'
import { refineTheme } from '../services/themes'
import { track } from '../services/events'
import { haptic } from '../services/haptics'
import { choiceKey } from '../lib/themeChoices'
import TextAboutChips from './TextAboutChips'
import ThinkingMark from './ThinkingMark'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { useToast } from '../ui/toastStore'
import { T } from '../ui/tokens'

const firstName = (name = '') => name.split(' ')[0]

function useCardTheme(update) {
  const contact = useDataStore(s => s.contacts.find(c => String(c.id) === String(update?.contactId)))
  const theme = useDataStore(s => (s.themesByContact[String(update?.contactId)] || []).find(t => t.label === update?.themeLabel))
  return { contact, theme }
}

// "Not something I'd send": why a card isn't one to send, in one tap. The
// card goes away like a skip, and the theme it came from learns from the
// answer (dataStore.notForThem). "Wouldn't care" asks before turning a choice
// off, or shows the theme's choices when the story didn't match one.
export default function NotForThemSheet({ reason, onClose, onDone }) {
  const notForThem = useDataStore(s => s.notForThem)
  const setTextAbout = useDataStore(s => s.setTextAbout)
  const putTheme = useDataStore(s => s.putTheme)
  const showToast = useToast(s => s.show)
  const update = reason?.update
  const { contact, theme } = useCardTheme(update)
  const [step, setStep] = useState('why') // 'why' | 'stop' | 'choices'
  const [choices, setChoices] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shownFor, setShownFor] = useState(null)
  if (reason !== shownFor) {
    // A different card: start over.
    setShownFor(reason)
    setStep('why')
    setChoices(null)
    setLoading(false)
  }
  if (!reason) return <Sheet open={false} onClose={onClose} />

  const first = firstName(contact?.name || update.contactName)
  const label = update.themeLabel
  const matched = update.textAbout && theme?.textAbout?.find(c => c.on && choiceKey(c.label) === choiceKey(update.textAbout))

  // Dismiss the card with its reason, say what changed, and offer Undo.
  // notForThem's undo puts back what it changed itself; `before` is the theme
  // as it was before a choice was turned off here.
  function finish(why, { message, before } = {}) {
    haptic.soft()
    const undoCard = notForThem(update, why)
    track('not_for_them', { why, kind: reason.kind })
    if (message) {
      showToast(message, {
        action: 'Undo',
        onAction: () => { undoCard(); if (before) putTheme(update.contactId, before) },
      })
    }
    onDone?.()
  }

  async function wouldntCare() {
    if (matched) { setStep('stop'); return }
    if (theme?.textAbout?.length) { setChoices(theme.textAbout); setStep('choices'); return }
    // An older theme with no choices yet: get them now, to set right here.
    setStep('choices')
    setLoading(true)
    const r = theme && contact ? await refineTheme(theme.label, contact) : null
    setLoading(false)
    if (r?.refinement?.textAbout?.length) setChoices(r.refinement.textAbout)
    else finish('not_their_thing', { message: 'Skipped this one.' })
  }

  function stopWatching() {
    const before = theme
    setTextAbout(update.contactId, theme.id, theme.textAbout.map(c => (c === matched ? { ...c, on: false } : c)))
    track('text_about_off', { where: 'card' })
    finish('not_their_thing', { message: `Stopped watching “${matched.label}” for ${first}.`, before })
  }

  function saveChoices() {
    const before = theme
    setTextAbout(update.contactId, theme.id, choices)
    if (!choices.some(c => c.on)) track('text_about_off', { where: 'card' })
    finish('not_their_thing', { message: `Saved what you'd text ${first} about.`, before })
  }

  const option = (text, onClick) => (
    <button
      type="button"
      className="hb-press"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', minHeight: 52, padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: T.ink,
        background: T.ground, border: `1px solid ${T.hairline}`, borderRadius: 12,
      }}
    >
      {text}
    </button>
  )

  return (
    <Sheet open={!!reason} onClose={onClose} title={step === 'why' ? 'Why not this one?' : `${first} wouldn't care`}>
      {step === 'why' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {option(`It's not about ${label}`, () => finish('off_subject', { message: `Got it. Stories like this won't count for ${label}.` }))}
          {theme && option(`${first} wouldn't care about this`, wouldntCare)}
          {reason.kind === 'favor'
            ? option('Not worth passing along', () => finish('no_favor', { message: `Got it. No more pass-alongs for ${label}.` }))
            : option('Too small to text about', () => finish('too_small', { message: `Got it. ${label} needs bigger news from now on.` }))}
          {option('Just not now', () => finish('not_now'))}
        </div>
      )}

      {step === 'stop' && matched && (
        <>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: T.body, margin: 0 }}>
            Stop watching <strong style={{ color: T.ink }}>{matched.label}</strong> for {first}?
          </p>
          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <Button size="lg" full onClick={stopWatching}>Stop watching</Button>
            <Button variant="secondary" size="lg" full onClick={() => finish('not_their_thing', { message: 'Skipped this one.' })}>Just this story</Button>
          </div>
        </>
      )}

      {step === 'choices' && (
        loading ? (
          <ThinkingMark size={12} label={`Working out what you might text ${first} about…`} labelStyle={{ fontSize: 13 }} />
        ) : choices && (
          <>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: T.body, margin: '0 0 12px' }}>
              Tap what you&rsquo;d text {first} about for {label}. Stories about anything else won&rsquo;t count.
            </p>
            <TextAboutChips choices={choices} onChange={setChoices} noneHint={`Nothing on, so Harbored stops watching ${label} for ${first}.`} />
            <Button size="lg" full onClick={saveChoices} style={{ marginTop: 18 }}>Save</Button>
          </>
        )
      )}
    </Sheet>
  )
}

// "Change" on a guessed choice: the theme's choices to set.
export function ChoicesSheet({ target, onClose }) {
  const setTextAbout = useDataStore(s => s.setTextAbout)
  const theme = useDataStore(s => (s.themesByContact[String(target?.contactId)] || []).find(t => t.label === target?.themeLabel))
  const [choices, setChoices] = useState(null)
  const [shownFor, setShownFor] = useState(null)
  if (target !== shownFor) {
    setShownFor(target)
    setChoices(theme?.textAbout || null)
  }
  const first = firstName(target?.contactName)
  function save() {
    haptic.tick()
    setTextAbout(target.contactId, theme.id, choices)
    track('text_about_saved', { on: choices.filter(c => c.on).length, off: choices.filter(c => !c.on).length })
    onClose()
  }
  return (
    <Sheet
      open={!!target && !!theme && !!choices}
      onClose={onClose}
      title={`What would you text ${first} about?`}
      sub={target?.themeLabel}
      footer={<Button size="md" onClick={save}>Save</Button>}
    >
      {choices && <TextAboutChips choices={choices} onChange={setChoices} noneHint={`Nothing on, so Harbored stops watching ${target?.themeLabel} for ${first}.`} />}
    </Sheet>
  )
}
