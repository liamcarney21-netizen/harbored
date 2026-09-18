import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, ArrowRight, Mic } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { apiUrl } from '../lib/apiBase'
import { discoverThemes } from '../services/discovery'
import { isSpeechSupported, createRecognizer } from '../services/speech'
import WarmAvatar from './WarmAvatar'
import ThemeSpecificityHint from './ThemeSpecificityHint'
import ThinkingMark from './ThinkingMark'
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

export default function ThemeComposerModal({ open, contacts = [], onClose }) {
  const addTheme = useDataStore(s => s.addTheme)
  const isMobile = useIsMobile()
  const inputRef = useRef(null)

  const [index, setIndex] = useState(0)
  const [themes, setThemes] = useState([]) // {label, category} for the current contact
  const [label, setLabel] = useState('')
  const [promptIdx, setPromptIdx] = useState(null)
  const [voiceMode, setVoiceMode] = useState('idle') // 'idle' | 'listening' | 'mapping'
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const recognizerRef = useRef(null)
  const transcriptRef = useRef('') // mirror for timer callbacks, which see stale state
  const transcriptBoxRef = useRef(null)

  // The live transcript panel follows the newest words as they stream in.
  useEffect(() => {
    const el = transcriptBoxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript])

  const current = contacts[index]
  const total = contacts.length
  const isLast = index >= total - 1
  const category = promptIdx !== null ? PROMPTS[promptIdx].category : 'sports'
  const placeholder = promptIdx !== null ? PROMPTS[promptIdx].ph : 'Name the specific thing…'

  // State starts fresh per batch because AppLayout keys this modal by the batch,
  // so a new import remounts it (no reset-in-effect needed).
  function resetForContact() {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    transcriptRef.current = ''
    setThemes([]); setLabel(''); setPromptIdx(null)
    setVoiceMode('idle'); setTranscript(''); setVoiceError('')
  }

  function pickPrompt(i) {
    setPromptIdx(i)
    const prefill = PROMPTS[i].prefill?.(current)
    if (prefill && !label.trim()) setLabel(prefill)
    inputRef.current?.focus()
  }

  // Add a theme immediately, then refine it in the background: one call turns
  // the raw label into a precise, entity-grounded news query + a plain-English
  // "here's what we'll watch" the user can eyeball before committing.
  async function addThemeWithRefine(l, cat) {
    const cid = `c${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setThemes(t => [...t, { cid, label: l, category: cat, refining: true }])
    try {
      const resp = await fetch(apiUrl('/api/refine-theme'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: l, contactName: current?.name, contactCompany: current?.company, contactRole: current?.role }),
      })
      const data = resp.ok ? await resp.json() : null
      setThemes(t => t.map(x => x.cid === cid ? {
        ...x, refining: false,
        display: data?.display || null,
        refinement: data ? { query: data.query, entityType: data.entityType, watchFor: data.watchFor } : null,
      } : x))
    } catch {
      setThemes(t => t.map(x => x.cid === cid ? { ...x, refining: false } : x))
    }
  }

  function addChip() {
    const l = label.trim()
    if (!l) return
    addThemeWithRefine(l, category)
    setLabel('')
    setPromptIdx(null)
    inputRef.current?.focus()
  }

  // ── "Just talk about them" — voice → transcript → theme extraction ──
  // Dictation-style, like talking to Claude: the take runs until the person
  // taps the mic again (or the OS recognizer ends on its own). No silence
  // timer — an auto-stop after a thinking pause read as "it cut me off".
  function startListening() {
    setVoiceError('')
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
      const found = ((await discoverThemes(text, current?.name, 'description')).themes || [])
        .filter(t => t.label && !existing.has(t.label.toLowerCase()))
        .slice(0, 5)
      if (found.length === 0) {
        setVoiceError("Nothing watchable in that yet — try naming the specific team, place, or market.")
      } else {
        found.forEach(t => addThemeWithRefine(t.label, t.category || 'hobby'))
      }
    } catch {
      setVoiceError("Couldn't map that just now — try again or type it.")
    } finally {
      setVoiceMode('idle')
      setTranscript('')
      transcriptRef.current = ''
    }
  }

  // Persist the current contact's themes (plus any text left un-added in the field).
  function commitCurrent() {
    if (!current) return
    const pending = label.trim()
    const all = pending ? [...themes, { label: pending, category }] : themes
    all.forEach(t => addTheme(current.id, t.label, t.category, t.refinement || {}))
  }

  function advance() {
    if (!isLast) { setIndex(i => i + 1); resetForContact() }
    else { closeAll() }
  }

  function handleSaveNext() { commitCurrent(); advance() }
  function handleSkip() { advance() }

  function closeAll() {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    onClose()
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
                onClick={closeAll}
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

              {/* Prompt cards — tap one to spark an answer */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '9px', marginTop: '20px' }}>
                {PROMPTS.map((p, i) => {
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

              <ThemeSpecificityHint label={label} style={{ marginTop: 10 }} />

              {/* Answers so far — each shows what Harbored will actually watch */}
              {themes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
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
                      ) : (
                        <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px', lineHeight: 1.45 }}>
                          {t.display || "We'll watch this for significant news."}
                        </div>
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
