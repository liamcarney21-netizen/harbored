import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { refineTheme } from '../services/themes'
import { mapRelationship } from '../services/discovery'
import { isSpeechSupported, createRecognizer } from '../services/speech'
import { track } from '../services/events'
import { haptic } from '../services/haptics'
import { useIsMobile } from '../hooks/useIsMobile'
import { choiceKey } from '../lib/themeChoices'
import { relationshipLine } from '../lib/relations'
import WarmAvatar from './WarmAvatar'
import ThinkingMark from './ThinkingMark'
import { CardLine, ThemeLine, AddLine } from './RelationshipCard'
import { RelationshipSheet, ThemeSheet, FactSheet, AddThemeSheet } from './CardSheets'
import Button from '../ui/Button'
import { Eyebrow } from '../ui/Card'
import { TextArea, ErrorText } from '../ui/Field'
import { T } from '../ui/tokens'

// "Tell Harbored about them" (build 13), shown right after people are
// imported: for each person, describe the relationship in your own words
// (typed or spoken), and Harbored maps it into one clean card to confirm.
// The detail comes from what you say, not from buttons on the screen. "I'll
// add things myself" starts the same card empty. With `more`, the same flow
// adds to one person from their profile ("Tell Harbored more about Colin").

const SHEET_Z = 80 // the edit sheets sit above this overlay
const MIN_CHARS = 12

// Local ids for themes on a card, unique for the life of the page.
let answerSeq = 0
const nextAnswerId = () => `c${++answerSeq}`

function emptyDraft(contact) {
  return {
    relation: contact?.relation || null,
    relationNote: contact?.relationNote || '',
    closeness: contact?.closeness || null,
    company: null,
    themes: [],
    facts: [],
  }
}

// A card theme as its line and sheet show it.
function viewOf(t) {
  const r = t.refinement || {}
  return { key: t.cid, label: t.label, refining: t.refining, textAbout: r.textAbout, bare: r.bare, narrower: r.narrower, display: r.display }
}

