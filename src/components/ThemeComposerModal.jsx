import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, ArrowRight } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { apiUrl } from '../lib/apiBase'
import WarmAvatar from './WarmAvatar'
import ThemeSpecificityHint from './ThemeSpecificityHint'

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
  const inputRef = useRef(null)

  const [index, setIndex] = useState(0)
  const [themes, setThemes] = useState([]) // {label, category} for the current contact
  const [label, setLabel] = useState('')
  const [promptIdx, setPromptIdx] = useState(null)

  const current = contacts[index]
  const total = contacts.length
  const isLast = index >= total - 1
  const category = promptIdx !== null ? PROMPTS[promptIdx].category : 'sports'
  const placeholder = promptIdx !== null ? PROMPTS[promptIdx].ph : 'Name the specific thing…'

  // State starts fresh per batch because AppLayout keys this modal by the batch,
  // so a new import remounts it (no reset-in-effect needed).
  function resetForContact() { setThemes([]); setLabel(''); setPromptIdx(null) }

  function pickPrompt(i) {
    setPromptIdx(i)
    const prefill = PROMPTS[i].prefill?.(current)
    if (prefill && !label.trim()) setLabel(prefill)
    inputRef.current?.focus()
  }

  // Add the theme immediately, then refine it in the background: one call turns
  // the raw label into a precise, entity-grounded news query + a plain-English
  // "here's what we'll watch" the user can eyeball before committing.
  async function addChip() {
    const l = label.trim()
    if (!l) return
    const cid = `c${Date.now()}`
    const cat = category
    setThemes(t => [...t, { cid, label: l, category: cat, refining: true }])
    setLabel('')
    setPromptIdx(null)
    inputRef.current?.focus()
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

  // Persist the current contact's themes (plus any text left un-added in the field).
  function commitCurrent() {
    if (!current) return
    const pending = label.trim()
    const all = pending ? [...themes, { label: pending, category }] : themes
    all.forEach(t => addTheme(current.id, t.label, t.category, t.refinement || {}))
  }

  function advance() {
    if (!isLast) { setIndex(i => i + 1); resetForContact() }
    else { onClose() }
  }

  function handleSaveNext() { commitCurrent(); advance() }
  function handleSkip() { advance() }

  if (!open || !current) return null

  const first = current.name.split(' ')[0]
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
                onClick={onClose}
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
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

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

              {/* Answer input */}
              <div style={{ display: 'flex', gap: '9px', alignItems: 'stretch', marginTop: '14px' }}>
                <input
                  ref={inputRef}
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip() } }}
                  placeholder={placeholder}
                  aria-label="Shared theme"
                  style={{
                    flex: 1, minWidth: 0, fontSize: '16px', color: INK, fontFamily: 'inherit',
                    padding: '13px 14px', borderRadius: '13px', border: '1px solid rgba(255,255,255,0.2)',
                    outline: 'none', background: CARD, boxSizing: 'border-box',
                  }}
                />
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
                      <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px', lineHeight: 1.45, fontStyle: t.refining ? 'italic' : 'normal' }}>
                        {t.refining ? 'Working out what to watch…' : (t.display || "We'll watch this for significant news.")}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div style={{ flex: 1, minHeight: '16px' }} />
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
