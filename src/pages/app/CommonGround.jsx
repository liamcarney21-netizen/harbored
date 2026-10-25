import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import WarmAvatar from '../../components/WarmAvatar'
import ThemeAdder from '../../components/ThemeAdder'
import StreamText from '../../components/StreamText'
import WhyDisclosure from '../../components/WhyDisclosure'
import ScanNarration from '../../components/ScanNarration'
import ThinkingMark from '../../components/ThinkingMark'
import { themeUpdates, SIGNIFICANCE_THRESHOLD } from '../../data/commonGround'
import { useDataStore, selectNudges } from '../../store/dataStore'
import { useDemoStore } from '../../store/demoStore'
import { useAuthStore } from '../../store/authStore'
import { fetchLiveUpdates } from '../../services/monitoring'
import { fetchStoredUpdates, REASONS_STALE_EVENT } from '../../services/scanResults'
import { openSend, sendChannelFor } from '../../services/outreach'
import { publishWidget } from '../../services/widget'
import { haptic } from '../../services/haptics'
import { useIsMobile } from '../../hooks/useIsMobile'
import { apiUrl } from '../../lib/apiBase'
import { themeRefining } from '../../lib/status'
import { supabase } from '../../lib/supabase'
import Button from '../../ui/Button'
import Card, { PageTitle } from '../../ui/Card'
import { useToast } from '../../ui/toastStore'
import { T } from '../../ui/tokens'

const TRUST_LINE = 'Drafted for you. Nothing sends itself.'
// Coming back to the app after this long re-reads the stored reasons.
const RELOAD_AFTER_MS = 5 * 60000

// The asterisk mark — doubles as the scanning spinner.
function AsteriskMark({ size = 30, spinning = false }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={T.accent} strokeWidth="2.4" strokeLinecap="round"
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

function sentence(s = '') {
  const t = s.trim()
  if (!t) return ''
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? '' : '.'}`
}

// Everything a reason card shows, derived once per reason.
function reasonView(r, contactsById) {
  const u = r.update
  const contact = r.kind === 'drift' ? r.nudge.contact : contactsById.get(String(u.contactId))
  const name = contact ? contact.name : (u ? u.contactName : '')
  const first = firstName(name)
  if (r.kind === 'drift') {
    return {
      u, contact, name, first,
      head: `It's been ${r.nudge.health.days} days quiet with ${first}.`,
      kicker: 'Drifting',
      body: 'No news needed. A two-line check-in keeps it warm.',
      sub: `Last message ${r.nudge.health.days} days ago`,
      draftPreview: r.nudge.opener,
      cta: 'Review the draft',
    }
  }
  const { head, rest } = splitHeadline(u.headline)
  const when = u.time ? ` ${sentence(u.time)}` : ''
  if (r.kind === 'favor') {
    return {
      u, contact, name, first, head,
      kicker: ['Worth passing along', u.themeLabel].filter(Boolean).join(' · '),
      body: `Not big news, but ${first} would want to see it. No ask attached.${when}`,
      sub: 'Something you share',
      draftPreview: u.giveMessage,
      cta: 'Pass it along',
    }
  }
  return {
    u, contact, name, first, head,
    kicker: u.headsUp
      ? ['Heads-up · ' + u.headsUp, u.themeLabel].filter(Boolean).join(' · ')
      : [u.themeLabel, u.source].filter(Boolean).join(' · '),
    body: rest ? `${sentence(rest)}${when}` : (u.themeLabel ? `${u.themeLabel}, which you and ${first} share.${when}` : `Something you and ${first} share.${when}`),
    sub: 'Something you share',
    draftPreview: u.draftMessage,
    cta: 'Review the draft',
  }
}

