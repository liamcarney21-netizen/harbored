import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Edit3, ChevronLeft, Zap, Plus, X, Check, Trophy, MapPin, TrendingUp, Activity, Briefcase, Radar, RefreshCw, ExternalLink, Waves, Gift } from 'lucide-react'
import Avatar from '../../components/Avatar'
import DemoPipeline from '../../components/DemoPipeline'
import { themeUpdates, SIGNIFICANCE_THRESHOLD } from '../../data/commonGround'
import { useDataStore, selectNudges } from '../../store/dataStore'
import { useDemoStore } from '../../store/demoStore'
import { useAuthStore } from '../../store/authStore'
import { fetchLiveUpdates } from '../../services/monitoring'
import { fetchStoredUpdates } from '../../services/scanResults'
import { openSend, sendChannelFor } from '../../services/outreach'

const TABS = ['Opportunities', 'Shared Themes']

const categoryConfig = {
  sports:   { label: 'Sports',   icon: Trophy,     color: '#2E7D5B', bg: 'rgba(46,125,91,0.08)' },
  place:    { label: 'Place',    icon: MapPin,     color: '#0D5C63', bg: 'rgba(13,92,99,0.08)' },
  market:   { label: 'Market',   icon: TrendingUp, color: '#A97E2F', bg: 'rgba(169,126,47,0.08)' },
  hobby:    { label: 'Hobby',    icon: Activity,   color: '#6E5A8E', bg: 'rgba(110,90,142,0.08)' },
  industry: { label: 'Industry', icon: Briefcase,  color: '#A65B33', bg: 'rgba(166,91,51,0.08)' },
}

function ThemeChip({ label, category, onRemove }) {
  const cfg = categoryConfig[category] || categoryConfig.hobby
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
      background: cfg.bg, color: cfg.color, fontFamily: 'Inter, sans-serif',
      border: '1px solid #E5E1D7',
    }}>
      <Icon style={{ width: '11px', height: '11px', flexShrink: 0 }} />
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Stop monitoring ${label}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            marginLeft: '2px', marginRight: '-4px', color: 'inherit', opacity: 0.6,
          }}
        >
          <X style={{ width: '11px', height: '11px' }} />
        </button>
      )}
    </span>
  )
}

function SignificanceGauge({ score, compact = false }) {
  const above = score >= SIGNIFICANCE_THRESHOLD
  // Signature "tide line": teal water that crests into brass past the bar
  const numColor = above ? '#A97E2F' : '#5C6B73'
  const fill = above ? 'linear-gradient(90deg, #0D5C63 55%, #A97E2F)' : '#9AA69F'
  return (
    <div style={{ width: compact ? '120px' : '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>
          {compact ? 'Significance' : 'Significance score'}
        </span>
        <span style={{ fontSize: compact ? '13px' : '16px', fontWeight: 600, color: numColor, fontFamily: '"Fraunces", Georgia, serif' }}>
          {score}
        </span>
      </div>
      <div style={{ position: 'relative', height: '4px', borderRadius: '2px', background: '#E5E1D7' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: '2px', background: fill, transition: 'width 0.3s ease' }} />
        <div style={{
          position: 'absolute', left: `${SIGNIFICANCE_THRESHOLD}%`, top: '-3px',
          width: '1px', height: '10px', background: 'rgba(28,43,51,0.4)',
        }} />
      </div>
      {!compact && (
        <div style={{ fontSize: '11px', color: '#5C6B73', marginTop: '5px', fontFamily: 'Inter, sans-serif' }}>
          Reach-out threshold: {SIGNIFICANCE_THRESHOLD}
        </div>
      )}
    </div>
  )}

function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: '20px',
      background: 'rgba(46,125,91,0.1)', color: '#2E7D5B', fontFamily: 'Inter, sans-serif',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2E7D5B', display: 'inline-block' }} />
      Live
    </span>
  )
}

