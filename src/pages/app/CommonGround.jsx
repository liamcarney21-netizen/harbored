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
import StreamText from '../../components/StreamText'
import WhyDisclosure from '../../components/WhyDisclosure'
import ScanNarration from '../../components/ScanNarration'
import ThinkingMark from '../../components/ThinkingMark'
import { haptic } from '../../services/haptics'
import { useIsMobile } from '../../hooks/useIsMobile'
import { isNative } from '../../lib/platform'
import { apiUrl } from '../../lib/apiBase'

const INK = '#F5F4EF'
const MUTED = '#8C9AAD'
const ACCENT = '#D3A95C'
const CARD = '#0f2040'
const HAIRLINE = 'rgba(255,255,255,0.08)'

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
      style={spinning ? { animation: 'hbSpin 1.6s linear infinite' } : undefined}
    >
      <path d="M12 3v18" /><path d="M3 12h18" />
      <path d="M5.6 5.6l12.8 12.8" /><path d="M18.4 5.6L5.6 18.4" />
    </svg>
  )
}

function firstName(name = '') {
  return name.split(' ')[0]
}

// Newspaper-style headline: keep the tight first clause up top; the clause
// after an em-dash/colon becomes the deck line under it.
function splitHeadline(h = '') {
  const m = h.match(/\s+(?:—|–|\|)\s+|:\s+/)
  if (m && m.index >= 24) {
    const rest = h.slice(m.index + m[0].length)
    return { head: h.slice(0, m.index), rest: rest.charAt(0).toUpperCase() + rest.slice(1) }
  }
  return { head: h, rest: '' }
}

function clip(text = '', n = 130) {
  return text.length > n ? text.slice(0, n).replace(/\s+\S*$/, '') + '…' : text
}

