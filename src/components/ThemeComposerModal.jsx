import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, ArrowRight, Mic } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { refineTheme } from '../services/themes'
import { discoverThemes } from '../services/discovery'
import { isSpeechSupported, createRecognizer } from '../services/speech'
import WarmAvatar from './WarmAvatar'
import ThemeSpecificityHint from './ThemeSpecificityHint'
import ThinkingMark from './ThinkingMark'
import RelationPicker from './RelationPicker'
import TextAboutChips, { NarrowerPicks } from './TextAboutChips'
import { haptic } from '../services/haptics'
import { track } from '../services/events'
import { useIsMobile } from '../hooks/useIsMobile'

const INK = '#F5F4EF'
const MUTED = '#8C9AAD'
const ACCENT = '#D3A95C'
const CARD = '#0f2040'
const HAIRLINE = 'rgba(255,255,255,0.08)'

// Quiz-style theme composer, shown right after contacts are added or imported.
// One person per screen; the prompts do the thinking for you — tap one, name
// the specific thing, watch the answers stack up.
const QUESTIONS = [
  (first) => `What do you share with ${first}?`,
  (first) => `What do you and ${first} always end up talking about?`,
  (first) => `What would make you text ${first} first?`,
]

// Each prompt steers toward something Harbored can actually watch — named,
// news-generating entities. `prefill` turns imported data into a one-tap
// answer (their company is the highest-signal trigger we already know).
const PROMPTS = [
  { text: 'Their company',                    category: 'industry', ph: 'e.g. Stripe', prefill: c => c?.company || '' },
  { text: 'A team you both follow',           category: 'sports',   ph: 'e.g. Villanova Basketball' },
  { text: 'A market they watch',              category: 'market',   ph: 'e.g. Minneapolis real estate' },
  { text: 'A place that matters to you both', category: 'place',    ph: 'e.g. Charleston, SC' },
  { text: 'A hobby with a scene',             category: 'hobby',    ph: 'e.g. Formula 1' },
  { text: "What they're trying to break into", category: 'market',  ph: 'e.g. Venture capital' },
]

// Local ids for answers on screen, unique for the life of the page.
let answerSeq = 0
const nextAnswerId = () => `c${++answerSeq}`

// How you know someone puts the likeliest prompt first: their company for a
// coworker or work contact, a team for a teammate, a place for family.
const FIRST_PROMPT = { coworker: 0, work: 0, teammate: 1, family: 3 }
function promptOrder(relation) {
  const lead = FIRST_PROMPT[relation]
  const all = PROMPTS.map((_, i) => i)
  return lead === undefined ? all : [lead, ...all.filter(i => i !== lead)]
}