export default function CommonGround({ onImportContacts }) {
  const navigate = useNavigate()
  const demoActive = useDemoStore(s => s.active)
  const user = useAuthStore(s => s.user)
  // Signed-in real users read what the scheduled server scan already found;
  // demo mode (no user) keeps its live scan + seed data, untouched.
  const useStored = !!user && !demoActive
  const [showPipeline, setShowPipeline] = useState(true)
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const addTheme = useDataStore(s => s.addTheme)
  const removeTheme = useDataStore(s => s.removeTheme)
  const recordTouch = useDataStore(s => s.recordTouch)
  // Derived per render (not a subscribed selector — it returns a fresh array)
  const nudges = selectNudges({ contacts })

  const [activeTab, setActiveTab] = useState('Opportunities')
  const [selected, setSelected] = useState(null)
  const [msgText, setMsgText] = useState('')
  const [editingMsg, setEditingMsg] = useState(false)
  const [sent, setSent] = useState([])
  const [given, setGiven] = useState([])
  const [dismissed, setDismissed] = useState([])
  const [addingFor, setAddingFor] = useState(null)
  const [newThemeLabel, setNewThemeLabel] = useState('')
  const [newThemeCategory, setNewThemeCategory] = useState('sports')
  const [liveUpdates, setLiveUpdates] = useState([])
  const [storedUpdates, setStoredUpdates] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scannedAt, setScannedAt] = useState(null)

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
    if (useStored) loadStored()
    else scan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stored results are the baseline for signed-in users; a manual "Scan now"
  // populates liveUpdates and takes over. Demo/logged-out keeps live + seeds.
  const allUpdates = useStored
    ? (liveUpdates.length > 0 ? liveUpdates : storedUpdates)
    : [...liveUpdates, ...themeUpdates]
  const opportunities = allUpdates.filter(u => u.score >= SIGNIFICANCE_THRESHOLD && !dismissed.includes(u.id))
  const belowBar = allUpdates.filter(u => u.score < SIGNIFICANCE_THRESHOLD)
  // Below the bar but forwardable → surface as a "give first" favor.
  const giveables = belowBar.filter(u => u.giveable && !dismissed.includes(u.id) && !given.includes(u.id))
  const logged = belowBar.filter(u => !u.giveable).slice(0, 8)
  const themeCount = Object.values(themesByContact).reduce((n, t) => n + t.length, 0)
  const monitoredContacts = contacts.filter(c => (themesByContact[c.id] || []).length > 0)

  function openUpdate(update) {
    setSelected(update)
    setMsgText(update.draftMessage)
    setEditingMsg(false)
  }

  function handleSend() {
    const contact = contacts.find(c => c.id === selected.contactId)
    const channel = contact ? openSend(contact, msgText, `Saw this and thought of you`) : null
    recordTouch(selected.contactId, {
      channel: channel || 'email',
      message: msgText,
      trigger: selected.headline,
    })
    setSent(prev => [...prev, selected.id])
    setSelected(null)
  }

  function handleNudgeSend(nudge) {
    const channel = openSend(nudge.contact, nudge.opener, 'Checking in')
    recordTouch(nudge.contact.id, {
      channel: channel || 'email',
      message: nudge.opener,
      trigger: `Reconnect nudge — ${nudge.health.days} days quiet`,
    })
  }

  function handleGive(update) {
    const contact = contacts.find(c => c.id === update.contactId)
    const msg = update.giveMessage + (update.link ? `\n\n${update.link}` : '')
    const channel = contact ? openSend(contact, msg, 'Thought you\'d want to see this') : null
    recordTouch(update.contactId, {
      channel: channel || 'email',
      message: update.giveMessage,
      trigger: `Shared as a favor: ${update.headline}`,
    })
    setGiven(prev => [...prev, update.id])
  }

  function handleSkip() {
    setDismissed(prev => [...prev, selected.id])
    setSelected(null)
  }

  function confirmAddTheme(contactId) {
    const label = newThemeLabel.trim()
    if (!label) return
    addTheme(contactId, label, newThemeCategory)
    setAddingFor(null)
    setNewThemeLabel('')
  }

  // The header CTA should drop you straight into adding a theme — not just flip a
  // tab (which reads as "nothing happened" on mobile, where the cards are below the
  // fold). Open an autofocused input on the first contact and scroll it into view.
  function startAddTheme() {
    setActiveTab('Shared Themes')
    const first = contacts[0]
    if (first) {
      setNewThemeLabel('')
      setNewThemeCategory('sports')
      setAddingFor(first.id)
    }
    setTimeout(() => {
      document.getElementById('shared-themes-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const selectedCfg = selected ? (categoryConfig[selected.category] || categoryConfig.hobby) : null
  const selectedContact = selected ? contacts.find(c => c.id === selected.contactId) : null

  return (
    <div style={{ minHeight: '100%', display: 'flex', position: 'relative' }}>
      <motion.div
        style={{ flex: 1, minWidth: 0, padding: 'clamp(20px, 4vw, 40px)', fontFamily: 'Inter, sans-serif' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <div style={{ minWidth: '260px' }}>
            <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '27px', fontWeight: 600, color: '#1C2B33', marginBottom: '4px' }}>
              Common Ground
            </h1>
            <p style={{ fontSize: '13px', color: '#5C6B73' }}>
              {themeCount} shared themes monitored across {monitoredContacts.length} contacts · flagged only when it clears the bar
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={scan}
              disabled={scanning}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: '#FFFFFF', color: scanning ? '#5C6B73' : '#0D5C63',
                border: '1px solid #CCC6B9', cursor: scanning ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
              }}
            >
              <RefreshCw style={{ width: '13px', height: '13px', animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
              {scanning ? 'Scanning themes…' : 'Scan now'}
            </button>
            <button
              onClick={startAddTheme}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
              }}
            >
              <Plus style={{ width: '14px', height: '14px' }} /> Add Shared Theme
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === t ? '#0D5C63' : '#FFFFFF',
                color: activeTab === t ? '#FFFFFF' : '#5C6B73',
                border: `1px solid ${activeTab === t ? '#0D5C63' : '#D6D1C5'}`,
              }}
            >
              {t}
            </button>
          ))}
          {scannedAt && (
            <span style={{ fontSize: '11px', color: '#5C6B73', marginLeft: 'auto' }}>
              {liveUpdates.length > 0
                ? `Live scan found ${liveUpdates.length} update${liveUpdates.length === 1 ? '' : 's'} · ${scannedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Live scan: no fresh updates right now'}
            </span>
          )}
        </div>

        {activeTab === 'Opportunities' && (
          <>
            {demoActive && showPipeline && (
              <DemoPipeline
                onImport={onImportContacts}
                onDismiss={() => setShowPipeline(false)}
              />
            )}

            {/* Reach-out opportunities */}
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73', marginBottom: '12px' }}>
              Worth reaching out — {opportunities.length}
            </div>
            <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E6E2D8', marginBottom: '32px' }}>
              {opportunities.length === 0 && (
                <div style={{ padding: '64px 0', textAlign: 'center', color: '#5C6B73' }}>
                  Nothing above the reach-out bar right now. Harbored is watching.
                </div>
              )}
              {opportunities.map((u, i) => {
                const cfg = categoryConfig[u.category] || categoryConfig.hobby
                const Icon = cfg.icon
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                    onClick={() => openUpdate(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                      padding: '16px 20px', cursor: 'pointer',
                      borderBottom: i < opportunities.length - 1 ? '1px solid #EEEBE3' : 'none',
                    }}
                    whileHover={{ background: '#F8F6F0' }}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/dashboard/contact/${u.contactId}`) }}
                      aria-label={`Open ${u.contactName}'s profile`}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <Avatar initials={u.contactInitials} color={u.contactColor} size="md" />
                    </button>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33' }}>{u.contactName}</span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px',
                          background: cfg.bg, color: cfg.color,
                        }}>
                          <Icon style={{ width: '10px', height: '10px' }} />
                          {u.themeLabel}
                        </span>
                        {u.live && <LiveBadge />}
                        {sent.includes(u.id) && (
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '20px', background: 'rgba(46,125,91,0.1)', color: '#2E7D5B' }}>
                            Sent ✓
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#5C6B73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.headline}
                      </p>
                      <p style={{ fontSize: '11px', color: '#5C6B73', opacity: 0.7, marginTop: '2px' }}>
                        {u.source} · {u.time}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <SignificanceGauge score={u.score} compact />
                      <button
                        style={{ fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', background: 'rgba(13,92,99,0.1)', color: '#0D5C63', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                        onClick={e => { e.stopPropagation(); openUpdate(u) }}
                      >
                        Review
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Drifting quietly — reconnect nudges */}
            {nudges.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Waves style={{ width: '13px', height: '13px', color: '#A97E2F' }} />
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73' }}>
                    Drifting quietly — no news, but too long since you talked
                  </span>
                </div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E6E2D8', marginBottom: '32px' }}>
                  {nudges.slice(0, 4).map((n, i) => (
                    <div
                      key={n.contact.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px',
                        borderBottom: i < Math.min(nudges.length, 4) - 1 ? '1px solid #EEEBE3' : 'none',
                      }}
                    >
                      <button
                        onClick={() => navigate(`/dashboard/contact/${n.contact.id}`)}
                        aria-label={`Open ${n.contact.name}'s profile`}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <Avatar initials={n.contact.initials} color={n.contact.color} size="md" />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33' }}>{n.contact.name}</span>
                          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: n.health.bg, color: n.health.color }}>
                            {n.health.days} days quiet
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#5C6B73', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{n.opener}"
                        </p>
                      </div>
                      <button
                        onClick={() => handleNudgeSend(n)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                          fontSize: '12px', fontWeight: 500, padding: '7px 14px', borderRadius: '8px',
                          background: 'rgba(13,92,99,0.1)', color: '#0D5C63', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        <Send style={{ width: '12px', height: '12px' }} /> Reach out
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Give first — forwardable favors */}
            {giveables.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Gift style={{ width: '13px', height: '13px', color: '#A97E2F' }} />
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73' }}>
                    Worth sending — a small favor, no reply needed
                  </span>
                </div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E6E2D8', marginBottom: '32px' }}>
                  {giveables.map((u, i) => {
                    const cfg = categoryConfig[u.category] || categoryConfig.hobby
                    const Icon = cfg.icon
                    return (
                      <div
                        key={u.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '14px 20px',
                          borderBottom: i < giveables.length - 1 ? '1px solid #EEEBE3' : 'none',
                        }}
                      >
                        <button
                          onClick={() => navigate(`/dashboard/contact/${u.contactId}`)}
                          aria-label={`Open ${u.contactName}'s profile`}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          <Avatar initials={u.contactInitials} color={u.contactColor} size="md" />
                        </button>
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33' }}>{u.contactName}</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px',
                              background: cfg.bg, color: cfg.color,
                            }}>
                              <Icon style={{ width: '10px', height: '10px' }} />
                              {u.themeLabel}
                            </span>
                            {u.live && <LiveBadge />}
                          </div>
                          <p style={{ fontSize: '13px', color: '#5C6B73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.headline}
                          </p>
                          <p style={{ fontSize: '12px', color: '#5C6B73', fontStyle: 'italic', opacity: 0.85, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{u.giveMessage}"
                          </p>
                        </div>
                        <button
                          onClick={() => handleGive(u)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                            fontSize: '12px', fontWeight: 500, padding: '7px 14px', borderRadius: '8px',
                            background: 'rgba(169,126,47,0.12)', color: '#A97E2F', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          <Gift style={{ width: '12px', height: '12px' }} /> Send as a favor
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Monitored, below threshold */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Radar style={{ width: '13px', height: '13px', color: '#5C6B73' }} />
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73' }}>
                Monitored, not flagged — below the reach-out bar
              </span>
            </div>
            <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FAF9F5', border: '1px solid #EEEBE3' }}>
              {logged.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 20px',
                    borderBottom: i < logged.length - 1 ? '1px solid #F0EEE7' : 'none',
                  }}
                >
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color: '#5C6B73', flexShrink: 0,
                    width: '30px', height: '30px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F2F0EA', border: '1px solid #E5E1D7',
                  }}>
                    {u.score}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#5C6B73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#3E4B52', fontWeight: 500 }}>{u.themeLabel}</span>
                      <span style={{ opacity: 0.6 }}> · {u.contactName} · </span>
                      {u.headline}
                      {u.live && <span style={{ marginLeft: '6px' }}><LiveBadge /></span>}
                    </p>
                    <p style={{ fontSize: '11px', color: '#5C6B73', opacity: 0.65, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.holdReason}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', color: '#5C6B73', opacity: 0.6, flexShrink: 0 }}>{u.time}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'Shared Themes' && (
          <div id="shared-themes-anchor" style={{ display: 'flex', flexDirection: 'column', gap: '14px', scrollMarginTop: '80px' }}>
            {contacts.filter(c => (themesByContact[c.id] || []).length > 0 || addingFor === c.id).map((c, i) => {
              const themes = themesByContact[c.id] || []
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                  style={{
                    borderRadius: '12px', padding: '20px',
                    background: '#FFFFFF', border: '1px solid #E6E2D8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <button
                      onClick={() => navigate(`/dashboard/contact/${c.id}`)}
                      aria-label={`Open ${c.name}'s profile`}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <Avatar initials={c.initials} color={c.color} size="md" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                        <button
                          onClick={() => navigate(`/dashboard/contact/${c.id}`)}
                          style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                        >
                          {c.name}
                        </button>
                        <span style={{ fontSize: '12px', color: '#5C6B73' }}>{c.role} · {c.company}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#5C6B73', marginBottom: '12px' }}>
                        {themes.reduce((n, t) => n + (t.updatesThisMonth || 0), 0)} updates detected this month
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {themes.map(t => (
                          <ThemeChip key={t.id} label={t.label} category={t.category} onRemove={() => removeTheme(c.id, t.id)} />
                        ))}
                        {addingFor === c.id ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxWidth: '100%',
                            padding: '4px 6px 4px 12px', borderRadius: '20px',
                            background: '#F2F0EA', border: '1px solid rgba(13,92,99,0.4)',
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
                                fontSize: '16px', color: '#1C2B33', width: '170px', maxWidth: '48vw', minWidth: 0, fontFamily: 'Inter, sans-serif',
                              }}
                            />
                            <select
                              value={newThemeCategory}
                              onChange={e => setNewThemeCategory(e.target.value)}
                              aria-label="Theme category"
                              style={{
                                background: '#FFFFFF', border: '1px solid #D6D1C5',
                                borderRadius: '6px', color: '#5C6B73', fontSize: '16px', padding: '3px 4px',
                                outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                              }}
                            >
                              {Object.entries(categoryConfig).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => confirmAddTheme(c.id)}
                              aria-label="Confirm new theme"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                              }}
                            >
                              <Check style={{ width: '12px', height: '12px' }} />
                            </button>
                            <button
                              onClick={() => setAddingFor(null)}
                              aria-label="Cancel adding theme"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: 'none', color: '#5C6B73', border: 'none', cursor: 'pointer',
                              }}
                            >
                              <X style={{ width: '12px', height: '12px' }} />
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { setAddingFor(c.id); setNewThemeLabel(''); setNewThemeCategory('sports') }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                              background: 'none', color: '#5C6B73', fontFamily: 'Inter, sans-serif',
                              border: '1px dashed #C2BCAF', cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <Plus style={{ width: '11px', height: '11px' }} /> Add theme
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Start monitoring another contact */}
            {contacts.some(c => (themesByContact[c.id] || []).length === 0 && addingFor !== c.id) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 2px' }}>
                <span style={{ fontSize: '12px', color: '#5C6B73' }}>Start monitoring themes for:</span>
                <select
                  value=""
                  onChange={e => { if (e.target.value) { setAddingFor(Number(e.target.value)); setNewThemeLabel(''); } }}
                  aria-label="Pick a contact to add themes for"
                  style={{
                    background: '#FFFFFF', border: '1px solid #CCC6B9', borderRadius: '8px',
                    color: '#1C2B33', fontSize: '16px', padding: '7px 10px', outline: 'none', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <option value="">Choose a contact…</option>
                  {contacts.filter(c => (themesByContact[c.id] || []).length === 0).map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                  ))}
                </select>
              </div>
            )}

            <p style={{ fontSize: '12px', color: '#5C6B73', opacity: 0.7, marginTop: '4px' }}>
              Harbored monitors each theme across live news sources — you'll only hear about it when an update clears the reach-out bar.
            </p>
          </div>
        )}
      </motion.div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 20,
                width: 'min(440px, 100vw)', display: 'flex', flexDirection: 'column',
                background: '#FFFFFF', borderLeft: '1px solid #DEDACF',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #EEEBE3' }}>
                <button
                  onClick={() => setSelected(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5C6B73', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} /> Back
                </button>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px',
                  background: selectedCfg.bg, color: selectedCfg.color, fontFamily: 'Inter, sans-serif',
                }}>
                  <selectedCfg.icon style={{ width: '10px', height: '10px' }} />
                  {selected.themeLabel}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <Avatar initials={selected.contactInitials} color={selected.contactColor} size="xl" />
                  <div>
                    <h2 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '22px', fontWeight: 600, color: '#1C2B33', marginBottom: '4px' }}>
                      {selected.contactName}
                    </h2>
                    <span style={{ fontSize: '12px', color: '#5C6B73' }}>
                      {selected.source} · {selected.time}
                    </span>
                  </div>
                </div>

                <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '20px', background: '#F7F5F0', border: '1px solid #E5E1D7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73' }}>
                      Update Detected {selected.live ? '· Live' : ''}
                    </div>
                    {selected.link && (
                      <a href={selected.link} target="_blank" rel="noreferrer" aria-label="Open article"
                        style={{ color: '#0D5C63', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', textDecoration: 'none', fontWeight: 500 }}>
                        Read <ExternalLink style={{ width: '11px', height: '11px' }} />
                      </a>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: '#1C2B33', lineHeight: 1.5 }}>{selected.headline}</p>
                </div>

                <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '20px', background: 'rgba(13,92,99,0.05)', border: '1px solid rgba(13,92,99,0.15)' }}>
                  <SignificanceGauge score={selected.score} />
                  {(selected.rationale || selected.factors) && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73' }}>
                          Why this cleared the bar
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0D5C63', fontWeight: 500 }}>
                          <Zap style={{ width: '11px', height: '11px' }} /> Scored by Claude
                        </span>
                      </div>
                      {selected.rationale && (
                        <p style={{ fontSize: '13.5px', color: '#1C2B33', lineHeight: 1.55, marginBottom: selected.factors ? '12px' : 0 }}>
                          {selected.rationale}
                        </p>
                      )}
                      {selected.factors && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selected.factors.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <Check style={{ width: '13px', height: '13px', color: '#0D5C63', flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ fontSize: '13px', color: '#1C2B33', lineHeight: 1.5 }}>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73' }}>
                      Drafted Message
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0D5C63' }}>
                      <Zap style={{ width: '12px', height: '12px' }} />
                      <span style={{ fontSize: '12px' }}>Harbored AI</span>
                    </div>
                  </div>
                  {editingMsg ? (
                    <textarea
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      rows={5}
                      aria-label="Edit drafted message"
                      style={{
                        width: '100%', borderRadius: '12px', padding: '16px', fontSize: '13px',
                        resize: 'none', outline: 'none', boxSizing: 'border-box',
                        background: '#F2F0EA', border: '1px solid rgba(13,92,99,0.4)',
                        color: '#1C2B33', fontFamily: 'Inter, sans-serif',
                      }}
                    />
                  ) : (
                    <div style={{
                      borderRadius: '12px', padding: '16px', fontSize: '13px', lineHeight: 1.6,
                      background: '#F2F0EA', border: '1px solid #E3DFD5',
                      color: '#1C2B33',
                    }}>
                      {msgText}
                    </div>
                  )}
                  <p style={{ fontSize: '12px', marginTop: '8px', color: '#5C6B73' }}>
                    {selectedContact?.email
                      ? `Send opens a prefilled email to ${selectedContact.email}`
                      : 'Drafted from your shared interest in ' + selected.themeLabel}
                  </p>
                </div>
              </div>

              <div style={{ padding: '20px 24px', borderTop: '1px solid #EEEBE3' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSend}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <Send style={{ width: '14px', height: '14px' }} /> Send
                  </button>
                  <button
                    onClick={() => setEditingMsg(v => !v)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      background: 'none', color: '#1C2B33', border: '1px solid #CCC6B9', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <Edit3 style={{ width: '14px', height: '14px' }} /> {editingMsg ? 'Done' : 'Edit'}
                  </button>
                  <button
                    onClick={handleSkip}
                    style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', color: '#5C6B73', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