export default function CommonGround({ onImportContacts }) {
  const navigate = useNavigate()
  // Phone: the CTA pins to the thumb zone at the bottom of the card.
  // Desktop: content flows naturally — no stretched dead zone.
  const isMobile = useIsMobile()
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
  // One-time swipe affordance — gone forever after the first real swipe.
  const [neverScanned, setNeverScanned] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try { return localStorage.getItem('harbored_swiped') !== 'true' } catch { return false }
  })
  const deckRef = useRef(null)
  // Mirrors activeIdx for scroll/touch handlers, which see stale state.
  const activeIdxRef = useRef(0)
  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])

  // The drafted message writes itself in when the draft screen opens; a tap
  // (or the end of the stream) turns it into the editable textarea.
  const [draftStreaming, setDraftStreaming] = useState(false)
  const [redrafting, setRedrafting] = useState(false)
  const [angleIdx, setAngleIdx] = useState(0)

  // Pull-to-refresh (phone): drag Today down to run a fresh scan.
  const [pull, setPull] = useState(0)
  const [pulling, setPulling] = useState(false)
  const [ptrRefreshing, setPtrRefreshing] = useState(false)
  const ptrGesture = useRef({ startY: 0, startX: 0, engaged: false, canPull: false })

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
        // The server has never scanned for this account — day one.
        setNeverScanned(true)
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

  // Publish the lead reason to the home-screen widget (native only) through
  // the shared app group. The widget re-reads it on its own timeline.
  const leadId = queue[0]?.id
  useEffect(() => {
    if (!isNative() || demoActive) return
    import('@capacitor/preferences').then(({ Preferences }) => {
      const r = queue[0]
      if (!r) { Preferences.remove({ key: 'widget_today' }); return }
      const u = r.update
      const payload = r.kind === 'drift'
        ? {
          kicker: 'Drifting',
          headline: `It's been ${r.nudge.health.days} days quiet with ${r.nudge.contact.name.split(' ')[0]}.`,
          name: r.nudge.contact.name,
        }
        : {
          kicker: r.kind === 'favor'
            ? ['A favor to send', u.themeLabel].filter(Boolean).join(' · ')
            : (u.headsUp ? `Heads-up · ${u.headsUp}` : u.themeLabel || ''),
          headline: u.headline,
          name: u.contactName,
        }
      Preferences.set({ key: 'widget_today', value: JSON.stringify({ ...payload, updatedAt: Date.now() }) })
    }).catch(() => {})
  }, [leadId]) // eslint-disable-line react-hooks/exhaustive-deps

  // iOS mandatory scroll-snap only re-engages on touch, so when the queue
  // changes (a reason sent/dismissed, live updates landing) or the viewport
  // resizes, the deck can rest between cards — showing 3/4 of one and a
  // sliver of the next. Snapping only on queue-length changes wasn't enough
  // (the deck sat off-center "for a while" on device when updates landed
  // mid-swipe), so also watch the scroll itself: any time scrolling settles
  // away from a card boundary while no finger is down, glide to the nearest
  // card.
  const queueKey = queue.map(r => r.id).join('|')
  useEffect(() => {
    const el = deckRef.current
    if (!el) return
    let touching = false
    let timer
    const snap = (smooth) => {
      if (touching || !el.clientWidth) return
      const i = Math.min(queue.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
      const target = i * el.clientWidth
      if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' })
    }
    const settle = () => { clearTimeout(timer); timer = setTimeout(() => snap(true), 180) }
    const touchStart = () => { touching = true; clearTimeout(timer) }
    const touchEnd = () => { touching = false; settle() }
    snap(false)
    el.addEventListener('scroll', settle, { passive: true })
    el.addEventListener('touchstart', touchStart, { passive: true })
    el.addEventListener('touchend', touchEnd, { passive: true })
    el.addEventListener('touchcancel', touchEnd, { passive: true })
    window.addEventListener('resize', settle)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('scroll', settle)
      el.removeEventListener('touchstart', touchStart)
      el.removeEventListener('touchend', touchEnd)
      el.removeEventListener('touchcancel', touchEnd)
      window.removeEventListener('resize', settle)
    }
  }, [queueKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function openReason(r) {
    haptic.soft()
    setAngleIdx(0)
    setDraftStreaming(true)
    if (r.kind === 'drift') {
      setSelected(r)
      setMsgText(r.nudge.opener)
    } else {
      setSelected(r)
      setMsgText(r.kind === 'favor' ? r.update.giveMessage : r.update.draftMessage)
    }
  }

  // "Try another angle" — rewrite the current draft in the next voice from
  // the rotation. The new text streams in like the first draft did.
  const ANGLE_ROTATION = ['warmer', 'shorter', 'curious']
  async function handleRedraft() {
    if (!selected || redrafting) return
    setRedrafting(true)
    try {
      const u = selected.update
      const contact = draftContact()
      const resp = await fetch(apiUrl('/api/redraft'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contactName: contact?.name || u?.contactName || '',
          headline: u?.headline || '',
          themeLabel: u?.themeLabel || '',
          kind: selected.kind,
          current: msgText,
          angle: ANGLE_ROTATION[angleIdx % ANGLE_ROTATION.length],
        }),
      })
      const body = await resp.json()
      if (resp.ok && body.message) {
        setAngleIdx(i => i + 1)
        setMsgText(body.message)
        setDraftStreaming(true)
        haptic.tick()
      }
    } catch {
      // keep the current draft — a failed rewrite should be invisible
    } finally {
      setRedrafting(false)
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
    haptic.success()
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
    if (showSwipeHint && el.scrollLeft > 40) {
      setShowSwipeHint(false)
      try { localStorage.setItem('harbored_swiped', 'true') } catch { /* private mode */ }
    }
    const idx = Math.min(queue.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
    // A tick the moment the deck lands on a different reason — the page turn.
    if (idx !== activeIdxRef.current) haptic.tick()
    setActiveIdx(idx)
  }

  // ── Pull-to-refresh (phone) ────────────────────────────────────────
  // Drag down from the top of a card (or an empty state) and the asterisk
  // winds up with the pull; release past the threshold to run a fresh scan.
  // A mostly-horizontal drag is a deck swipe and never engages it.
  function activeCardAtTop() {
    const el = deckRef.current
    if (!el) return true // empty states: nothing scrolls
    const card = el.children[activeIdxRef.current]
    return !card || card.scrollTop <= 0
  }
  function onPtrStart(e) {
    if (!isMobile || ptrRefreshing || selected) return
    const t = e.touches[0]
    ptrGesture.current = { startY: t.clientY, startX: t.clientX, engaged: false, canPull: activeCardAtTop() }
  }
  function onPtrMove(e) {
    const g = ptrGesture.current
    if (!isMobile || ptrRefreshing || selected || !g.canPull) return
    const t = e.touches[0]
    const dy = t.clientY - g.startY
    const dx = t.clientX - g.startX
    if (!g.engaged) {
      if (dy > 14 && Math.abs(dy) > Math.abs(dx) * 1.4) { g.engaged = true; setPulling(true) }
      else if (Math.abs(dx) > 12 || dy < -8) { g.canPull = false; return }
      else return
    }
    setPull(Math.min(110, Math.max(0, (dy - 14) * 0.55)))
  }
  async function onPtrEnd() {
    const g = ptrGesture.current
    if (!g.engaged) { setPull(0); setPulling(false); return }
    g.engaged = false
    setPulling(false)
    if (pull >= 62) {
      haptic.tick()
      setPtrRefreshing(true)
      setPull(62)
      try { if (useStored) { await loadStored() } else { await scan() } }
      finally { setPtrRefreshing(false); setPull(0) }
    } else {
      setPull(0)
    }
  }

  function jumpTo(i) {
    const el = deckRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  const selContact = draftContact()
  const selChannel = selContact ? sendChannelFor(selContact) : null
  const sendLabel = selChannel === 'sms' ? 'Open in Messages' : selChannel === 'email' ? 'Open in Mail' : 'Send it'
  const queuePos = selected ? queue.findIndex(r => r.id === selected.id) : -1

  // ── Themes management ──────────────────────────────────────────────
  if (view === 'themes') {
    const monitored = contacts.filter(c => (themesByContact[c.id] || []).length > 0 || addingFor === c.id)
    const unmonitored = contacts.filter(c => (themesByContact[c.id] || []).length === 0 && addingFor !== c.id)
    return (
      // Phone: one column. Desktop: title + controls left, theme cards right.
      <div style={isMobile
        ? { maxWidth: '620px', margin: '0 auto', padding: '18px 24px 32px' }
        : {
          display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '64px', alignItems: 'start',
          width: '100%', maxWidth: '1120px', margin: '0 auto', padding: '40px 48px 48px',
        }}>
        <div>
        <button
          className="hb-press"
          onClick={() => setView('today')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', minHeight: '44px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '12px', color: MUTED, fontFamily: 'inherit',
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} /> Today
        </button>
        <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.1, margin: '10px 0 6px' }}>
          Themes
        </h1>
        <p style={{ fontSize: '13px', color: MUTED, marginBottom: '22px' }}>
          {themeCount} watched &middot; You only hear when one clears the bar
        </p>
        </div>

        <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {monitored.map(c => {
            const themes = themesByContact[c.id] || []
            return (
              <div key={c.id} style={{ background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '14px' }}>
                  <WarmAvatar initials={c.initials} size="md" />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: INK }}>
                    {c.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {themes.map(t => (
                    <span key={t.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '7px 13px', borderRadius: '20px', fontSize: '11px',
                      background: '#1a3558', color: '#C2CBD8',
                    }}>
                      {t.label}
                      <button
                        className="hb-press"
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
                      background: '#1a3558', border: `1px solid ${ACCENT}`,
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
                        className="hb-press"
                        onClick={() => confirmAddTheme(c.id)}
                        aria-label="Confirm new theme"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: ACCENT, color: '#0a1628', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <Check style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        className="hb-press"
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
                      className="hb-press"
                      onClick={() => { setAddingFor(c.id); setNewThemeLabel(''); setNewThemeCategory('sports') }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '7px 13px', borderRadius: '20px', fontSize: '11px',
                        background: 'none', color: MUTED, fontFamily: 'inherit',
                        border: `1px dashed ${MUTED}`, cursor: 'pointer',
                      }}
                    >
                      <Plus style={{ width: 11, height: 11 }} /> Add theme
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {unmonitored.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: MUTED }}>Start watching:</span>
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
              <option value="">Choose a person&hellip;</option>
              {unmonitored.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        </div>
      </div>
    )
  }

  // Shared derivation for a reason card — the phone deck and the desktop
  // front page render the same facts at different scales.
  function reasonView(r) {
    const u = r.update
    const contact = r.kind === 'drift' ? r.nudge.contact : contacts.find(c => c.id === u.contactId)
    const { head, rest } = r.kind === 'drift'
      ? { head: `It's been ${r.nudge.health.days} days quiet with ${firstName(r.nudge.contact.name)}.`, rest: '' }
      : splitHeadline(u.headline)
    const kicker = r.kind === 'news'
      ? (u.headsUp
        ? ['Heads-up · ' + u.headsUp, u.themeLabel].filter(Boolean).join(' · ')
        : [u.themeLabel, u.source].filter(Boolean).join(' · '))
      : r.kind === 'favor'
        ? ['A favor to send', u.themeLabel].filter(Boolean).join(' · ')
        : 'Drifting'
    const body = r.kind === 'news'
      ? (rest
        ? `${rest}${/[.!?]$/.test(rest) ? '' : '.'}${u.time ? ` ${u.time.charAt(0).toUpperCase()}${u.time.slice(1)}.` : ''}`
        : `Big news on the theme you share with ${firstName(u.contactName)}.${u.time ? ` ${u.time.charAt(0).toUpperCase()}${u.time.slice(1)}.` : ''}`)
      : r.kind === 'favor'
        ? `Below the bar, but useful to ${firstName(u.contactName)} — a no-ask favor.`
        : 'No news needed — a two-line check-in keeps it warm.'
    const draftPreview = r.kind === 'drift' ? r.nudge.opener : (r.kind === 'favor' ? u.giveMessage : u.draftMessage)
    return { u, contact, head, kicker, body, draftPreview }
  }

  const leadIdx = Math.min(activeIdx, Math.max(0, queue.length - 1))

  // ── Today ──────────────────────────────────────────────────────────
  return (
    <div
      onTouchStart={onPtrStart}
      onTouchMove={onPtrMove}
      onTouchEnd={onPtrEnd}
      onTouchCancel={onPtrEnd}
      style={{
        flex: '1 1 0', minHeight: 0, width: '100%', maxWidth: isMobile ? '520px' : '1120px', alignSelf: 'center',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        justifyContent: isMobile ? 'flex-start' : 'center',
      }}>

      {/* Pull-to-refresh: the asterisk winds up with the pull, then spins
          through the scan. Height collapses to zero when idle. */}
      {isMobile && (pull > 0 || ptrRefreshing) && (
        <div style={{
          height: `${pull}px`, flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          transition: pulling ? 'none' : 'height 0.28s ease',
        }}>
          <div style={{
            paddingBottom: '10px',
            opacity: ptrRefreshing ? 1 : Math.min(1, pull / 62),
            transform: ptrRefreshing ? 'none' : `rotate(${pull * 2.6}deg)`,
          }}>
            <AsteriskMark size={22} spinning={ptrRefreshing} />
          </div>
        </div>
      )}

      {/* Progress — segments up to 6 reasons, a single track beyond (phone only) */}
      {isMobile && queue.length > 1 && (
        <div style={{ flexShrink: 0, padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {queue.length <= 6 ? (
              <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                {queue.map((r, i) => (
                  <button
                    key={r.id}
                    className="hb-press"
                    onClick={() => jumpTo(i)}
                    aria-label={`Reason ${i + 1}`}
                    style={{
                      height: '6px', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: 0,
                      flex: i === activeIdx ? 2.2 : 1,
                      background: i === activeIdx ? ACCENT : 'rgba(211,169,92,0.25)',
                      transition: 'flex 0.25s ease, background 0.2s ease',
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(211,169,92,0.25)', overflow: 'hidden' }}>
                <div style={{ width: `${((activeIdx + 1) / queue.length) * 100}%`, height: '100%', borderRadius: '3px', background: ACCENT, transition: 'width 0.25s ease' }} />
              </div>
            )}
            <span style={{ fontSize: '12px', color: MUTED, flexShrink: 0 }}>{activeIdx + 1} of {queue.length}</span>
          </div>
          {showSwipeHint && (
            <div style={{ fontSize: '12px', color: MUTED, textAlign: 'center', marginTop: '10px' }}>
              Swipe for the next reason &rarr;
            </div>
          )}
        </div>
      )}

      {/* The deck — swipe between reasons */}
      {queue.length > 0 ? (isMobile ? (
        <div ref={deckRef} className="hb-deck" onScroll={onDeckScroll} style={{ flex: 1, minHeight: 0 }}>
          {queue.map((r) => {
            const u = r.update
            const contact = r.kind === 'drift' ? r.nudge.contact : contacts.find(c => c.id === u.contactId)
            const { head, rest } = r.kind === 'drift'
              ? { head: `It's been ${r.nudge.health.days} days quiet with ${firstName(r.nudge.contact.name)}.`, rest: '' }
              : splitHeadline(u.headline)
            const kicker = r.kind === 'news'
              ? (u.headsUp
                ? ['Heads-up · ' + u.headsUp, u.themeLabel].filter(Boolean).join(' · ')
                : [u.themeLabel, u.source].filter(Boolean).join(' · '))
              : r.kind === 'favor'
                ? ['A favor to send', u.themeLabel].filter(Boolean).join(' · ')
                : 'Drifting'
            const draftPreview = r.kind === 'drift' ? r.nudge.opener : (r.kind === 'favor' ? u.giveMessage : u.draftMessage)
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', padding: '0 24px', overflowY: 'auto', overscrollBehaviorY: 'none' }}>
                {/* Kicker — newspaper section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                  <span style={{
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {kicker}
                  </span>
                </div>
                <h1 className="hb-display" style={{
                  fontSize: head.length > 60 ? '25px' : '29px',
                  fontWeight: 500, color: INK, lineHeight: 1.25, margin: '14px 0 0',
                }}>
                  {head}
                </h1>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#C2CBD8', marginTop: '12px' }}>
                  {r.kind === 'news' && (rest
                    ? `${rest}${/[.!?]$/.test(rest) ? '' : '.'}${u.time ? ` ${u.time.charAt(0).toUpperCase()}${u.time.slice(1)}.` : ''}`
                    : `Big news on the theme you share with ${firstName(u.contactName)}.${u.time ? ` ${u.time.charAt(0).toUpperCase()}${u.time.slice(1)}.` : ''}`)}
                  {r.kind === 'favor' && `Below the bar, but useful to ${firstName(u.contactName)} — a no-ask favor.`}
                  {r.kind === 'drift' && 'No news needed — a two-line check-in keeps it warm.'}
                </p>
                <button
                  className="hb-press"
                  onClick={() => contact && navigate(`/dashboard/contact/${contact.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
                    background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', padding: '13px 16px',
                    marginTop: '22px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <WarmAvatar initials={r.kind === 'drift' ? r.nudge.contact.initials : u.contactInitials} size="md" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: INK }}>
                      {contact ? contact.name : (u ? u.contactName : '')}
                    </span>
                    <span style={{ fontSize: '12px', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.kind === 'drift'
                        ? `Last touch ${r.nudge.health.days} days ago`
                        : 'Shared theme'}
                    </span>
                  </div>
                </button>

                {/* Pull quote — the drafted message, newspaper-style */}
                {draftPreview && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <div style={{ width: '2px', borderRadius: '1px', background: ACCENT, flexShrink: 0, alignSelf: 'stretch' }} />
                    <p className="hb-display" style={{ fontStyle: 'italic', fontSize: '15px', lineHeight: 1.55, color: '#C2CBD8', minWidth: 0 }}>
                      &ldquo;{clip(draftPreview)}&rdquo;
                    </p>
                  </div>
                )}

                {r.kind !== 'drift' && (
                  <WhyDisclosure update={u} kind={r.kind} style={{ marginTop: '16px' }} />
                )}

                <div style={{ flex: isMobile ? 1 : '0 0 auto', minHeight: isMobile ? '18px' : '36px' }} />

                <button
                  className="hb-cta hb-press"
                  onClick={() => openReason(r)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    height: '54px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#0a1628' }}>
                    {r.kind === 'favor' ? 'Send the favor' : 'Review the draft'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </button>
                <div style={{ fontSize: '12px', color: MUTED, textAlign: 'center', margin: '10px 0 14px', flexShrink: 0 }}>
                  Drafted for you &mdash; nothing sends itself
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Desktop front page: the lead reason large on the left, the rest of
        // the day's reasons as a headline rail on the right.
        (() => {
          const lead = queue[leadIdx]
          const v = reasonView(lead)
          return (
            <div style={{ flex: '0 1 auto', minHeight: 0, overflowY: 'auto', padding: '24px 48px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '64px', alignItems: 'start' }}>

                {/* Lead story */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
                      {v.kicker}
                    </span>
                  </div>
                  <h1 className="hb-display" style={{
                    fontSize: v.head.length > 60 ? '34px' : '40px',
                    fontWeight: 500, color: INK, lineHeight: 1.2, margin: '16px 0 0', maxWidth: '620px',
                  }}>
                    {v.head}
                  </h1>
                  <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#C2CBD8', marginTop: '14px', maxWidth: '560px' }}>
                    {v.body}
                  </p>
                  <button
                    className="hb-press"
                    onClick={() => v.contact && navigate(`/dashboard/contact/${v.contact.id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                      background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', padding: '12px 18px 12px 14px',
                      marginTop: '24px', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <WarmAvatar initials={lead.kind === 'drift' ? lead.nudge.contact.initials : v.u.contactInitials} size="md" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: INK }}>
                        {v.contact ? v.contact.name : (v.u ? v.u.contactName : '')}
                      </span>
                      <span style={{ fontSize: '12px', color: MUTED }}>
                        {lead.kind === 'drift' ? `Last touch ${lead.nudge.health.days} days ago` : 'Shared theme'}
                      </span>
                    </div>
                  </button>
                  {v.draftPreview && (
                    <div style={{ display: 'flex', gap: '14px', marginTop: '22px', maxWidth: '560px' }}>
                      <div style={{ width: '2px', borderRadius: '1px', background: ACCENT, flexShrink: 0, alignSelf: 'stretch' }} />
                      <p className="hb-display" style={{ fontStyle: 'italic', fontSize: '16px', lineHeight: 1.55, color: '#C2CBD8', minWidth: 0 }}>
                        &ldquo;{clip(v.draftPreview, 180)}&rdquo;
                      </p>
                    </div>
                  )}
                  {lead.kind !== 'drift' && (
                    <WhyDisclosure update={v.u} kind={lead.kind} style={{ marginTop: '18px', width: '100%', maxWidth: '560px' }} />
                  )}
                  <button
                    className="hb-cta hb-press"
                    onClick={() => openReason(lead)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      height: '50px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                      padding: '0 30px', marginTop: '28px',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#0a1628' }}>
                      {lead.kind === 'favor' ? 'Send the favor' : 'Review the draft'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                  </button>
                  <div style={{ fontSize: '12px', color: MUTED, marginTop: '12px' }}>
                    Drafted for you &mdash; nothing sends itself
                  </div>
                </div>

                {/* Headline rail */}
                <aside>
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, paddingBottom: '10px', borderBottom: `1px solid ${HAIRLINE}` }}>
                    Today &middot; {queue.length} reason{queue.length === 1 ? '' : 's'}
                  </div>
                  {queue.map((r, i) => {
                    const rv = reasonView(r)
                    const active = i === leadIdx
                    return (
                      <button
                        key={r.id}
                        className="hb-press"
                        onClick={() => setActiveIdx(i)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                          background: 'none', border: 'none', fontFamily: 'inherit',
                          padding: '14px 0 14px 14px', borderBottom: `1px solid ${HAIRLINE}`,
                          borderLeft: `2px solid ${active ? ACCENT : 'transparent'}`,
                        }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? ACCENT : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rv.kicker}
                        </div>
                        <div style={{
                          fontSize: '14px', fontWeight: 600, color: INK, lineHeight: 1.4, marginTop: '5px',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {rv.head}
                        </div>
                        <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>
                          {rv.contact ? rv.contact.name : (rv.u ? rv.u.contactName : '')}
                        </div>
                      </button>
                    )
                  })}
                </aside>

              </div>
            </div>
          )
        })()
      )) : (
        // Empty states — scanning, no contacts, or genuinely all quiet.
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: '16px' }}>
          <AsteriskMark size={34} spinning={scanning} />
          {contacts.length === 0 ? (
            <>
              <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.2 }}>
                Bring in your people
              </h1>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#C2CBD8' }}>
                Import your contacts, tell Harbored what you share, and it watches for real reasons to reach out.
              </p>
              <button
                className="hb-cta hb-press"
                onClick={onImportContacts}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '54px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                  padding: '0 32px', marginTop: '8px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0a1628' }}>
                  Import from Contacts
                </span>
              </button>
            </>
          ) : scanning ? (
            <>
              <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.2 }}>
                Scanning your themes
              </h1>
              <ScanNarration contacts={contacts} themesByContact={themesByContact} />
            </>
          ) : neverScanned ? (
            // Day one: the account is set up but the around-the-clock watch
            // hasn't produced its first reasons yet. Warm, not empty.
            <>
              <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.2 }}>
                The watch has begun
              </h1>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#C2CBD8', maxWidth: '420px' }}>
                Harbored is now watching {themeCount} theme{themeCount === 1 ? '' : 's'} across your
                {' '}{contacts.length} {contacts.length === 1 ? 'person' : 'people'}, around the clock.
                First reasons usually land within a day &mdash; you&rsquo;ll get a push the moment
                something clears the bar.
              </p>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: MUTED, maxWidth: '420px' }}>
                The more themes each person has, the more Harbored can catch &mdash; add a few
                any time.
              </p>
            </>
          ) : (
            <>
              <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.2 }}>
                All quiet
              </h1>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#C2CBD8' }}>
                Harbored is watching {themeCount} theme{themeCount === 1 ? '' : 's'} across {contacts.length} people. You&rsquo;ll hear when something clears the bar.
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
          className="hb-press"
          onClick={() => setView('themes')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontFamily: 'inherit', fontSize: '12px', textDecoration: 'underline', minHeight: '32px' }}
        >
          Manage themes
        </button>
        <span style={{ opacity: 0.5 }}>&middot;</span>
        <button
          className="hb-press"
          onClick={scan}
          disabled={scanning}
          style={{ background: 'none', border: 'none', cursor: scanning ? 'default' : 'pointer', color: MUTED, fontFamily: 'inherit', fontSize: '12px', textDecoration: 'underline', minHeight: '32px' }}
        >
          {scanning ? 'Scanning…' : (scannedAt ? `Updated ${scannedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Scan now')}
        </button>
      </div>

      {/* ── Draft screen — full-screen takeover ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="hb-app"
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
              justifyContent: isMobile ? 'flex-start' : 'center',
              padding: 'calc(env(safe-area-inset-top) + 16px) 24px calc(env(safe-area-inset-bottom) + 16px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <button
                  className="hb-press"
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
                  <span style={{ fontSize: '12px', color: MUTED }}>
                    Reason {queuePos + 1} of {queue.length}
                  </span>
                )}
              </div>

              <div style={{ marginTop: '14px' }}><AsteriskMark size={26} /></div>

              <h1 className="hb-display" style={{ fontSize: '32px', fontWeight: 500, color: INK, lineHeight: 1.15, margin: '14px 0 0' }}>
                To {selContact ? firstName(selContact.name) : 'them'}
              </h1>
              <p style={{ fontSize: '13px', color: MUTED, marginTop: '10px', lineHeight: 1.6 }}>
                {selected.kind === 'drift'
                  ? 'No news — just a check-in'
                  : `Re: ${selected.update.headline}`}
              </p>

              <div style={{ background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', padding: '18px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {draftStreaming ? (
                  // The draft writes itself in; a tap (or the end of the
                  // stream) turns it into the editable field below. Same
                  // type, same rhythm — no layout jump at the handoff.
                  <div
                    onClick={() => setDraftStreaming(false)}
                    style={{
                      minHeight: `${Math.min(12, Math.max(4, Math.ceil(msgText.length / 28))) * 1.65}em`,
                      fontSize: '15px', lineHeight: 1.65, color: INK, cursor: 'text',
                      whiteSpace: 'pre-wrap', opacity: redrafting ? 0.45 : 1, transition: 'opacity 0.2s',
                    }}
                  >
                    <StreamText text={msgText} active={!redrafting} onDone={() => setDraftStreaming(false)} />
                  </div>
                ) : (
                  <textarea
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    rows={Math.min(12, Math.max(4, Math.ceil(msgText.length / 28)))}
                    aria-label="Your draft message"
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      resize: 'none', fontSize: '15px', lineHeight: 1.65, color: INK,
                      fontFamily: 'inherit', boxSizing: 'border-box',
                      opacity: redrafting ? 0.45 : 1, transition: 'opacity 0.2s',
                    }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '20px' }}>
                  {redrafting ? (
                    <ThinkingMark size={12} label="Finding another angle…" labelStyle={{ fontSize: '12px' }} />
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: MUTED }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /></svg>
                      Tap the text to edit
                    </span>
                  )}
                  <button
                    className="hb-press"
                    onClick={handleRedraft}
                    disabled={redrafting}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                      background: 'none', border: 'none', padding: 0, minHeight: '20px',
                      cursor: redrafting ? 'default' : 'pointer', fontFamily: 'inherit',
                      fontSize: '12px', fontWeight: 600, color: redrafting ? MUTED : ACCENT,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 4v4h4" /></svg>
                    Try another angle
                  </button>
                </div>
              </div>

              <div style={{ flex: isMobile ? 1 : '0 0 auto', minHeight: isMobile ? '18px' : '36px' }} />

              <button
                className="hb-cta hb-press"
                onClick={handleSend}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  height: '54px', borderRadius: '14px', border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4L11 14" /><path d="M21 4l-6.5 17-3.5-7-7-3.5z" /></svg>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0a1628' }}>
                  {sendLabel}
                </span>
              </button>
              <button
                className="hb-press"
                onClick={handleSkip}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '50px', borderRadius: '14px', marginTop: '10px', flexShrink: 0,
                  background: 'none', border: `1px solid rgba(255,255,255,0.2)`, cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: INK }}>
                  Skip this one
                </span>
              </button>
              <div style={{ fontSize: '12px', color: MUTED, textAlign: 'center', marginTop: '12px', flexShrink: 0 }}>
                Harbored drafts &mdash; it never sends
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
