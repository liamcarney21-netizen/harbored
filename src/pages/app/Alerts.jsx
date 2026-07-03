import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Edit3, SkipForward, ChevronLeft, Zap } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PlatformBadge from '../../components/PlatformBadge'
import { alerts } from '../../data/appData'
import { useDataStore } from '../../store/dataStore'
import { openSend } from '../../services/outreach'

const FILTERS = ['All', 'Career', 'Life Events', 'Birthdays', 'Unread']

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

export default function Alerts() {
  const contacts = useDataStore(s => s.contacts)
  const recordTouch = useDataStore(s => s.recordTouch)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [autoSend, setAutoSend] = useState(false)
  const [dismissed, setDismissed] = useState([])
  const [editingMsg, setEditingMsg] = useState(null)
  const [msgText, setMsgText] = useState('')
  const [sent, setSent] = useState([])

  const filtered = alerts.filter(a => {
    if (dismissed.includes(a.id)) return false
    if (activeFilter === 'All') return true
    if (activeFilter === 'Unread') return !a.read
    if (activeFilter === 'Career') return a.eventType === 'career'
    if (activeFilter === 'Life Events') return a.eventType === 'life'
    if (activeFilter === 'Birthdays') return a.eventType === 'birthday'
    return true
  })

  function openAlert(alert) {
    setSelected(alert)
    setMsgText(alert.draftMessage)
    setEditingMsg(false)
  }

  function handleSend() {
    const contact = contacts.find(c => c.id === selected.contactId)
    const channel = contact ? openSend(contact, msgText, 'Congratulations!') : null
    recordTouch(selected.contactId, {
      channel: channel || 'email',
      message: msgText,
      trigger: `${selected.contactName} ${selected.event}`,
    })
    setSent(prev => [...prev, selected.id])
    setSelected(null)
  }

  function handleSkip() {
    setDismissed(prev => [...prev, selected.id])
    setSelected(null)
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', position: 'relative' }}>
      {/* Main list */}
      <motion.div
        style={{ flex: 1, padding: '40px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#1D2226', marginBottom: '4px' }}>
            Alerts
          </h1>
          <p style={{ fontSize: '13px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>Events detected across your network</p>
        </div>

        {/* Sample notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
          padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px',
          background: 'rgba(145,89,7,0.06)', border: '1px solid rgba(145,89,7,0.2)', color: '#915907',
        }}>
          <Zap style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          These are sample alerts. Live life-event detection is on the roadmap — Common Ground theme monitoring is live today.
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                background: activeFilter === f ? '#0A66C2' : '#FFFFFF',
                color: activeFilter === f ? '#FFFFFF' : '#5E6774',
                border: `1px solid ${activeFilter === f ? '#0A66C2' : '#D5DADF'}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E8EAED' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '64px 0', textAlign: 'center', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
              No alerts match this filter.
            </div>
          )}
          {filtered.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="group"
              onClick={() => openAlert(alert)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px 20px', cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? '1px solid #EEEFF1' : 'none',
              }}
              whileHover={{ background: '#F7FAFD' }}
            >
              <div style={{ position: 'relative' }}>
                <Avatar initials={alert.contactInitials} color={alert.contactColor} size="md" />
                {!alert.read && !sent.includes(alert.id) && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#0A66C2', border: '2px solid #FFFFFF',
                    display: 'inline-block',
                  }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1D2226', fontFamily: 'Inter, sans-serif' }}>{alert.contactName}</span>
                  {sent.includes(alert.id) && (
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '20px', background: 'rgba(5,118,66,0.1)', color: '#057642', fontFamily: 'Inter, sans-serif' }}>
                      Sent ✓
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#5E6774', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {alert.event}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <PlatformBadge platform={alert.platform} />
                <span style={{ fontSize: '12px', color: '#5E6774', width: '80px', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>{alert.time}</span>
                <button
                  style={{ fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', background: 'rgba(10,102,194,0.12)', color: '#0A66C2', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  onClick={e => { e.stopPropagation(); openAlert(alert) }}
                >
                  View
                </button>
              </div>
            </motion.div>
          ))}
        </div>
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
                width: '440px', display: 'flex', flexDirection: 'column',
                background: '#FFFFFF', borderLeft: '1px solid #DCE0E4',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #E4E6E9' }}>
                <button
                  onClick={() => setSelected(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5E6774', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>Auto-Send</span>
                  <button
                    onClick={() => setAutoSend(v => !v)}
                    style={{
                      position: 'relative', width: '36px', height: '20px', borderRadius: '10px',
                      border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: autoSend ? '#0A66C2' : '#C7CDD3',
                    }}
                  >
                    <span style={{
                      position: 'absolute', width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', top: '2px', transition: 'left 0.2s',
                      left: autoSend ? '18px' : '2px',
                    }} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {/* Contact info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <Avatar initials={selected.contactInitials} color={selected.contactColor} size="xl" />
                  <div>
                    <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 700, color: '#1D2226', marginBottom: '4px' }}>
                      {selected.contactName}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlatformBadge platform={selected.platform} />
                      <span style={{ fontSize: '12px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
                        Detected {selected.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event */}
                <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '24px', background: '#F7F8F9', border: '1px solid #E4E6E9' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500, color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
                    Event Detected
                  </div>
                  <p style={{ fontSize: '14px', color: '#1D2226', fontFamily: 'Inter, sans-serif' }}>
                    <strong>{selected.contactName}</strong> {selected.event}.
                  </p>
                </div>

                {/* Draft message */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
                      Drafted Message
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0A66C2' }}>
                      <Zap style={{ width: '12px', height: '12px' }} />
                      <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Harbored AI</span>
                    </div>
                  </div>
                  {editingMsg ? (
                    <textarea
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      rows={5}
                      style={{
                        width: '100%', borderRadius: '12px', padding: '16px', fontSize: '13px',
                        resize: 'none', outline: 'none', boxSizing: 'border-box',
                        background: '#F3F4F6', border: '1px solid rgba(10,102,194,0.3)',
                        color: '#1D2226', fontFamily: 'Inter, sans-serif',
                      }}
                    />
                  ) : (
                    <div style={{
                      borderRadius: '12px', padding: '16px', fontSize: '13px', lineHeight: 1.6,
                      background: '#F3F4F6', border: '1px solid #E0E3E7',
                      color: '#1D2226', fontFamily: 'Inter, sans-serif',
                    }}>
                      {msgText}
                    </div>
                  )}
                  <p style={{ fontSize: '12px', marginTop: '8px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
                    This message was drafted in your tone by Harbored AI
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '20px 24px', borderTop: '1px solid #E4E6E9' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSend}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      background: '#0A66C2', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <Send style={{ width: '14px', height: '14px' }} /> Send
                  </button>
                  <button
                    onClick={() => setEditingMsg(v => !v)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      background: 'none', color: '#1D2226', border: '1px solid #CDD3D9', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <Edit3 style={{ width: '14px', height: '14px' }} /> {editingMsg ? 'Done' : 'Edit'}
                  </button>
                  <button
                    onClick={handleSkip}
                    style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', color: '#5E6774', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
