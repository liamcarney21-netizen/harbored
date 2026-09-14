import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, X, Check } from 'lucide-react'
import WarmAvatar from '../../components/WarmAvatar'
import { themeUpdates, SIGNIFICANCE_THRESHOLD } from '../../data/commonGround'
import { useDataStore, selectNudges } from '../../store/dataStore'
import { useDemoStore } from '../../store/demoStore'
import { useAuthStore } from '../../store/authStore'
import { fetchLiveUpdates } from '../../services/monitoring'
import { fetchStoredUpdates } from '../../services/scanResults'
import { openSend, sendChannelFor } from '../../services/outreach'
import ThemeSpecificityHint from '../../components/ThemeSpecificityHint'

const INK = '#1B1613'
const MUTED = '#8A7A70'
const ACCENT = '#DE4A2C'
const CARD = '#FFFFFF'
const HAIRLINE = 'rgba(27,22,19,0.1)'

const categoryConfig = {
  sports:   { label: 'Sports' },
  place:    { label: 'Place' },
  market:   { label: 'Market' },
  hobby:    { label: 'Hobby' },
  industry: { label: 'Industry' },
}

// The asterisk mark — doubles as the scanning spinner.
function AsteriskMark({ size = 30, spinning = false }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round"
      style={spinning ? { animation: 'alterSpin 1.6s linear infinite' } : undefined}
    >
      <path d="M12 3v18" /><path d="M3 12h18" />
      <path d="M5.6 5.6l12.8 12.8" /><path d="M18.4 5.6L5.6 18.4" />
    </svg>
  )
}

function Pill({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '9px', alignSelf: 'flex-start',
      background: CARD, borderRadius: '22px', padding: '9px 16px',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />
      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: ACCENT }}>
        {children}
      </span>
    </span>
  )
}

function firstName(name = '') {
  return name.split(' ')[0]
}

