import { useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Send, Mail, MessageCircle } from 'lucide-react'
import Avatar from '../../components/Avatar'
import { drafts } from '../../data/appData'
import { useDataStore, daysSince } from '../../store/dataStore'

function relTime(iso) {
  const d = daysSince(iso)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return `${Math.floor(d / 7)} wk ago`
}

const statusConfig = {
  delivered: { label: 'Delivered', color: '#2E7D5B', bg: 'rgba(46,125,91,0.1)' },
  sent:      { label: 'Sent',      color: '#0D5C63', bg: 'rgba(13,92,99,0.1)' },
  draft:     { label: 'Draft',     color: '#5C6B73', bg: 'rgba(92,107,115,0.12)' },
}

const platformIcons = {
  sms:      { icon: MessageCircle, label: 'SMS' },
  email:    { icon: Mail,          label: 'Email' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
}

function MessageRow({ msg, onClick, active }) {
  const status = statusConfig[msg.status]
  const PlatIcon = platformIcons[msg.platform]?.icon || MessageCircle

  return (
    <div
      onClick={() => onClick(msg)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 20px', cursor: 'pointer', transition: 'background 0.15s',
        borderBottom: '1px solid #EEEBE3',
        background: active ? 'rgba(13,92,99,0.06)' : 'transparent',
        borderLeft: active ? '2px solid #0D5C63' : '2px solid transparent',
      }}
    >
      <Avatar initials={msg.contactInitials} color={msg.contactColor} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33', fontFamily: 'Inter, sans-serif', marginBottom: '2px' }}>{msg.contactName}</div>
        <p style={{ fontSize: '12px', color: '#5C6B73', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.preview}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlatIcon style={{ width: '12px', height: '12px', color: '#5C6B73' }} />
          <span style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>{msg.time}</span>
        </div>
        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: status.bg, color: status.color, fontFamily: 'Inter, sans-serif' }}>
          {status.label}
        </span>
      </div>
    </div>
  )
}

export default function Messages() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('sent')
  const [selected, setSelected] = useState(null)
  const [followUp, setFollowUp] = useState('')
  const touches = useDataStore(s => s.touches)
  const contacts = useDataStore(s => s.contacts)

  // Sent = the real touch log, so anything sent through Harbored shows up here.
  const messages = touches.map(t => {
    const c = contacts.find(x => x.id === t.contactId)
    return {
      id: t.id,
      contactId: t.contactId,
      contactName: c?.name || 'Unknown',
      contactInitials: c?.initials || '?',
      contactColor: c?.color || '#1e3a5f',
      message: t.message,
      preview: t.message.length > 64 ? t.message.slice(0, 64) + '…' : t.message,
      platform: t.channel,
      time: relTime(t.date),
      status: 'delivered',
      trigger: t.trigger,
    }
  })

  const list = tab === 'sent' ? messages : drafts

  return (
    <motion.div
      style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(20px, 4vw, 40px) 20px', borderBottom: '1px solid #E6E2D8' }}>
        <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '27px', fontWeight: 600, color: '#1C2B33', marginBottom: '16px' }}>
          Messages
        </h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['sent', 'drafts'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected(null) }}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', textTransform: 'capitalize', border: 'none', fontFamily: 'Inter, sans-serif',
                background: tab === t ? 'rgba(13,92,99,0.12)' : 'transparent',
                color: tab === t ? '#0D5C63' : '#5C6B73',
              }}
            >
              {t} {t === 'sent' ? `(${messages.length})` : `(${drafts.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Body: list + panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* List */}
        <div style={{
          overflowY: 'auto',
          width: selected ? (isMobile ? '0px' : '380px') : '100%',
          display: selected && isMobile ? 'none' : 'block',
          flexShrink: 0,
          borderRight: selected ? '1px solid #E6E2D8' : 'none',
          transition: 'width 0.25s ease',
        }}>
          {list.map(msg => (
            <MessageRow
              key={msg.id}
              msg={msg}
              onClick={setSelected}
              active={selected?.id === msg.id}
            />
          ))}
          {list.length === 0 && (
            <div style={{ padding: '64px 0', textAlign: 'center', color: '#5C6B73' }}>
              No messages here yet.
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
            >
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid #E6E2D8' }}>
                <button
                  onClick={() => setSelected(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#5C6B73', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} />
                </button>
                <Avatar initials={selected.contactInitials} color={selected.contactColor} size="md" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33', fontFamily: 'Inter, sans-serif' }}>{selected.contactName}</div>
                  <div style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>{selected.time}</div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Trigger */}
                <div style={{ borderRadius: '12px', padding: '16px', background: '#FFFFFF', border: '1px solid #E5E1D7' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 500, color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>
                    Triggered by
                  </div>
                  <p style={{ fontSize: '13px', color: '#1C2B33', fontFamily: 'Inter, sans-serif' }}>{selected.trigger}</p>
                </div>

                {/* Message */}
                <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(13,92,99,0.05)', border: '1px solid rgba(13,92,99,0.15)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 500, color: '#0D5C63', fontFamily: 'Inter, sans-serif' }}>
                    Message
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#1C2B33', fontFamily: 'Inter, sans-serif' }}>{selected.message}</p>
                </div>

                {/* Send status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: statusConfig[selected.status].bg, color: statusConfig[selected.status].color, fontFamily: 'Inter, sans-serif' }}>
                    {statusConfig[selected.status].label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>
                    via {platformIcons[selected.platform]?.label || selected.platform}
                  </span>
                </div>

                {/* Follow-up */}
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 500, color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>
                    Send a Follow-Up
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', borderRadius: '12px', padding: '12px', background: '#F7F5F0', border: '1px solid #E3DFD5' }}>
                    <textarea
                      rows={3}
                      placeholder="Write a follow-up message..."
                      value={followUp}
                      onChange={e => setFollowUp(e.target.value)}
                      style={{ flex: 1, background: 'transparent', outline: 'none', border: 'none', resize: 'none', fontSize: '13px', color: '#1C2B33', fontFamily: 'Inter, sans-serif' }}
                    />
                    <button
                      style={{
                        padding: '8px', borderRadius: '8px', flexShrink: 0, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: followUp ? '#0D5C63' : '#E5E1D7',
                        color: followUp ? '#FFFFFF' : '#5C6B73',
                      }}
                      onClick={() => setFollowUp('')}
                    >
                      <Send style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