export default function ThemeComposerModal({ open, contacts = [], onClose }) {
  const addTheme = useDataStore(s => s.addTheme)
  const updateTheme = useDataStore(s => s.updateTheme)
  const setRelation = useDataStore(s => s.setRelation)
  const isMobile = useIsMobile()
  const inputRef = useRef(null)

  const [index, setIndex] = useState(0)
  const [themes, setThemes] = useState([]) // {label, category} for the current contact
  const [label, setLabel] = useState('')
  const [promptIdx, setPromptIdx] = useState(null)
  const [voiceMode, setVoiceMode] = useState('idle') // 'idle' | 'listening' | 'mapping'
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [mapSummary, setMapSummary] = useState('') // post-map receipt: kept + set aside
  const recognizerRef = useRef(null)
  const transcriptRef = useRef('') // mirror for timer callbacks, which see stale state
  const transcriptBoxRef = useRef(null)
  // Themes saved while their refinement was still in flight: cid -> where the
  // saved theme lives, so the refinement can be patched in when it arrives
  // instead of being thrown away with the quiz screen.
  const committedRef = useRef(new Map())
  // A company filled in from the contact card, as long as nobody has edited
  // it: picking another card replaces it instead of typing onto the end of it.
  const prefillRef = useRef('')
  // What this quiz saved, reported to onClose.
  const savedRef = useRef({ themes: 0, people: 0 })

  // The live transcript panel follows the newest words as they stream in.
  useEffect(() => {
    const el = transcriptBoxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript])

  // On the phone the keyboard shrinks the web view (Capacitor Keyboard,
  // native resize), and the quiz body is the part that gives — so the focused
  // input can end up scrolled out of sight below the prompt cards. Whenever
  // the viewport changes while the field has focus, bring it back into view.
  function revealInput() {
    const el = inputRef.current
    if (el && document.activeElement === el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  useEffect(() => {
    const onResize = () => setTimeout(revealInput, 50)
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])

  const current = contacts[index]
  // The person as saved now: "How do you know them" is stored as it's tapped.
  const relation = useDataStore(s => s.contacts.find(c => String(c.id) === String(current?.id))?.relation)
  const total = contacts.length
  const isLast = index >= total - 1
  const category = promptIdx !== null ? PROMPTS[promptIdx].category : 'topic'
  const placeholder = promptIdx !== null ? PROMPTS[promptIdx].ph : 'Name the specific thing…'

  // State starts fresh per batch because AppLayout keys this modal by the batch,
  // so a new import remounts it (no reset-in-effect needed).
  function resetForContact() {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    transcriptRef.current = ''
    prefillRef.current = ''
    setThemes([]); setLabel(''); setPromptIdx(null)
    setVoiceMode('idle'); setTranscript(''); setVoiceError(''); setMapSummary('')
  }

  function pickPrompt(i) {
    setPromptIdx(i)
    const prefill = PROMPTS[i].prefill?.(current) || ''
    const untouched = !label.trim() || (prefillRef.current && label === prefillRef.current)
    if (untouched) {
      setLabel(prefill)
      prefillRef.current = prefill
    }
    inputRef.current?.focus()
  }

  // Add a theme immediately, then refine it in the background: one call turns
  // the raw label into a precise, entity-grounded news query + a plain-English
  // "here's what we'll watch" the user can eyeball before committing.
  async function addThemeWithRefine(l, cat) {
    const cid = nextAnswerId()
    haptic.tick()
    setThemes(t => [...t, { cid, label: l, category: cat, refining: true }])
    const result = await refineTheme(l, { ...current, relation })
    // Already saved (user moved on mid-spinner)? Patch the stored theme.
    const saved = committedRef.current.get(cid)
    if (saved) {
      committedRef.current.delete(cid)
      if (result) updateTheme(saved.contactId, saved.themeId, result.refinement)
      return
    }
    setThemes(t => t.map(x => x.cid === cid ? {
      ...x, refining: false,
      display: result?.display || null,
      refinement: result?.refinement || null,
    } : x))
  }

  function addChip() {
    const l = label.trim()
    if (!l) return
    addThemeWithRefine(l, category)
    setLabel('')
    prefillRef.current = ''
    setPromptIdx(null)
    inputRef.current?.focus()
  }

  // ── "Just talk about them" — voice → transcript → theme extraction ──
  // Dictation-style, like talking to Claude: the take runs until the person
  // taps the mic again (or the OS recognizer ends on its own). No silence
  // timer — an auto-stop after a thinking pause read as "it cut me off".
  function startListening() {
    setVoiceError('')
    setMapSummary('')
    setTranscript('')
    transcriptRef.current = ''
    setVoiceMode('listening')
    recognizerRef.current = createRecognizer({
      onText: (t) => { transcriptRef.current = t; setTranscript(t) },
      onEnd: (finalText) => finishListening(finalText),
      onError: (msg) => {
        setVoiceError(msg); setVoiceMode('idle'); recognizerRef.current = null
      },
    })
    recognizerRef.current.start()
  }

  async function finishListening(finalOverride) {
    if (!recognizerRef.current) return // already finished (mic tap + timer can race)
    const heard = recognizerRef.current.stop() || transcriptRef.current || finalOverride
    recognizerRef.current = null
    const text = (heard || '').trim()
    if (text.length < 12) {
      setVoiceError(text ? "That was too short to map — say a bit more, or type it." : '')
      setVoiceMode('idle')
      return
    }
    // Keep the transcript on screen through mapping — clearing it here made
    // a long take look like it was thrown away ("it just cut off").
    setVoiceMode('mapping')
    setTranscript(text)
    try {
      const existing = new Set(themes.map(t => t.label.toLowerCase()))
      const result = await discoverThemes(text, current?.name, 'description')
      const found = (result.themes || [])
        .filter(t => t.label && !existing.has(t.label.toLowerCase()))
        .slice(0, 5)
      if (found.length === 0) {
        setVoiceError("Nothing watchable in that yet — try naming the specific team, place, or market.")
      } else {
        found.forEach(t => addThemeWithRefine(t.label, t.category || 'hobby'))
        // Say what was heard AND what was deliberately set aside — proof the
        // whole take landed, even the parts that aren't watchable.
        const kept = found.map(t => t.label).join(', ')
        const skipped = (result.skipped || []).slice(0, 3).join(', ')
        setMapSummary(
          `Heard you — watching ${kept}.` + (skipped ? ` Set aside ${skipped} (nothing to watch there).` : '')
        )
      }
    } catch {
      setVoiceError("Couldn't map that just now — try again or type it.")
    } finally {
      setVoiceMode('idle')
      setTranscript('')
      transcriptRef.current = ''
    }
  }

  // Choices shown on an answer card were the person's to change, so saving
  // the screen confirms them. A refinement that lands after the screen is
  // saved is a guess until they confirm it somewhere else.
  function setChoices(cid, textAbout) {
    haptic.tick()
    setThemes(ts => ts.map(x => (x.cid === cid ? { ...x, refinement: { ...x.refinement, textAbout } } : x)))
  }

  // A bare category swapped for one of the narrower subjects offered for it.
  function pickNarrower(t, narrower) {
    setThemes(ts => ts.filter(x => x.cid !== t.cid))
    addThemeWithRefine(narrower, t.category)
  }

  function pickRelation(r) {
    haptic.tick()
    setRelation(current.id, r)
    track('relation_set', { relation: r || 'none', where: 'quiz' })
  }

  // Persist the current contact's themes, plus any text left un-added in the
  // field unless the quiz is being closed (half-typed text isn't an answer).
  function commitCurrent({ includePending = true } = {}) {
    if (!current) return
    const contactId = current.id
    let on = 0, off = 0
    themes.forEach(t => {
      const choices = t.refinement?.textAbout || []
      choices.forEach(c => { if (c.on) on++; else off++ })
      const saved = addTheme(contactId, t.label, t.category, choices.length ? { ...t.refinement, textAboutConfirmed: true } : (t.refinement || {}))
      if (t.refining) committedRef.current.set(t.cid, { contactId, themeId: saved.id })
    })
    if (on + off) track('text_about_saved', { on, off })
    // Text left in the field counts too — saved now, refined in the background.
    const pending = includePending ? label.trim() : ''
    if (pending) {
      const saved = addTheme(contactId, pending, category)
      refineTheme(pending, { ...current, relation }).then(r => { if (r) updateTheme(contactId, saved.id, r.refinement) })
    }
    const count = themes.length + (pending ? 1 : 0)
    if (count) savedRef.current = { themes: savedRef.current.themes + count, people: savedRef.current.people + 1 }
  }

  function advance() {
    haptic.soft()
    if (!isLast) { setIndex(i => i + 1); resetForContact() }
    else { closeAll() }
  }

  function handleSaveNext() { commitCurrent(); advance() }
  function handleSkip() { advance() }
  // Closing keeps what was already added for this person; it used to throw
  // their themes away without asking.
  function handleClose() { commitCurrent({ includePending: false }); closeAll() }

  function closeAll() {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    onClose(savedRef.current)
  }

  if (!open || !current) return null

  const first = current.name.split(' ')[0]
  // While listening, the one-line input shows a rolling tail of the transcript
  // (like dictation), not the whole speech crammed in and clipped.
  const tWords = transcript.split(/\s+/).filter(Boolean)
  const transcriptTail = tWords.length > 8 ? '… ' + tWords.slice(-8).join(' ') : transcript
  const question = QUESTIONS[index % QUESTIONS.length](first)
  const nextFirst = !isLast ? contacts[index + 1]?.name.split(' ')[0] : null

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
            width: '100%', maxWidth: '520px', margin: '0 auto', flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column',
            justifyContent: isMobile ? 'flex-start' : 'center',
            padding: 'calc(env(safe-area-inset-top) + 12px) 24px calc(env(safe-area-inset-bottom) + 16px)',
          }}>

            {/* Top: progress + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              {total > 1 ? (
                <>
                  <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                    {contacts.map((c, i) => (
                      <span key={c.id} style={{
                        height: '5px', borderRadius: '3px',
                        flex: i === index ? 2.2 : 1,
                        background: i < index ? 'rgba(211,169,92,0.6)' : i === index ? ACCENT : 'rgba(211,169,92,0.22)',
                        transition: 'flex 0.25s ease, background 0.2s ease',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: MUTED, flexShrink: 0 }}>{index + 1} of {total}</span>
                </>
              ) : <span style={{ flex: 1 }} />}
              <button
                className="hb-press"
                onClick={handleClose}
                aria-label="Close"
                style={{
                  width: '44px', height: '44px', marginRight: '-12px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', color: MUTED,
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Scrollable quiz body */}
            <div style={{ flex: isMobile ? 1 : '0 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
                <WarmAvatar initials={current.initials} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <h1 className="hb-display" style={{ fontSize: '25px', fontWeight: 500, color: INK, lineHeight: 1.2 }}>
                    {question}
                  </h1>
                  {(current.role || current.company) && (
                    <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>
                      {[current.role, current.company].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>

              {/* How you know them — one optional tap */}
              <div style={{ marginTop: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: MUTED, marginBottom: '8px' }}>How do you know {first}?</div>
                <RelationPicker value={relation} onChange={pickRelation} />
              </div>

              {/* Prompt cards — tap one to spark an answer */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '9px', marginTop: '16px' }}>
                {promptOrder(relation).map((i) => {
                  const p = PROMPTS[i]
                  const on = promptIdx === i
                  return (
                    <button
                      key={p.text}
                      className="hb-press"
                      onClick={() => pickPrompt(i)}
                      style={{
                        minHeight: '48px', padding: '11px 13px', borderRadius: '13px', textAlign: 'left',
                        fontSize: '13px', fontWeight: 600, lineHeight: 1.35, cursor: 'pointer', fontFamily: 'inherit',
                        background: on ? 'rgba(211,169,92,0.12)' : CARD,
                        color: on ? ACCENT : '#C2CBD8',
                        border: `1px solid ${on ? 'rgba(211,169,92,0.5)' : HAIRLINE}`,
                      }}
                    >
                      {p.text}
                    </button>
                  )
                })}
              </div>

              {/* Answer input — mic lives inside it, like dictation */}
              <div style={{ display: 'flex', gap: '9px', alignItems: 'stretch', marginTop: '14px' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <input
                    ref={inputRef}
                    value={voiceMode === 'idle' ? label : transcriptTail}
                    readOnly={voiceMode !== 'idle'}
                    onChange={e => setLabel(e.target.value)}
                    onFocus={() => setTimeout(revealInput, 350)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip() } }}
                    placeholder={
                      voiceMode === 'listening' ? `Listening — talk about ${first}…`
                        : voiceMode === 'mapping' ? 'Mapping what you said…'
                          : placeholder
                    }
                    aria-label="Shared theme"
                    style={{
                      width: '100%', fontSize: '16px', color: INK, fontFamily: 'inherit',
                      padding: isSpeechSupported() ? '13px 46px 13px 14px' : '13px 14px',
                      borderRadius: '13px', outline: 'none', background: CARD, boxSizing: 'border-box',
                      border: `1px solid ${voiceMode === 'listening' ? 'rgba(211,169,92,0.55)' : 'rgba(255,255,255,0.2)'}`,
                      transition: 'border-color 0.2s ease',
                    }}
                  />
                  {isSpeechSupported() && (
                    <button
                      className="hb-press"
                      onClick={() => {
                        if (voiceMode === 'listening') finishListening()
                        else if (voiceMode === 'idle') startListening()
                      }}
                      aria-label={voiceMode === 'listening' ? 'Stop and map what you said' : `Talk about ${first}`}
                      style={{
                        position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                        width: '40px', height: '40px', borderRadius: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: 'none',
                        cursor: voiceMode === 'mapping' ? 'default' : 'pointer',
                        color: voiceMode === 'idle' ? MUTED : ACCENT,
                      }}
                    >
                      {voiceMode === 'mapping' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'hbSpin 1.6s linear infinite' }}>
                          <path d="M12 3v18" /><path d="M3 12h18" /><path d="M5.6 5.6l12.8 12.8" /><path d="M18.4 5.6L5.6 18.4" />
                        </svg>
                      ) : (
                        <Mic style={{ width: 17, height: 17, animation: voiceMode === 'listening' ? 'hbPulse 1.4s ease-in-out infinite' : 'none' }} />
                      )}
                    </button>
                  )}
                </div>
                <button
                  className="hb-press"
                  onClick={addChip}
                  aria-label="Add theme"
                  style={{
                    flexShrink: 0, width: '50px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                    background: label.trim() ? ACCENT : 'rgba(211,169,92,0.12)',
                    color: label.trim() ? '#0a1628' : ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >
                  <Plus style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {/* One quiet line, only before any answers exist */}
              {isSpeechSupported() && voiceMode === 'idle' && themes.length === 0 && !voiceError && (
                <p style={{ fontSize: '12px', color: MUTED, marginTop: '9px', lineHeight: 1.5 }}>
                  Prefer to talk? Tap the mic and just describe {first} &mdash; Harbored maps it.
                </p>
              )}
              {voiceMode === 'listening' && (
                <p style={{ fontSize: '12px', color: ACCENT, marginTop: '9px', lineHeight: 1.5 }}>
                  Take your time &mdash; tap the mic again when you&rsquo;re done and Harbored maps it.
                </p>
              )}
              {/* Everything heard so far, in full — the input only shows the
                  tail, and a long take needs proof it's all being kept. */}
              {voiceMode !== 'idle' && transcript && (
                <div
                  ref={transcriptBoxRef}
                  style={{
                    marginTop: '10px', padding: '10px 12px', maxHeight: '108px', overflowY: 'auto',
                    borderRadius: '10px', background: CARD,
                    borderLeft: `2px solid ${ACCENT}`,
                    opacity: voiceMode === 'mapping' ? 0.85 : 1,
                  }}
                >
                  {voiceMode === 'mapping' && (
                    <ThinkingMark size={12} label={`Mapping what you said about ${first}…`} style={{ marginBottom: '7px' }} labelStyle={{ fontSize: '12px' }} />
                  )}
                  <p style={{ fontSize: '13px', color: '#C2CBD8', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                    {transcript}
                  </p>
                </div>
              )}
              {voiceError && (
                <p style={{ fontSize: '12px', color: '#E8867A', marginTop: '9px', lineHeight: 1.5 }}>{voiceError}</p>
              )}
              {mapSummary && !voiceError && voiceMode === 'idle' && (
                <p style={{ display: 'flex', gap: '7px', fontSize: '12px', color: MUTED, marginTop: '9px', lineHeight: 1.5 }}>
                  <Check style={{ width: 12, height: 12, color: ACCENT, flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ minWidth: 0 }}>{mapSummary}</span>
                </p>
              )}

              <ThemeSpecificityHint label={label} style={{ marginTop: 10 }} />

              {/* Answers so far — each shows what Harbored will actually watch */}
              {themes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                  {themes.some(t => t.refinement?.textAbout?.length) && (
                    <div style={{ fontSize: '13px', fontWeight: 600, color: INK }}>Tap what you&rsquo;d text {first} about.</div>
                  )}
                  {themes.map((t) => (
                    <motion.div
                      key={t.cid}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ padding: '12px 14px', borderRadius: '13px', background: CARD, border: `1px solid ${HAIRLINE}` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <Check style={{ width: 14, height: 14, color: ACCENT, flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: INK, flex: 1, minWidth: 0 }}>{t.label}</span>
                        <button
                          className="hb-press"
                          onClick={() => setThemes(ts => ts.filter(x => x.cid !== t.cid))}
                          aria-label={`Remove ${t.label}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: '4px', display: 'flex', flexShrink: 0 }}
                        >
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                      {t.refining ? (
                        <ThinkingMark
                          size={11}
                          label="Working out what to watch…"
                          style={{ marginTop: '4px' }}
                          labelStyle={{ fontSize: '12px', fontStyle: 'italic' }}
                        />
                      ) : t.refinement?.bare ? (
                        <>
                          <div style={{ fontSize: '12px', color: ACCENT, marginTop: '4px', lineHeight: 1.45 }}>
                            {t.refinement.narrower?.length ? 'Too broad to watch. Pick one to watch instead:' : 'Too broad to watch. Name something more specific instead.'}
                          </div>
                          <NarrowerPicks narrower={t.refinement.narrower} onPick={(n) => pickNarrower(t, n)} style={{ marginTop: '8px' }} />
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px', lineHeight: 1.45 }}>
                            {t.display || "We'll watch this for significant news."}
                          </div>
                          <TextAboutChips
                            choices={t.refinement?.textAbout}
                            onChange={(list) => setChoices(t.cid, list)}
                            noneHint={`Nothing on, so Harbored won't watch ${t.label} for ${first}.`}
                            style={{ marginTop: '9px' }}
                          />
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              <div style={{ flex: isMobile ? 1 : '0 0 auto', minHeight: isMobile ? '16px' : '32px' }} />
            </div>

            {/* Footer — stacked, never crams */}
            <div style={{ flexShrink: 0, paddingTop: '10px' }}>
              <button
                className="hb-cta hb-press"
                onClick={handleSaveNext}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                  width: '100%', height: '54px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0a1628' }}>
                  {isLast ? 'Save & finish' : `Save & next: ${nextFirst}`}
                </span>
                {isLast
                  ? <Check style={{ width: 16, height: 16, color: '#0a1628' }} />
                  : <ArrowRight style={{ width: 16, height: 16, color: '#0a1628' }} />}
              </button>
              <button
                className="hb-press"
                onClick={handleSkip}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', minHeight: '44px', marginTop: '6px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', color: MUTED, fontFamily: 'inherit',
                }}
              >
                {total > 1 ? `Skip ${first} for now` : 'Skip for now'}
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
