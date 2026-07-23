import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, ArrowRight } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { apiUrl } from '../lib/apiBase'
import Avatar from './Avatar'
import ThemeSpecificityHint from './ThemeSpecificityHint'

// Dedicated, multi-add theme picker shown right after a contact is added or
// imported — so people start monitored instead of empty. Steps through one or
// many new contacts. Category colors mirror CommonGround's categoryConfig.
const CATEGORIES = [
  { key: 'sports',   label: 'Sports',   color: '#2E7D5B', bg: 'rgba(46,125,91,0.08)' },
  { key: 'place',    label: 'Place',    color: '#0D5C63', bg: 'rgba(13,92,99,0.08)' },
  { key: 'market',   label: 'Market',   color: '#A97E2F', bg: 'rgba(169,126,47,0.08)' },
  { key: 'hobby',    label: 'Hobby',    color: '#6E5A8E', bg: 'rgba(110,90,142,0.08)' },
  { key: 'industry', label: 'Industry', color: '#A65B33', bg: 'rgba(166,91,51,0.08)' },
]
const catOf = key => CATEGORIES.find(c => c.key === key) || CATEGORIES[0]

export default function ThemeComposerModal({ open, contacts = [], onClose }) {
  const addTheme = useDataStore(s => s.addTheme)
  const inputRef = useRef(null)

  const [index, setIndex] = useState(0)
  const [themes, setThemes] = useState([]) // {label, category} for the current contact
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('sports')

  const current = contacts[index]
  const total = contacts.length
  const isLast = index >= total - 1

  // State starts fresh per batch because AppLayout keys this modal by the batch,
  // so a new import remounts it (no reset-in-effect needed).
  function resetForContact() { setThemes([]); setLabel(''); setCategory('sports') }

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

  const primaryLabel = isLast ? 'Save & finish' : 'Save & next'

  return (
    <AnimatePresence>
      {open && current && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(29,34,38,0.5)', backdropFilter: 'blur(3px)' }}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 71, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px', pointerEvents: 'none',
          }}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              style={{
                pointerEvents: 'auto',
                width: 'min(480px, 100%)', maxHeight: '100%', overflowY: 'auto',
                background: '#FFFFFF', borderRadius: '16px',
                boxShadow: '0 14px 44px -8px rgba(28,43,51,0.24), 0 3px 10px rgba(28,43,51,0.10)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #EEEBE3' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  {total > 1
                    ? <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5C6B73' }}>Contact {index + 1} of {total}</span>
                    : <span />}
                  <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C6B73', padding: 4 }}>
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={current.initials} color={current.color} size="md" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 19, fontWeight: 600, color: '#1C2B33', lineHeight: 1.15 }}>
                      What do you share with {current.name.split(' ')[0]}?
                    </div>
                    {(current.role || current.company) && (
                      <div style={{ fontSize: 12.5, color: '#5C6B73', marginTop: 2 }}>
                        {[current.role, current.company].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 24px 22px' }}>
                <p style={{ fontSize: 13, color: '#5C6B73', lineHeight: 1.55, margin: '0 0 16px' }}>
                  Teams, cities, markets, hobbies. Harbored watches these and tells you the moment
                  there's a real reason to reach out — so name the <em>specific</em> thing: the
                  company, the team, the place.
                </p>

                {/* Added themes — each shows what Harbored will actually watch, so
                    the user can confirm we resolved the right thing before saving. */}
                {themes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {themes.map((t) => {
                      const c = catOf(t.category)
                      return (
                        <div key={t.cid} style={{ padding: '10px 12px', borderRadius: 10, background: c.bg, border: `1px solid ${c.color}33` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: c.color }}>{t.label}</span>
                            <button onClick={() => setThemes(ts => ts.filter(x => x.cid !== t.cid))} aria-label={`Remove ${t.label}`}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, padding: 0, display: 'flex', flexShrink: 0 }}>
                              <X style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                          <div style={{ fontSize: 12, color: '#5C6B73', marginTop: 3, lineHeight: 1.45, fontStyle: t.refining ? 'italic' : 'normal' }}>
                            {t.refining ? 'Working out what to watch…' : (t.display || "We'll watch this for significant news.")}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Input row */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <input
                    ref={inputRef}
                    autoFocus
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip() } }}
                    placeholder="e.g. Villanova Basketball"
                    aria-label="Shared theme"
                    style={{
                      flex: 1, minWidth: 0, fontSize: 16, color: '#1C2B33', fontFamily: 'Inter, sans-serif',
                      padding: '10px 12px', borderRadius: 8, border: '1px solid #D6D1C5', outline: 'none', background: '#FFFFFF',
                    }}
                  />
                  <button onClick={addChip} aria-label="Add theme" style={{
                    flexShrink: 0, padding: '0 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(13,92,99,0.1)', color: '#0D5C63', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plus style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <ThemeSpecificityHint label={label} style={{ marginTop: 10 }} />

                {/* Category picker */}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
                  {CATEGORIES.map(c => {
                    const on = category === c.key
                    return (
                      <button key={c.key} onClick={() => setCategory(c.key)} style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        background: on ? c.bg : 'transparent', color: on ? c.color : '#5C6B73',
                        border: `1px solid ${on ? c.color + '55' : '#DEDACF'}`,
                      }}>
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderTop: '1px solid #EEEBE3' }}>
                <button onClick={handleSkip}
                  style={{ padding: '10px 8px', background: 'none', border: 'none', color: '#5C6B73', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {total > 1 ? 'Skip this contact' : 'Skip for now'}
                </button>
                <button onClick={handleSaveNext}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, background: '#0D5C63', color: '#FFFFFF', border: 'none',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}>
                  {isLast ? <Check style={{ width: 14, height: 14 }} /> : null}
                  {primaryLabel}
                  {!isLast ? <ArrowRight style={{ width: 14, height: 14 }} /> : null}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
