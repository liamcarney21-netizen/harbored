import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Bell, MessageSquare, AlertTriangle, Plus, ChevronRight, ExternalLink, Calendar, FileText } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PlatformBadge from '../../components/PlatformBadge'
import { alerts, contacts } from '../../data/appData'
import { useDataStore, healthFromLastTouch, daysSince } from '../../store/dataStore'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
}
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }

function StatCard({ title, value, icon: Icon, highlight, subtitle }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#FFFFFF',
        border: `1px solid ${highlight ? 'rgba(13,92,99,0.2)' : '#F2F0EA'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>
          {title}
        </span>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: highlight ? 'rgba(13,92,99,0.15)' : '#F2F0EA',
        }}>
          <Icon style={{ width: '14px', height: '14px', color: highlight ? '#0D5C63' : '#5C6B73' }} />
        </div>
      </div>
      <div style={{
        fontSize: '32px', fontWeight: 600,
        fontFamily: '"Fraunces", Georgia, serif',
        color: highlight ? '#0D5C63' : '#1C2B33',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '11px', color: highlight ? 'rgba(13,92,99,0.7)' : '#5C6B73', fontFamily: 'Inter, sans-serif' }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  )
}

function AlertRow({ alert, onView }) {
  return (
    <motion.div
      variants={fadeUp}
      onClick={onView}
      className="group"
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 0', cursor: 'pointer',
        borderBottom: '1px solid #E6E2D8',
      }}
    >
      <Avatar initials={alert.contactInitials} color={alert.contactColor} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1C2B33', fontFamily: 'Inter, sans-serif' }}>{alert.contactName}</span>
          {!alert.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0D5C63', flexShrink: 0, display: 'inline-block' }} />}
        </div>
        <p style={{ fontSize: '13px', color: '#5C6B73', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.event}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <PlatformBadge platform={alert.platform} />
        <span style={{ fontSize: '12px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>{alert.time}</span>
        <button
          style={{ fontSize: '12px', fontWeight: 500, color: '#0D5C63', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, sans-serif' }}
        >
          View <ChevronRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
    </motion.div>
  )
}

function ContactCard({ contact }) {
  return (
    <div style={{
      flexShrink: 0, width: '176px', borderRadius: '12px', padding: '16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      background: '#FFFFFF', border: '1px solid #E5E1D7',
    }}>
      <Avatar initials={contact.initials} color={contact.color} size="lg" />
      <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</div>
        <div style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.role}</div>
        <div style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.company}</div>
      </div>
      {contact.lastEvent && (
        <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '20px', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'rgba(13,92,99,0.12)', color: '#0D5C63', fontFamily: 'Inter, sans-serif' }}>
          {contact.lastEvent}
        </span>
      )}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {contact.platforms.map(p => <PlatformBadge key={p} platform={p} size="sm" />)}
      </div>
    </div>
  )
}

export default function Dashboard({ onAddContact }) {
  const navigate = useNavigate()
  const storeContacts = useDataStore(s => s.contacts)
  const touches = useDataStore(s => s.touches)
  const meetings = useDataStore(s => s.meetings)

  const upcoming = meetings
    .filter(m => new Date(m.datetime) > new Date())
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 3)
    .map(m => ({ ...m, contact: storeContacts.find(c => c.id === m.contactId) }))
    .filter(m => m.contact)

  const atRisk = storeContacts.filter(c => healthFromLastTouch(c.lastTouch).key === 'at-risk').length
  const sentLast30 = touches.filter(t => daysSince(t.date) < 30).length

  const stats = [
    { title: 'People Being Tracked', value: String(storeContacts.length), icon: Users, highlight: false, subtitle: 'Across 4 platforms' },
    { title: 'Alerts This Week',     value: '4',  icon: Bell,           highlight: false, subtitle: '2 unread' },
    { title: 'Messages Sent',        value: String(sentLast30), icon: MessageSquare, highlight: false, subtitle: 'Last 30 days' },
    { title: 'Relationships at Risk',value: String(atRisk), icon: AlertTriangle, highlight: true, subtitle: 'No contact in 60+ days' },
  ]

  return (
    <motion.div
      style={{ minHeight: '100%', padding: '40px', fontFamily: 'Inter, sans-serif' }}
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '36px' }}>
        <div>
          <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '30px', fontWeight: 600, color: '#1C2B33', marginBottom: '4px' }}>
            Good morning, Liam.
          </h1>
          <p style={{ fontSize: '14px', color: '#5C6B73' }}>Here's what's happening in your network today.</p>
        </div>
        <button
          onClick={onAddContact}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer',
            transition: 'opacity 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          Track Someone New
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '48px' }}>
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </motion.div>

      {/* Upcoming catch-ups */}
      {upcoming.length > 0 && (
        <motion.div variants={fadeUp} style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar style={{ width: '14px', height: '14px', color: '#0D5C63' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1C2B33' }}>Upcoming Catch-ups</h2>
          </div>
          <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E6E2D8' }}>
            {upcoming.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                  borderBottom: i < upcoming.length - 1 ? '1px solid #EEEBE3' : 'none',
                }}
              >
                <Avatar initials={m.contact.initials} color={m.contact.color} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>{m.title}</span>
                  <p style={{ fontSize: '12px', color: '#5C6B73' }}>
                    with {m.contact.name} · {new Date(m.datetime).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at {new Date(m.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/prep/${m.contactId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                    fontSize: '12px', fontWeight: 500, padding: '7px 14px', borderRadius: '8px',
                    background: 'rgba(13,92,99,0.1)', color: '#0D5C63', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <FileText style={{ width: '12px', height: '12px' }} /> Prep brief
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Alerts */}
      <motion.div variants={fadeUp} style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1C2B33' }}>Recent Alerts</h2>
          <button
            onClick={() => navigate('/dashboard/alerts')}
            style={{ fontSize: '12px', fontWeight: 500, color: '#0D5C63', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            View all <ExternalLink style={{ width: '11px', height: '11px' }} />
          </button>
        </div>
        <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E6E2D8', padding: '0 20px' }}>
          <motion.div variants={stagger}>
            {alerts.slice(0, 3).map(alert => (
              <AlertRow key={alert.id} alert={alert} onView={() => navigate('/dashboard/alerts')} />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Network Snapshot */}
      <motion.div variants={fadeUp}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1C2B33' }}>My Network</h2>
          <button
            onClick={() => navigate('/dashboard/network')}
            style={{ fontSize: '12px', fontWeight: 500, color: '#0D5C63', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            View all 12 <ExternalLink style={{ width: '11px', height: '11px' }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {contacts.slice(0, 5).map(c => <ContactCard key={c.id} contact={c} />)}
        </div>
      </motion.div>
    </motion.div>
  )
}