export default function CommonGround({ onImportContacts }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const demoActive = useDemoStore(s => s.active)
  const user = useAuthStore(s => s.user)
  // Signed-in accounts read what the server's scan found — the same results
  // their pushes come from. The demo keeps its live scan over seed data.
  const useStored = !!user && !demoActive
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const reasonState = useDataStore(s => s.reasonState)
  const markReason = useDataStore(s => s.markReason)
  const recordTouch = useDataStore(s => s.recordTouch)
  const showToast = useToast(s => s.show)

  const contactsById = useMemo(() => new Map(contacts.map(c => [String(c.id), c])), [contacts])
  const nudges = useMemo(() => selectNudges({ contacts }), [contacts])

  const [view, setView] = useState('today') // 'today' | 'themes'
  const [selected, setSelected] = useState(null)
  const [msgText, setMsgText] = useState('')
  const [updates, setUpdates] = useState([])
  const [scanning, setScanning] = useState(false)
  const [checkError, setCheckError] = useState(false)
  const [checkedAt, setCheckedAt] = useState(null)
  const [neverScanned, setNeverScanned] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try { return localStorage.getItem('harbored_swiped') !== 'true' } catch { return false }
  })
  const deckRef = useRef(null)
  const activeIdxRef = useRef(0)
  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])

  const [draftStreaming, setDraftStreaming] = useState(false)
  const [redrafting, setRedrafting] = useState(false)
  const [angleIdx, setAngleIdx] = useState(0)

  // ── Loading reasons ──────────────────────────────────────────────────
  // `quiet` re-reads in the background (resume, push tap): no narration, and
  // a failed read keeps the deck already on screen.
  const lastLoadRef = useRef(0)
  async function loadStored({ quiet = false } = {}) {
    if (!quiet) { setScanning(true); setCheckError(false) }
    try {
      // The crew as it is now, not as it was when this screen mounted.
      const stored = await fetchStoredUpdates(useDataStore.getState().contacts)
      if (stored === null) { if (!quiet) setCheckError(true); return }
      lastLoadRef.current = Date.now()
      setCheckError(false)
      setUpdates(stored)
      setNeverScanned(stored.length === 0)
      setCheckedAt(new Date())
    } finally {
      if (!quiet) setScanning(false)
    }
  }

  async function scanLive() {
    setScanning(true)
    try {
      const live = await fetchLiveUpdates(contacts, themesByContact, { maxThemes: 6 })
      setUpdates(live)
      setCheckedAt(new Date())
    } catch {
      setCheckError(true)
    } finally {
      setScanning(false)
    }
  }

  // "Check again": ask the server to scan this account now, then re-read.
  const [rescanning, setRescanning] = useState(false)
  async function rescan() {
    if (rescanning) return
    setRescanning(true)
    haptic.tick()
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      const resp = await fetch(apiUrl('/api/rescan'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (resp.status === 429) showToast('Checked recently. Try again in a little while.')
      else if (resp.status === 404) showToast('Checking on demand is coming in the next update.')
      else if (!resp.ok) showToast("Couldn't check right now.")
      await loadStored()
    } catch {
      showToast("Couldn't check right now.")
    } finally {
      setRescanning(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (useStored) loadStored()
    else scanLive()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The scan lands once a morning, while the app may sit open in the
  // background for days: re-read when a push is tapped and when the app comes
  // back after a while, so Today never opens on yesterday's deck.
  useEffect(() => {
    if (!useStored) return
    const reload = () => loadStored({ quiet: true })
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoadRef.current > RELOAD_AFTER_MS) reload()
    }
    window.addEventListener(REASONS_STALE_EVENT, reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(REASONS_STALE_EVENT, reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [useStored])

  // ── The queue ────────────────────────────────────────────────────────
  const allUpdates = useMemo(
    () => (useStored ? updates : [...updates, ...themeUpdates]),
    [useStored, updates],
  )
  const keyOf = (u) => u.key || u.id
  const isHandled = (u) => !!reasonState[keyOf(u)]

  const queue = useMemo(() => {
    const opportunities = allUpdates.filter(u => u.score >= SIGNIFICANCE_THRESHOLD && !isHandled(u))
    const giveables = allUpdates.filter(u => u.score < SIGNIFICANCE_THRESHOLD && u.giveable && !isHandled(u))
    return [
      ...opportunities.map(u => ({ kind: 'news', id: `n-${keyOf(u)}`, update: u })),
      ...giveables.map(u => ({ kind: 'favor', id: `f-${keyOf(u)}`, update: u })),
      ...nudges.slice(0, 2).map(n => ({ kind: 'drift', id: `d-${n.contact.id}`, nudge: n })),
    ]
  }, [allUpdates, reasonState, nudges]) // eslint-disable-line react-hooks/exhaustive-deps
  const themeCount = Object.values(themesByContact).reduce((n, t) => n + t.length, 0)

  // The lead reason goes to the home-screen widget.
  const leadId = queue[0]?.id
  useEffect(() => {
    if (demoActive || !user) return
    const r = queue[0]
    if (!r) { publishWidget(null); return }
    const v = reasonView(r, contactsById)
    publishWidget({ kicker: v.kicker, headline: v.head, name: v.name })
  }, [leadId, demoActive, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // iOS scroll-snap only re-engages on touch, so when the queue changes or the
  // viewport resizes the deck can rest between cards. Any time scrolling
  // settles away from a card boundary with no finger down, glide to the
  // nearest card. The finger flag lives in a ref so a queue change mid-swipe
  // can't reset it.
  const touchingRef = useRef(false)
  const queueKey = queue.map(r => r.id).join('|')
  useEffect(() => {
    const el = deckRef.current
    if (!el) return
    let timer
    const snap = (smooth) => {
      if (touchingRef.current || !el.clientWidth) return
      const i = Math.min(queue.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
      const target = i * el.clientWidth
      if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' })
    }
    const settle = () => { clearTimeout(timer); timer = setTimeout(() => snap(true), 180) }
    const touchStart = () => { touchingRef.current = true; clearTimeout(timer) }
    const touchEnd = () => { touchingRef.current = false; settle() }
    if (!touchingRef.current) snap(false)
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

  // ── Draft screen ─────────────────────────────────────────────────────
  function openReason(r) {
    haptic.soft()
    setAngleIdx(0)
    setDraftStreaming(true)
    setSelected(r)
    setMsgText(r.kind === 'drift' ? r.nudge.opener : (r.kind === 'favor' ? r.update.giveMessage : r.update.draftMessage))
  }

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
      } else {
        showToast("Couldn't find another angle just now.")
      }
    } catch {
      showToast("Couldn't find another angle just now.")
    } finally {
      setRedrafting(false)
    }
  }

  function draftContact() {
    if (!selected) return null
    if (selected.kind === 'drift') return selected.nudge.contact
    return contactsById.get(String(selected.update.contactId)) || null
  }

  function handleSend() {
    const contact = draftContact()
    if (!contact) { showToast("That person isn't in your crew anymore."); setSelected(null); return }
    const isFavor = selected.kind === 'favor'
    const u = selected.update
    const body = isFavor && u?.link ? `${msgText}\n\n${u.link}` : msgText
    const subject = selected.kind === 'drift' ? 'Checking in' : (isFavor ? "Thought you'd want to see this" : 'Saw this and thought of you')
    const channel = openSend(contact, body, subject)
    if (!channel) {
      showToast(`No phone or email for ${firstName(contact.name)} yet.`, { action: 'Add one', onAction: () => navigate(`/dashboard/contact/${contact.id}`) })
      return
    }
    recordTouch(contact.id, {
      channel,
      message: msgText,
      trigger: selected.kind === 'drift'
        ? `Reconnect nudge — ${selected.nudge.health.days} days quiet`
        : (isFavor ? `Passed along: ${u.headline}` : u.headline),
    })
    if (selected.kind !== 'drift') markReason(keyOf(u), 'sent')
    haptic.success()
    setSelected(null)
  }

  function handleSkip() {
    if (selected.kind !== 'drift') markReason(keyOf(selected.update), 'dismissed')
    setSelected(null)
  }

  function onDeckScroll() {
    const el = deckRef.current
    if (!el || !el.clientWidth) return
    if (showSwipeHint && el.scrollLeft > 40) {
      setShowSwipeHint(false)
      try { localStorage.setItem('harbored_swiped', 'true') } catch { /* private mode */ }
    }
    const idx = Math.min(queue.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
    if (idx !== activeIdxRef.current) haptic.tick()
    setActiveIdx(idx)
  }

  // ── Pull-to-refresh (phone) ──────────────────────────────────────────
  const [pull, setPull] = useState(0)
  const [pulling, setPulling] = useState(false)
  const [ptrRefreshing, setPtrRefreshing] = useState(false)
  const ptrGesture = useRef({ startY: 0, startX: 0, engaged: false, canPull: false, pull: 0, raf: 0 })

  function activeCardAtTop() {
    const el = deckRef.current
    if (!el) return true
    const card = el.children[activeIdxRef.current]
    return !card || card.scrollTop <= 0
  }
  function onPtrStart(e) {
    if (!isMobile || ptrRefreshing || selected) return
    const t = e.touches[0]
    ptrGesture.current = { startY: t.clientY, startX: t.clientX, engaged: false, canPull: activeCardAtTop(), pull: 0, raf: 0 }
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
    g.pull = Math.min(110, Math.max(0, (dy - 14) * 0.55))
    // One state update per frame, not per touch event.
    if (!g.raf) g.raf = requestAnimationFrame(() => { g.raf = 0; setPull(g.pull) })
  }
  async function onPtrEnd() {
    const g = ptrGesture.current
    if (!g.engaged) { setPull(0); setPulling(false); return }
    g.engaged = false
    setPulling(false)
    if (g.pull >= 62) {
      haptic.tick()
      setPtrRefreshing(true)
      setPull(62)
      try { if (useStored) await loadStored(); else await scanLive() }
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
  const sendLabel = selChannel === 'sms' ? 'Open in Messages' : selChannel === 'email' ? 'Open in Mail' : 'Add a phone or email'
  const queuePos = selected ? queue.findIndex(r => r.id === selected.id) : -1

  // ── Themes manager ───────────────────────────────────────────────────
  if (view === 'themes') {
    return <ThemesManager contacts={contacts} themesByContact={themesByContact} themeCount={themeCount} onBack={() => setView('today')} />
  }

  // ── Today ────────────────────────────────────────────────────────────
  return (
    <div
      onTouchStart={onPtrStart}
      onTouchMove={onPtrMove}
      onTouchEnd={onPtrEnd}
      onTouchCancel={onPtrEnd}
      style={{ flex: '1 1 0', minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {isMobile && (pull > 0 || ptrRefreshing) && (
        <div style={{
          height: `${pull}px`, flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          transition: pulling ? 'none' : 'height 0.28s ease',
        }}>
          <div style={{ paddingBottom: 10, opacity: ptrRefreshing ? 1 : Math.min(1, pull / 62), transform: ptrRefreshing ? 'none' : `rotate(${pull * 2.6}deg)` }}>
            <AsteriskMark size={22} spinning={ptrRefreshing} />
          </div>
        </div>
      )}

      {/* Progress — segments up to 6 reasons, a single track beyond */}
      {queue.length > 1 && (
        <div style={{ flexShrink: 0, padding: `16px ${T.gutter}px 0` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {queue.length <= 6 ? (
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                {queue.map((r, i) => (
                  <button
                    key={r.id}
                    className="hb-press"
                    onClick={() => jumpTo(i)}
                    aria-label={`Reason ${i + 1}`}
                    style={{
                      height: 6, border: 'none', borderRadius: 3, cursor: 'pointer', padding: 0,
                      flex: i === activeIdx ? 2.2 : 1,
                      background: i === activeIdx ? T.accent : 'rgba(211,169,92,0.25)',
                      transition: 'flex 0.25s ease, background 0.2s ease',
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(211,169,92,0.25)', overflow: 'hidden' }}>
                <div style={{ width: `${((activeIdx + 1) / queue.length) * 100}%`, height: '100%', borderRadius: 3, background: T.accent, transition: 'width 0.25s ease' }} />
              </div>
            )}
            <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{activeIdx + 1} of {queue.length}</span>
          </div>
          {showSwipeHint && (
            <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', marginTop: 10 }}>Swipe for the next reason →</div>
          )}
        </div>
      )}

      {queue.length > 0 ? (
        <div ref={deckRef} className="hb-deck" onScroll={onDeckScroll} style={{ flex: 1, minHeight: 0 }}>
          {queue.map((r) => {
            const v = reasonView(r, contactsById)
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', padding: `0 ${T.gutter}px`, overflowY: 'auto', overscrollBehaviorY: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.kicker}
                  </span>
                </div>
                <h1 className="hb-display" style={{ fontSize: v.head.length > 60 ? 25 : 29, fontWeight: 500, color: T.ink, lineHeight: 1.25, margin: '14px 0 0' }}>
                  {v.head}
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: T.body, marginTop: 12 }}>{v.body}</p>

                <button
                  className="hb-press"
                  onClick={() => v.contact && navigate(`/dashboard/contact/${v.contact.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                    background: T.card, border: `1px solid ${T.hairline}`, borderRadius: 16, padding: '13px 16px',
                    marginTop: 20, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <WarmAvatar initials={v.contact?.initials || v.u?.contactInitials || '?'} size="md" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{v.name}</span>
                    <span style={{ fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.sub}</span>
                  </div>
                </button>

                {v.draftPreview && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                    <div style={{ width: 2, borderRadius: 1, background: T.accent, flexShrink: 0, alignSelf: 'stretch' }} />
                    <p className="hb-display" style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.55, color: T.body, minWidth: 0, margin: 0 }}>
                      &ldquo;{clip(v.draftPreview)}&rdquo;
                    </p>
                  </div>
                )}

                {r.kind !== 'drift' && <WhyDisclosure update={v.u} kind={r.kind} style={{ marginTop: 14 }} />}

                <div style={{ flex: 1, minHeight: 14 }} />

                <Button size="lg" full onClick={() => openReason(r)} iconRight={<Arrow />} style={{ flexShrink: 0 }}>{v.cta}</Button>
                <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', margin: '10px 0 12px', flexShrink: 0 }}>{TRUST_LINE}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          contacts={contacts}
          scanning={scanning}
          checkError={checkError}
          neverScanned={neverScanned}
          themeCount={themeCount}
          themesByContact={themesByContact}
          onImportContacts={onImportContacts}
          onRetry={useStored ? loadStored : scanLive}
        />
      )}

      {/* Quiet footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: `0 ${T.gutter}px 10px`, flexShrink: 0, fontSize: 12, color: T.muted }}>
        <FooterLink onClick={() => setView('themes')}>Manage themes</FooterLink>
        <span style={{ opacity: 0.5 }}>&middot;</span>
        {useStored ? (
          <FooterLink onClick={rescan} disabled={rescanning || scanning}>
            {rescanning ? 'Checking…' : (checkedAt ? `Checked ${checkedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · Check again` : 'Check again')}
          </FooterLink>
        ) : (
          <FooterLink onClick={scanLive} disabled={scanning}>
            {scanning ? 'Scanning…' : (checkedAt ? `Scanned ${checkedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · Scan again` : 'Scan now')}
          </FooterLink>
        )}
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
            style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              width: '100%', maxWidth: T.pageWidth, margin: '0 auto', flex: 1, minHeight: 0,
              display: 'flex', flexDirection: 'column', overflowY: 'auto',
              padding: `calc(env(safe-area-inset-top) + 16px) ${T.gutter}px calc(env(safe-area-inset-bottom) + 16px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <button
                  className="hb-press"
                  onClick={() => setSelected(null)}
                  aria-label="Back"
                  style={{ width: 44, height: 44, marginLeft: -12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: T.ink }}
                >
                  <ChevronLeft style={{ width: 22, height: 22 }} />
                </button>
                {queuePos >= 0 && <span style={{ fontSize: 12, color: T.muted }}>Reason {queuePos + 1} of {queue.length}</span>}
              </div>

              <div style={{ marginTop: 14 }}><AsteriskMark size={26} /></div>

              <h1 className="hb-display" style={{ fontSize: 32, fontWeight: 500, color: T.ink, lineHeight: 1.15, margin: '14px 0 0' }}>
                To {selContact ? firstName(selContact.name) : 'them'}
              </h1>
              <p style={{ fontSize: 13, color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
                {selected.kind === 'drift' ? 'No news — just a check-in' : `Re: ${selected.update.headline}`}
              </p>

              <Card style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {draftStreaming ? (
                  <div
                    onClick={() => setDraftStreaming(false)}
                    style={{
                      minHeight: `${Math.min(12, Math.max(4, Math.ceil(msgText.length / 28))) * 1.65}em`,
                      fontSize: 15, lineHeight: 1.65, color: T.ink, cursor: 'text',
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
                      resize: 'none', fontSize: 16, lineHeight: 1.6, color: T.ink,
                      fontFamily: 'inherit', boxSizing: 'border-box',
                      opacity: redrafting ? 0.45 : 1, transition: 'opacity 0.2s',
                    }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 20 }}>
                  {redrafting ? (
                    <ThinkingMark size={12} label="Finding another angle…" labelStyle={{ fontSize: 12 }} />
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.muted }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /></svg>
                      Tap the text to edit
                    </span>
                  )}
                  <button
                    className="hb-press"
                    onClick={handleRedraft}
                    disabled={redrafting}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                      background: 'none', border: 'none', padding: '6px 0', minHeight: 32,
                      cursor: redrafting ? 'default' : 'pointer', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: 600, color: redrafting ? T.muted : T.accent,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 4v4h4" /></svg>
                    {angleIdx === 0 ? 'Try another angle' : `Another angle (${ANGLE_ROTATION[angleIdx % ANGLE_ROTATION.length]})`}
                  </button>
                </div>
              </Card>

              <div style={{ flex: 1, minHeight: 18 }} />

              <Button size="lg" full onClick={handleSend} icon={<SendIcon />} style={{ flexShrink: 0 }}>{sendLabel}</Button>
              <Button variant="secondary" size="lg" full onClick={handleSkip} style={{ marginTop: 10, flexShrink: 0 }}>Skip this one</Button>
              <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', marginTop: 12, flexShrink: 0 }}>{TRUST_LINE}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ contacts, scanning, checkError, neverScanned, themeCount, themesByContact, onImportContacts, onRetry }) {
  const title = (t) => <h1 className="hb-display" style={{ fontSize: 30, fontWeight: 500, color: T.ink, lineHeight: 1.2, margin: 0 }}>{t}</h1>
  const body = (t) => <p style={{ fontSize: 14, lineHeight: 1.6, color: T.body, maxWidth: 420, margin: 0 }}>{t}</p>
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: 16 }}>
      <AsteriskMark size={34} spinning={scanning} />
      {contacts.length === 0 ? (
        <>
          {title('Bring in your people')}
          {body('Import your contacts, tell Harbored what you share, and it watches for real reasons to reach out.')}
          <Button size="lg" onClick={onImportContacts} style={{ marginTop: 8 }}>Import from Contacts</Button>
        </>
      ) : scanning ? (
        <>
          {title('Checking your themes')}
          <ScanNarration contacts={contacts} themesByContact={themesByContact} />
        </>
      ) : checkError ? (
        <>
          {title("Couldn't check just now")}
          {body('Harbored is still watching on its own. This device just couldn’t reach it.')}
          <Button variant="secondary" size="md" onClick={onRetry}>Try again</Button>
        </>
      ) : themeCount === 0 ? (
        <>
          {title('Nothing to watch yet')}
          {body(`Your crew is in. Give each person a theme or two — a team, a city, a company — and Harbored starts watching.`)}
        </>
      ) : neverScanned ? (
        <>
          {title('The watch has begun')}
          {body(`Harbored is now watching ${themeCount} theme${themeCount === 1 ? '' : 's'} across your ${contacts.length} ${contacts.length === 1 ? 'person' : 'people'}. It checks the news every morning and sends a push when something real turns up.`)}
        </>
      ) : (
        <>
          {title('All quiet')}
          {body(`Harbored is watching ${themeCount} theme${themeCount === 1 ? '' : 's'} across ${contacts.length} people. You'll hear when something real turns up.`)}
        </>
      )}
    </div>
  )
}

function ThemesManager({ contacts, themesByContact, themeCount, onBack }) {
  const removeTheme = useDataStore(s => s.removeTheme)
  const restoreTheme = useDataStore(s => s.restoreTheme)
  const showToast = useToast(s => s.show)
  const [addingFor, setAddingFor] = useState(null)

  const monitored = contacts.filter(c => (themesByContact[c.id] || []).length > 0 || String(c.id) === String(addingFor))
  const unmonitored = contacts.filter(c => (themesByContact[c.id] || []).length === 0 && String(c.id) !== String(addingFor))

  function remove(c, t, index) {
    removeTheme(c.id, t.id)
    haptic.soft()
    showToast(`Stopped watching ${t.label}`, { action: 'Undo', onAction: () => restoreTheme(c.id, t, index) })
  }

  return (
    <div style={{ width: '100%', padding: `14px ${T.gutter}px 32px` }}>
      <button
        className="hb-press"
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, marginLeft: -6, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', fontSize: 13, color: T.muted, fontFamily: 'inherit' }}
      >
        <ChevronLeft style={{ width: 16, height: 16 }} /> Today
      </button>
      <PageTitle title="Themes" sub={`${themeCount} watched · you only hear when something real turns up`} />

      {unmonitored.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: T.muted }}>Add themes for</span>
          <select
            value=""
            onChange={e => { if (e.target.value) setAddingFor(e.target.value) }}
            aria-label="Pick a person to add themes for"
            style={{ background: T.card, border: `1px solid ${T.hairline}`, borderRadius: 10, color: T.ink, fontSize: 16, padding: '9px 10px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <option value="">Choose a person…</option>
            {unmonitored.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        {monitored.map(c => {
          const themes = themesByContact[c.id] || []
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
                <WarmAvatar initials={c.initials} size="md" />
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{c.name}</div>
              </div>
              {themes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {themes.map((t, i) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: T.ground, border: `1px solid ${T.hairline}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{t.label}</div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.45 }}>
                          {t.display || (themeRefining(t) ? <ThinkingMark size={10} label="Working out what to watch…" labelStyle={{ fontSize: 12 }} /> : 'Watching for significant news.')}
                        </div>
                      </div>
                      <button
                        className="hb-press"
                        onClick={() => remove(c, t, i)}
                        aria-label={`Stop watching ${t.label}`}
                        style={{ width: 36, height: 36, margin: '-6px -8px -6px 0', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <ThemeAdder contact={c} autoFocus={String(c.id) === String(addingFor)} />
            </Card>
          )
        })}
        {monitored.length === 0 && (
          <p style={{ fontSize: 14, color: T.body, lineHeight: 1.6, textAlign: 'center', marginTop: 24 }}>
            Nobody has a theme yet. Pick a person above and name something you share.
          </p>
        )}
      </div>
    </div>
  )
}

function FooterLink({ onClick, disabled, children }) {
  return (
    <button
      className="hb-press"
      onClick={onClick}
      disabled={disabled}
      style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', color: T.muted, fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 36, padding: '0 4px' }}
    >
      {children}
    </button>
  )
}

function Arrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
}

function SendIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4L11 14" /><path d="M21 4l-6.5 17-3.5-7-7-3.5z" /></svg>
}
