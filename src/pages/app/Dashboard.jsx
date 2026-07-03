import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Bell, MessageSquare, AlertTriangle, Plus, ChevronRight, ExternalLink } from 'lucide-react'
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
        border: `1px solid ${highlight ? 'rgba(10,102,194,0.2)' : '#F3F4F6'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
          {title}
        </span>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: highlight ? 'rgba(10,102,194,0.15)' : '#F3F4F6',
        }}>
          <Icon style={{ width: '14px', height: '14px', color: highlight ? '#0A66C2' : '#5E6774' }} />
        </div>
      </div>
      <div style={{
        fontSize: '30px', fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        color: highlight ? '#0A66C2' : '#1D2226',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '11px', color: highlight ? 'rgba(10,102,194,0.7)' : '#5E6774', fontFamily: 'Inter, sans-serif' }}>
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
        borderBottom: '1px solid #E8EAED',
      }}
    >
      <Avatar initials={alert.contactInitials} color={alert.contactColor} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1D2226', fontFamily: 'Inter, sans-serif' }}>{alert.contactName}</span>
          {!alert.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0A66C2', flexShrink: 0, display: 'inline-block' }} />}
        </div>
        <p style={{ fontSize: '13px', color: '#5E6774', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.event}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <PlatformBadge platform={alert.platform} />
        <span style={{ fontSize: '12px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>{alert.time}</span>
        <button
          style={{ fontSize: '12px', fontWeight: 500, color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, sans-serif' }}
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
      background: '#FFFFFF', border: '1px solid #E4E6E9',
    }}>
      <Avatar initials={contact.initials} color={contact.color} size="lg" />
      <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1D2226', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</div>
        <div style={{ fontSize: '11px', color: '#5E6774', fontFamily: 'Inter, sans-serif', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.role}</div>
        <div style={{ fontSize: '11px', color: '#5E6774', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.company}</div>
      </div>
      {contact.lastEvent && (
        <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '20px', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'rgba(10,102,194,0.12)', color: '#0A66C2', fontFamily: 'Inter, sans-serif' }}>
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
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '26px', fontWeight: 700, color: '#1D2226', marginBottom: '4px' }}>
            Good morning, Liam.
          </h1>
          <p style={{ fontSize: '14px', color: '#5E6774' }}>Here's what's happening in your network today.</p>
        </div>
        <button
          onClick={onAddContact}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#0A66C2', color: '#FFFFFF', border: 'none', cursor: 'pointer',
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

      {/* Recent Alerts */}
      <motion.div variants={fadeUp} style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1D2226' }}>Recent Alerts</h2>
          <button
            onClick={() => navigate('/dashboard/alerts')}
            style={{ fontSize: '12px', fontWeight: 500, color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            View all <ExternalLink style={{ width: '11px', height: '11px' }} />
          </button>
        </div>
        <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E8EAED', padding: '0 20px' }}>
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
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1D2226' }}>My Network</h2>
          <button
            onClick={() => navigate('/dashboard/network')}
            style={{ fontSize: '12px', fontWeight: 500, color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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