export default function ThemeComposerModal({ open, contacts = [], onClose, more = false }) {
  const addTheme = useDataStore(s => s.addTheme)
  const updateTheme = useDataStore(s => s.updateTheme)
  const updateContact = useDataStore(s => s.updateContact)
  const setRelationship = useDataStore(s => s.setRelationship)
  const addNotes = useDataStore(s => s.addNotes)
  const isMobile = useIsMobile()

  const [index, setIndex] = useState(0)
  const [step, setStep] = useState('describe') // 'describe' | 'mapping' | 'card'
  const [text, setText] = useState('')
  const [voiceMode, setVoiceMode] = useState('idle') // 'idle' | 'listening'
  const [voiceError, setVoiceError] = useState('')
  const [mapError, setMapError] = useState('')
  const [draft, setDraft] = useState(() => emptyDraft(contacts[0]))
  const [described, setDescribed] = useState(false)
  const [edited, setEdited] = useState(false)
  const [sheet, setSheet] = useState(null) // { kind: 'relationship' | 'theme' | 'fact' | 'add', cid?, i?, placeholder? }

  const recognizerRef = useRef(null)
  const voiceBaseRef = useRef('') // what was typed before the mic started
  const usedVoiceRef = useRef(false)
  const textRef = useRef(null)
  // Themes saved while their refinement was still in flight: cid -> where the
  // saved theme lives, so the refinement can be patched in when it arrives.
  const committedRef = useRef(new Map())
  // What this quiz saved, reported to onClose.
  const savedRef = useRef({ themes: 0, people: 0 })

  const current = contacts[index]
  // The person as saved now (company or relation may have changed since import).
  const live = useDataStore(s => s.contacts.find(c => String(c.id) === String(current?.id))) || current
  const stored = useDataStore(s => s.themesByContact[String(current?.id)])
  const total = contacts.length
  const isLast = index >= total - 1

  // On the phone the keyboard shrinks the web view; keep the text box in sight.
  useEffect(() => {
    const reveal = () => setTimeout(() => {
      const el = textRef.current
      if (el && document.activeElement === el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 50)
    window.addEventListener('resize', reveal)
    window.visualViewport?.addEventListener('resize', reveal)
    return () => {
      window.removeEventListener('resize', reveal)
      window.visualViewport?.removeEventListener('resize', reveal)
    }
  }, [])

  function stopVoice() {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    setVoiceMode('idle')
  }

  function resetFor(contact) {
    stopVoice()
    usedVoiceRef.current = false
    setStep('describe'); setText(''); setVoiceError(''); setMapError('')
    setDraft(emptyDraft(contact)); setDescribed(false); setEdited(false); setSheet(null)
  }

  // ── Voice: fills the text box, like dictation ──
  function toggleVoice() {
    if (voiceMode === 'listening') { stopVoice(); return }
    setVoiceError('')
    voiceBaseRef.current = text.trim()
    usedVoiceRef.current = true
    setVoiceMode('listening')
    recognizerRef.current = createRecognizer({
      onText: (t) => setText([voiceBaseRef.current, t].filter(Boolean).join(' ')),
      onEnd: () => { recognizerRef.current = null; setVoiceMode('idle') },
      onError: (msg) => { setVoiceError(msg); recognizerRef.current = null; setVoiceMode('idle') },
    })
    recognizerRef.current.start()
  }

  // ── Refinement, as each theme on the card is worked out ──
  function refineOnCard(cid, label, contact, said) {
    refineTheme(label, contact, { said }).then(r => {
      const saved = committedRef.current.get(cid)
      if (saved) {
        committedRef.current.delete(cid)
        if (r) updateTheme(saved.contactId, saved.themeId, r.refinement)
        return
      }
      setDraft(d => ({ ...d, themes: d.themes.map(t => (t.cid === cid ? { ...t, refining: false, refinement: r?.refinement || null } : t)) }))
    })
  }

  // Themes this person already has (from their profile) aren't proposed again.
  const known = (label) => (stored || []).some(t => choiceKey(t.label) === choiceKey(label))

  async function mapIt() {
    const said = text.trim()
    if (said.length < MIN_CHARS) { setMapError('Say a little more about how you know them.'); return }
    stopVoice()
    setMapError('')
    setStep('mapping')
    haptic.tick()
    let m
    try {
      m = await mapRelationship(said, live)
    } catch (err) {
      setMapError(`${err.message || "Couldn't map that just now."} Try again, or add things yourself.`)
      setStep('describe')
      return
    }
    const base = emptyDraft(live)
    const seen = new Set()
    const themes = []
    for (const t of m.themes || []) {
      const key = choiceKey(t?.label)
      if (!key || seen.has(key) || known(t.label)) continue
      seen.add(key)
      themes.push({ cid: nextAnswerId(), label: t.label, category: t.category || 'topic', said: t.said, refining: true, refinement: null })
    }
    const next = {
      relation: m.relation || base.relation,
      relationNote: m.relationNote || base.relationNote,
      closeness: m.closeness || base.closeness,
      company: !live?.company && m.company ? m.company : null,
      themes,
      // Anything their notes already say isn't offered again.
      facts: (Array.isArray(m.goodToKnow) ? m.goodToKnow : []).filter(f => !String(live?.notes || '').toLowerCase().includes(String(f).toLowerCase())),
    }
    setDraft(next)
    setDescribed(true)
    setEdited(false)
    setStep('card')
    haptic.soft()
    track('relationship_mapped', { themes: themes.length, facts: next.facts.length, voice: usedVoiceRef.current, engine: m.engine === 'claude' ? 'claude' : 'keywords' })
    const context = { ...live, company: live?.company || next.company || '', relation: next.relation || undefined }
    themes.forEach(t => refineOnCard(t.cid, t.label, context, t.said))
  }

  function addMyself() {
    stopVoice()
    setDraft(emptyDraft(live))
    setDescribed(false)
    setEdited(false)
    setStep('card')
    track('card_started_empty')
  }

  // ── Card edits (nothing is saved until "Looks right") ──
  function change(fn) {
    setDraft(fn)
    setEdited(true)
  }
  function addOnCard(label) {
    if (known(label) || draft.themes.some(t => choiceKey(t.label) === choiceKey(label))) return
    const cid = nextAnswerId()
    change(d => ({ ...d, themes: [...d.themes, { cid, label, category: 'topic', refining: true, refinement: null }] }))
    refineOnCard(cid, label, { ...live, relation: draft.relation || undefined })
  }
  function pickNarrower(cid, label) {
    const fresh = nextAnswerId()
    change(d => ({ ...d, themes: d.themes.map(t => (t.cid === cid ? { cid: fresh, label, category: t.category, refining: true, refinement: null } : t)) }))
    refineOnCard(fresh, label, { ...live, relation: draft.relation || undefined })
  }

  // Save the card: how you know them, their company if their card had none,
  // what's good to know (into their notes), and the themes. Choices shown on
  // the card were confirmed by "Looks right"; a theme still being worked out
  // is saved now and its refinement patched in when it lands (a guess until
  // they confirm it).
  function commitCard() {
    if (!current) return
    const contactId = current.id
    setRelationship(contactId, { relation: draft.relation, relationNote: draft.relationNote, closeness: draft.closeness })
    if (draft.company && !live?.company) updateContact(contactId, { company: draft.company })
    if (draft.facts.length) addNotes(contactId, draft.facts)
    draft.themes.forEach(t => {
      const choices = t.refinement?.textAbout || []
      const saved = addTheme(contactId, t.label, t.category, choices.length ? { ...t.refinement, textAboutConfirmed: true } : (t.refinement || {}))
      if (t.refining) committedRef.current.set(t.cid, { contactId, themeId: saved.id })
    })
    const count = draft.themes.length
    if (count) savedRef.current = { themes: savedRef.current.themes + count, people: savedRef.current.people + 1 }
    track('card_confirmed', { themes: count, facts: draft.facts.length, edited, described, more })
  }

  function advance() {
    haptic.soft()
    if (!isLast) {
      setIndex(i => i + 1)
      resetFor(contacts[index + 1])
    } else {
      closeAll()
    }
  }

  function looksRight() { commitCard(); advance() }
  function skipPerson() { advance() }
  // Closing the quiz keeps a card that's on screen (it used to throw answers
  // away without asking); "Tell Harbored more" closes without saving.
  function handleClose() {
    if (step === 'card' && !more) commitCard()
    closeAll()
  }
  function closeAll() {
    stopVoice()
    onClose(savedRef.current)
  }

  if (!open || !current) return null

  const first = (current.name || '').split(' ')[0]
  const rel = relationshipLine(draft)
  const openTheme = sheet?.kind === 'theme' ? draft.themes.find(t => t.cid === sheet.cid) : null
  const companySuggestion = live?.company && !known(live.company) && !draft.themes.some(t => choiceKey(t.label) === choiceKey(live.company)) ? live.company : null

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="hb-app"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ position: 'fixed', inset: 0, zIndex: 71, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{
            width: '100%', maxWidth: `${T.pageWidth}px`, margin: '0 auto', flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column',
            justifyContent: isMobile ? 'flex-start' : 'center',
            padding: `calc(env(safe-area-inset-top) + 12px) ${T.gutter}px calc(env(safe-area-inset-bottom) + 16px)`,
          }}>

            {/* Top: progress, Skip, close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              {total > 1 ? (
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  {contacts.map((c, i) => (
                    <span key={c.id} style={{
                      height: 5, borderRadius: 3, flex: i === index ? 2.2 : 1,
                      background: i < index ? 'rgba(211,169,92,0.6)' : i === index ? T.accent : 'rgba(211,169,92,0.22)',
                      transition: 'flex 0.25s ease, background 0.2s ease',
                    }} />
                  ))}
                </div>
              ) : <span style={{ flex: 1 }} />}
              {!more && (
                <button className="hb-press" onClick={skipPerson} style={{ minHeight: 44, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.muted }}>
                  Skip
                </button>
              )}
              <button
                className="hb-press"
                onClick={handleClose}
                aria-label="Close"
                style={{ width: 44, height: 44, marginRight: -12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: isMobile ? 1 : '0 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
                <WarmAvatar initials={current.initials} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <h1 className="hb-display" style={{ fontSize: 25, fontWeight: 500, color: T.ink, lineHeight: 1.2, margin: 0 }}>
                    {step === 'card' ? `You and ${first}` : more ? `Tell Harbored more about ${first}` : `Tell Harbored about you and ${first}`}
                  </h1>
                  {step !== 'card' && (current.role || current.company) && (
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{[current.role, current.company].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
              </div>

              {step !== 'card' ? (
                <>
                  <p style={{ fontSize: 14, color: T.body, lineHeight: 1.55, margin: '14px 0 0' }}>
                    How you know each other, what you talk about, what&rsquo;s new in {first}&rsquo;s life.
                  </p>
                  <TextArea
                    ref={textRef}
                    value={text}
                    onChange={e => { setText(e.target.value); if (mapError) setMapError('') }}
                    readOnly={step === 'mapping'}
                    rows={6}
                    maxLength={2000}
                    placeholder="We played ball together at High Point. Lives in Orange County now, works at Bernhardt. Huge Avalanche fan; we text during playoff games."
                    aria-label={`About you and ${first}`}
                    style={{ marginTop: 14, opacity: step === 'mapping' ? 0.6 : 1, resize: 'none' }}
                  />
                  {voiceMode === 'listening' && (
                    <p style={{ fontSize: 12, color: T.accent, margin: '8px 0 0', lineHeight: 1.5 }}>Listening. Tap the mic again when you&rsquo;re done.</p>
                  )}
                  <ErrorText style={{ marginTop: 8 }}>{voiceError || mapError}</ErrorText>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 14 }}>
                    <CardLine
                      title={rel || `How do you know ${first}?`}
                      sub={rel ? undefined : 'Add it'}
                      subTone="accent"
                      onClick={() => setSheet({ kind: 'relationship' })}
                      last
                    />
                  </div>

                  <Eyebrow>You&rsquo;d text {first} about</Eyebrow>
                  {draft.themes.map((t, i) => (
                    <ThemeLine key={t.cid} view={viewOf(t)} onClick={() => setSheet({ kind: 'theme', cid: t.cid })} last={i === draft.themes.length - 1} />
                  ))}
                  {draft.themes.length === 0 && (
                    <p style={{ fontSize: 13, color: T.muted, margin: '0 0 4px', lineHeight: 1.5 }}>
                      {more ? 'Nothing new to watch from what you said.' : 'Nothing to watch yet. Add a team, a place or a company you share.'}
                    </p>
                  )}
                  <AddLine onClick={() => setSheet({ kind: 'add' })} />
                  {draft.themes.length === 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {companySuggestion && <QuickPick label={companySuggestion} onClick={() => addOnCard(companySuggestion)} />}
                      <QuickPick label="A team" onClick={() => setSheet({ kind: 'add', placeholder: 'Colorado Avalanche' })} />
                      <QuickPick label="A place" onClick={() => setSheet({ kind: 'add', placeholder: 'Orange County' })} />
                    </div>
                  )}

                  {draft.facts.length > 0 && (
                    <>
                      <Eyebrow>Good to know</Eyebrow>
                      {draft.facts.map((f, i) => (
                        <CardLine key={`${i}-${f}`} title={f} onClick={() => setSheet({ kind: 'fact', i })} last={i === draft.facts.length - 1} />
                      ))}
                      <p style={{ fontSize: 12, color: T.muted, margin: '6px 0 0' }}>Saved to {first}&rsquo;s notes.</p>
                    </>
                  )}
                </>
              )}

              <div style={{ flex: isMobile ? 1 : '0 0 auto', minHeight: isMobile ? 16 : 28 }} />
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0, paddingTop: 10 }}>
              {step === 'card' ? (
                <>
                  {described && (
                    <Button variant="ghost" size="md" full onClick={() => { setStep('describe'); setSheet(null) }} style={{ marginBottom: 4 }}>
                      Change what I said
                    </Button>
                  )}
                  <Button size="lg" full onClick={looksRight}>Looks right</Button>
                </>
              ) : step === 'mapping' ? (
                <div style={{ display: 'flex', justifyContent: 'center', minHeight: 54, alignItems: 'center' }}>
                  <ThinkingMark size={14} label={`Mapping what you said about ${first}…`} labelStyle={{ fontSize: 14 }} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {isSpeechSupported() && (
                      <button
                        className="hb-press"
                        onClick={toggleVoice}
                        aria-label={voiceMode === 'listening' ? 'Stop listening' : `Talk about ${first}`}
                        style={{
                          width: 54, height: 54, flexShrink: 0, borderRadius: T.radius, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: voiceMode === 'listening' ? T.accentSoft : 'transparent',
                          border: `1px solid ${voiceMode === 'listening' ? T.accentLine : T.hairlineStrong}`,
                          color: voiceMode === 'listening' ? T.accent : T.ink,
                        }}
                      >
                        <Mic style={{ width: 19, height: 19, animation: voiceMode === 'listening' ? 'hbPulse 1.4s ease-in-out infinite' : 'none' }} />
                      </button>
                    )}
                    <Button size="lg" full onClick={mapIt}>Map it</Button>
                  </div>
                  <Button variant="ghost" size="md" full onClick={addMyself} style={{ marginTop: 6 }}>
                    I&rsquo;ll add things myself
                  </Button>
                </>
              )}
            </div>
          </div>

          <RelationshipSheet
            open={sheet?.kind === 'relationship'}
            first={first}
            value={draft}
            zIndex={SHEET_Z}
            onClose={() => setSheet(null)}
            onSave={(v) => change(d => ({ ...d, ...v }))}
          />
          <ThemeSheet
            open={!!openTheme}
            first={first}
            theme={openTheme && viewOf(openTheme)}
            display={openTheme?.refinement?.display}
            zIndex={SHEET_Z}
            onClose={() => setSheet(null)}
            onChangeChoices={(list) => change(d => ({ ...d, themes: d.themes.map(t => (t.cid === openTheme.cid ? { ...t, refinement: { ...t.refinement, textAbout: list } } : t)) }))}
            onRemove={() => change(d => ({ ...d, themes: d.themes.filter(t => t.cid !== openTheme.cid) }))}
            onPickNarrower={(label) => pickNarrower(openTheme.cid, label)}
          />
          <FactSheet
            open={sheet?.kind === 'fact'}
            value={sheet?.kind === 'fact' ? draft.facts[sheet.i] : ''}
            zIndex={SHEET_Z}
            onClose={() => setSheet(null)}
            onSave={(f) => change(d => ({ ...d, facts: d.facts.map((x, i) => (i === sheet.i ? f : x)) }))}
            onRemove={() => change(d => ({ ...d, facts: d.facts.filter((_, i) => i !== sheet.i) }))}
          />
          <AddThemeSheet
            open={sheet?.kind === 'add'}
            first={first}
            placeholder={sheet?.placeholder}
            suggestions={companySuggestion ? [companySuggestion] : []}
            zIndex={SHEET_Z}
            onClose={() => setSheet(null)}
            onAdd={addOnCard}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function QuickPick({ label, onClick }) {
  return (
    <button
      type="button"
      className="hb-press"
      onClick={onClick}
      style={{ minHeight: 34, padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: 'transparent', color: T.muted, border: `1px solid ${T.hairlineStrong}` }}
    >
      + {label}
    </button>
  )
}