export default function CommonGround({ onImportContacts }) {
  const navigate = useNavigate()
  const demoActive = useDemoStore(s => s.active)
  const user = useAuthStore(s => s.user)
  // Signed-in real users read what the scheduled server scan already found;
  // demo mode (no user) keeps its live scan + seed data, untouched.
  const useStored = !!user && !demoActive
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const addTheme = useDataStore(s => s.addTheme)
  const removeTheme = useDataStore(s => s.removeTheme)
  const recordTouch = useDataStore(s => s.recordTouch)
  // Derived per render (not a subscribed selector — it returns a fresh array)
  const nudges = selectNudges({ contacts })

  const [view, setView] = useState('today') // 'today' | 'themes'
  const [selected, setSelected] = useState(null) // { kind, update?, nudge? }
  const [msgText, setMsgText] = useState('')
  const [sent, setSent] = useState([])
  const [dismissed, setDismissed] = useState([])
  const [addingFor, setAddingFor] = useState(null)
  const [newThemeLabel, setNewThemeLabel] = useState('')
  const [newThemeCategory, setNewThemeCategory] = useState('sports')
  const [liveUpdates, setLiveUpdates] = useState([])
  const [storedUpdates, setStoredUpdates] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scannedAt, setScannedAt] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const deckRef = useRef(null)

  async function scan() {
    setScanning(true)
    try {
      const updates = await fetchLiveUpdates(contacts, themesByContact, { maxThemes: 6 })
      setLiveUpdates(updates)
      setScannedAt(new Date())
    } finally {
      setScanning(false)
    }
  }

  // Real users: load the server's stored scan results. If there are none yet
  // (never scanned, or a brand-new account), fall back to a live scan so the
  // page is never empty on first open.
  async function loadStored() {
    setScanning(true)
    try {
      const stored = await fetchStoredUpdates(contacts)
      setStoredUpdates(stored)
      if (stored.length === 0) {
        const updates = await fetchLiveUpdates(contacts, themesByContact, { maxThemes: 6 })
        setLiveUpdates(updates)
        setScannedAt(new Date())
      }
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (useStored) loadStored()
    else scan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allUpdates = useStored
    ? (liveUpdates.length > 0 ? liveUpdates : storedUpdates)
    : [...liveUpdates, ...themeUpdates]
  const opportunities = allUpdates.filter(u => u.score >= SIGNIFICANCE_THRESHOLD && !dismissed.includes(u.id) && !sent.includes(u.id))
  const giveables = allUpdates.filter(u => u.score < SIGNIFICANCE_THRESHOLD && u.giveable && !dismissed.includes(u.id) && !sent.includes(u.id))
  const themeCount = Object.values(themesByContact).reduce((n, t) => n + t.length, 0)

  // The queue: every kind of reason becomes one full-screen card.
  const queue = [
    ...opportunities.map(u => ({ kind: 'news', id: `n-${u.id}`, update: u })),
    ...giveables.map(u => ({ kind: 'favor', id: `f-${u.id}`, update: u })),
    ...nudges.slice(0, 2).map(n => ({ kind: 'drift', id: `d-${n.contact.id}`, nudge: n })),
  ]

  function openReason(r) {
    if (r.kind === 'drift') {
      setSelected(r)
      setMsgText(r.nudge.opener)
    } else {
      setSelected(r)
      setMsgText(r.kind === 'favor' ? r.update.giveMessage : r.update.draftMessage)
    }
  }

  function draftContact() {
    if (!selected) return null
    if (selected.kind === 'drift') return selected.nudge.contact
    return contacts.find(c => c.id === selected.update.contactId)
  }

  function handleSend() {
    const contact = draftContact()
    if (selected.kind === 'drift') {
      const channel = openSend(contact, msgText, 'Checking in')
      recordTouch(contact.id, {
        channel: channel || 'email',
        message: msgText,
        trigger: `Reconnect nudge — ${selected.nudge.health.days} days quiet`,
      })
    } else {
      const u = selected.update
      const isFavor = selected.kind === 'favor'
      const body = isFavor && u.link ? `${msgText}\n\n${u.link}` : msgText
      const channel = contact ? openSend(contact, body, isFavor ? "Thought you'd want to see this" : 'Saw this and thought of you') : null
      recordTouch(u.contactId, {
        channel: channel || 'email',
        message: msgText,
        trigger: isFavor ? `Shared as a favor: ${u.headline}` : u.headline,
      })
      setSent(prev => [...prev, u.id])
    }
    setSelected(null)
  }

  function handleSkip() {
    if (selected.kind !== 'drift') setDismissed(prev => [...prev, selected.update.id])
    setSelected(null)
  }

  function confirmAddTheme(contactId) {
    const label = newThemeLabel.trim()
    if (!label) return
    addTheme(contactId, label, newThemeCategory)
    setAddingFor(null)
    setNewThemeLabel('')
  }

  function onDeckScroll() {
    const el = deckRef.current
    if (!el || !el.clientWidth) return
    setActiveIdx(Math.min(queue.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))))
  }

  function jumpTo(i) {
    const el = deckRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  const selContact = draftContact()
  const selChannel = selContact ? sendChannelFor(selContact) : null
  const sendLabel = selChannel === 'sms' ? 'OPEN IN MESSAGES' : selChannel === 'email' ? 'OPEN IN MAIL' : 'SEND IT'
  const queuePos = selected ? queue.findIndex(r => r.id === selected.id) : -1

  // ── Themes management ──────────────────────────────────────────────
  if (view === 'themes') {
    const monitored = contacts.filter(c => (themesByContact[c.id] || []).length > 0 || addingFor === c.id)
    const unmonitored = contacts.filter(c => (themesByContact[c.id] || []).length === 0 && addingFor !== c.id)
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '18px 24px 32px' }}>
        <button
          className="alter-press"
          onClick={() => setView('today')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', minHeight: '44px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '12px', color: MUTED, fontFamily: 'inherit',
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} /> today
        </button>
        <h1 className="alter-display" style={{ fontSize: '38px', fontWeight: 500, color: INK, lineHeight: 1, margin: '10px 0 6px' }}>
          Themes.
        </h1>
        <p style={{ fontSize: '12px', color: MUTED, marginBottom: '22px' }}>
          {themeCount} watched &middot; you only hear when one clears the bar
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {monitored.map(c => {
            const themes = themesByContact[c.id] || []
            return (
              <div key={c.id} style={{ background: CARD, borderRadius: '20px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '14px' }}>
                  <WarmAvatar initials={c.initials} size="md" />
                  <div className="alter-display" style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.03em', color: INK }}>
                    {c.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {themes.map(t => (
                    <span key={t.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '7px 13px', borderRadius: '20px', fontSize: '11px',
                      background: '#F4EDE6', color: INK,
                    }}>
                      {t.label}
                      <button
                        className="alter-press"
                        onClick={() => removeTheme(c.id, t.id)}
                        aria-label={`Stop watching ${t.label}`}
                        style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: MUTED }}
                      >
                        <X style={{ width: 11, height: 11 }} />
                      </button>
                    </span>
                  ))}
                  {addingFor === c.id ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxWidth: '100%',
                      padding: '5px 6px 5px 13px', borderRadius: '20px',
                      background: '#F4EDE6', border: `1px solid ${ACCENT}`,
                    }}>
                      <input
                        autoFocus
                        type="text"
                        value={newThemeLabel}
                        onChange={e => setNewThemeLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmAddTheme(c.id); if (e.key === 'Escape') setAddingFor(null) }}
                        placeholder="e.g. Villanova Basketball"
                        aria-label="New shared theme"
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          fontSize: '16px', color: INK, width: '170px', maxWidth: '46vw', minWidth: 0, fontFamily: 'inherit',
                        }}
                      />
                      <select
                        value={newThemeCategory}
                        onChange={e => setNewThemeCategory(e.target.value)}
                        aria-label="Theme category"
                        style={{
                          background: CARD, border: `1px solid ${HAIRLINE}`,
                          borderRadius: '6px', color: MUTED, fontSize: '16px', padding: '3px 4px',
                          outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {Object.entries(categoryConfig).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                      <button
                        className="alter-press"
                        onClick={() => confirmAddTheme(c.id)}
                        aria-label="Confirm new theme"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: ACCENT, color: '#FFF6F0', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <Check style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        className="alter-press"
                        onClick={() => setAddingFor(null)}
                        aria-label="Cancel adding theme"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: 'none', color: MUTED, border: 'none', cursor: 'pointer',
                        }}
                      >
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                      <ThemeSpecificityHint label={newThemeLabel} style={{ flexBasis: '100%', margin: '2px 0 0' }} />
                    </span>
                  ) : (
                    <button
                      className="alter-press"
                      onClick={() => { setAddingFor(c.id); setNewThemeLabel(''); setNewThemeCategory('sports') }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '7px 13px', borderRadius: '20px', fontSize: '11px',
                        background: 'none', color: MUTED, fontFamily: 'inherit',
                        border: `1px dashed ${MUTED}`, cursor: 'pointer',
                      }}
                    >
                      <Plus style={{ width: 11, height: 11 }} /> add theme
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {unmonitored.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: MUTED }}>start watching:</span>
            <select
              value=""
              onChange={e => { if (e.target.value) { setAddingFor(Number(e.target.value)); setNewThemeLabel(''); } }}
              aria-label="Pick a contact to add themes for"
              style={{
                background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '10px',
                color: INK, fontSize: '16px', padding: '9px 10px', outline: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="">choose a person&hellip;</option>
              {unmonitored.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  // ── Today ──────────────────────────────────────────────────────────
  return (
    <div style={{
      flex: '1 1 0', minHeight: 0, width: '100%', maxWidth: '520px', alignSelf: 'center',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* Segmented progress — one segment per reason */}
      {queue.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px 0', flexShrink: 0 }}>
          {queue.map((r, i) => (
            <button
              key={r.id}
              className="alter-press"
              onClick={() => jumpTo(i)}
              aria-label={`Reason ${i + 1}`}
              style={{
                height: '7px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0,
                flex: i === activeIdx ? 2.2 : 1,
                background: i === activeIdx ? ACCENT : 'rgba(222,74,44,0.18)',
                transition: 'flex 0.25s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* The deck — swipe between reasons */}
      {queue.length > 0 ? (
        <div ref={deckRef} className="alter-deck" onScroll={onDeckScroll} style={{ flex: 1, minHeight: 0 }}>
          {queue.map((r, i) => {
            const u = r.update
            const contact = r.kind === 'drift' ? r.nudge.contact : contacts.find(c => c.id === u.contactId)
            const headline = r.kind === 'drift'
              ? `It's been ${r.nudge.health.days} days quiet with ${firstName(r.nudge.contact.name)}.`
              : u.headline
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', padding: '0 24px', overflowY: 'auto' }}>
                <div style={{ marginTop: '20px' }}>
                  <Pill>
                    {r.kind === 'news' && `REASON ${String(i + 1).padStart(2, '0')} / ${String(queue.length).padStart(2, '0')}`}
                    {r.kind === 'favor' && 'A FAVOR TO SEND'}
                    {r.kind === 'drift' && 'DRIFTING'}
                  </Pill>
                </div>
                <h1 className="alter-display" style={{
                  fontSize: headline.length > 70 ? '30px' : '38px',
                  fontWeight: 500, color: INK, lineHeight: 1.08, margin: '16px 0 0',
                }}>
                  {headline}
                </h1>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#4A403A', marginTop: '16px' }}>
                  {r.kind === 'news' && `Big news on the theme you share with ${firstName(u.contactName)}. ${u.source ? `${u.source}, ${u.time}.` : ''}`}
                  {r.kind === 'favor' && `Below the bar, but useful to ${firstName(u.contactName)} — a no-ask favor.`}
                  {r.kind === 'drift' && 'No news needed — a two-line check-in keeps it warm.'}
                </p>
                <button
                  className="alter-press"
                  onClick={() => contact && navigate(`/dashboard/contact/${contact.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
                    background: CARD, border: 'none', borderRadius: '18px', padding: '13px 16px',
                    marginTop: '22px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <WarmAvatar initials={r.kind === 'drift' ? r.nudge.contact.initials : u.contactInitials} size="md" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span className="alter-display" style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '0.03em', color: INK }}>
                      {contact ? contact.name : (u ? u.contactName : '')}
                    </span>
                    <span style={{ fontSize: '11px', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.kind === 'drift'
                        ? `last touch ${r.nudge.health.days} days ago`
                        : `${(u.themeLabel || '').toLowerCase()} · shared theme`}
                    </span>
                  </div>
                </button>

                <div style={{ flex: 1, minHeight: '18px' }} />

                <button
                  className="alter-cta alter-press"
                  onClick={() => openReason(r)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    height: '56px', borderRadius: '28px', border: 'none', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span className="alter-display" style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '0.08em', color: '#FFF6F0' }}>
                    {r.kind === 'favor' ? 'SEND THE FAVOR' : 'REVIEW THE DRAFT'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </button>
                <div style={{ fontSize: '11px', color: MUTED, textAlign: 'center', margin: '10px 0 14px', flexShrink: 0 }}>
                  drafted for you &mdash; nothing sends itself
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Empty states — scanning, no contacts, or genuinely all quiet.
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: '16px' }}>
          <AsteriskMark size={34} spinning={scanning} />
          {contacts.length === 0 ? (
            <>
              <h1 className="alter-display" style={{ fontSize: '36px', fontWeight: 500, color: INK, lineHeight: 1.08 }}>
                Bring in your people.
              </h1>
              <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#4A403A' }}>
                Import your contacts, tell Harbored what you share, and it watches for real reasons to reach out.
              </p>
              <button
                className="alter-cta alter-press"
                onClick={onImportContacts}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '56px', borderRadius: '28px', border: 'none', cursor: 'pointer',
                  padding: '0 32px', marginTop: '8px',
                }}
              >
                <span className="alter-display" style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '0.08em', color: '#FFF6F0' }}>
                  IMPORT FROM CONTACTS
                </span>
              </button>
            </>
          ) : (
            <>
              <h1 className="alter-display" style={{ fontSize: '36px', fontWeight: 500, color: INK, lineHeight: 1.08 }}>
                {scanning ? 'Scanning your themes.' : 'All quiet.'}
              </h1>
              <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#4A403A' }}>
                {scanning
                  ? 'Checking the news on everything you share.'
                  : `Harbored is watching ${themeCount} theme${themeCount === 1 ? '' : 's'} across ${contacts.length} people. You'll hear when something clears the bar.`}
              </p>
            </>
          )}
        </div>
      )}

      {/* Quiet footer — themes + scan, mono, out of the way */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px',
        padding: '0 24px 12px', flexShrink: 0, fontSize: '11px', color: MUTED,
      }}>
        <button
          className="alter-press"
          onClick={() => setView('themes')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontFamily: 'inherit', fontSize: '11px', textDecoration: 'underline', minHeight: '32px' }}
        >
          manage themes
        </button>
        <span style={{ opacity: 0.5 }}>&middot;</span>
        <button
          className="alter-press"
          onClick={scan}
          disabled={scanning}
          style={{ background: 'none', border: 'none', cursor: scanning ? 'default' : 'pointer', color: MUTED, fontFamily: 'inherit', fontSize: '11px', textDecoration: 'underline', minHeight: '32px' }}
        >
          {scanning ? 'scanning…' : (scannedAt ? `updated ${scannedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}` : 'scan now')}
        </button>
      </div>

      {/* ── Draft screen — full-screen takeover ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="alter-app"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              width: '100%', maxWidth: '520px', margin: '0 auto', flex: 1, minHeight: 0,
              display: 'flex', flexDirection: 'column', overflowY: 'auto',
              padding: 'calc(env(safe-area-inset-top) + 16px) 24px calc(env(safe-area-inset-bottom) + 16px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <button
                  className="alter-press"
                  onClick={() => setSelected(null)}
                  aria-label="Back"
                  style={{
                    width: '44px', height: '44px', marginLeft: '-12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer', color: INK,
                  }}
                >
                  <ChevronLeft style={{ width: 22, height: 22 }} />
                </button>
                {queuePos >= 0 && (
                  <span style={{ fontSize: '11px', color: MUTED }}>
                    reason {String(queuePos + 1).padStart(2, '0')} / {String(queue.length).padStart(2, '0')}
                  </span>
                )}
              </div>

              <div style={{ marginTop: '14px' }}><AsteriskMark /></div>

              <h1 className="alter-display" style={{ fontSize: '38px', fontWeight: 500, color: INK, lineHeight: 1.05, margin: '14px 0 0' }}>
                To {selContact ? firstName(selContact.name) : 'them'}.
              </h1>
              <p style={{ fontSize: '12px', color: MUTED, marginTop: '10px', lineHeight: 1.6 }}>
                {selected.kind === 'drift'
                  ? 'no news — just a check-in'
                  : `re: ${selected.update.headline}`}
              </p>

              <div style={{ background: CARD, borderRadius: '20px', padding: '20px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  rows={Math.min(12, Math.max(4, Math.ceil(msgText.length / 28)))}
                  aria-label="Your draft message"
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', fontSize: '14px', lineHeight: 1.7, color: INK,
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: MUTED }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /></svg>
                  tap the text to edit
                </div>
              </div>

              <div style={{ flex: 1, minHeight: '18px' }} />

              <button
                className="alter-cta alter-press"
                onClick={handleSend}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  height: '56px', borderRadius: '28px', border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4L11 14" /><path d="M21 4l-6.5 17-3.5-7-7-3.5z" /></svg>
                <span className="alter-display" style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '0.08em', color: '#FFF6F0' }}>
                  {sendLabel}
                </span>
              </button>
              <button
                className="alter-press"
                onClick={handleSkip}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '50px', borderRadius: '25px', marginTop: '10px', flexShrink: 0,
                  background: 'none', border: `1.5px solid rgba(27,22,19,0.25)`, cursor: 'pointer',
                }}
              >
                <span className="alter-display" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.08em', color: INK }}>
                  SKIP THIS ONE
                </span>
              </button>
              <div style={{ fontSize: '11px', color: MUTED, textAlign: 'center', marginTop: '12px', flexShrink: 0 }}>
                harbored drafts &mdash; it never sends
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
