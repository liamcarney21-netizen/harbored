import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PlatformBadge from '../../components/PlatformBadge'
import { useDataStore, healthFromLastTouch } from '../../store/dataStore'

const PLATFORMS = ['All', 'LinkedIn', 'Instagram', 'X', 'TikTok']

function ContactCard({ contact, themeCount, onOpen }) {
  const health = healthFromLastTouch(contact.lastTouch)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
      onClick={onOpen}
      style={{
        position: 'relative', borderRadius: '12px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        background: '#FFFFFF', border: '1px solid #E4E6E9',
        overflow: 'hidden', transition: 'border-color 0.2s',
        cursor: 'pointer', height: '100%', boxSizing: 'border-box',
      }}
      whileHover={{ scale: 1.015, borderColor: 'rgba(10,102,194,0.35)' }}
    >
      {/* Avatar + info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Avatar initials={contact.initials} color={contact.color} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: '13px', color: '#1D2226', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.name}
          </h3>
          <p style={{ fontSize: '12px', color: '#5E6774', fontFamily: 'Inter, sans-serif', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.role}
          </p>
          <p style={{ fontSize: '12px', color: '#5E6774', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.company}
          </p>
        </div>
      </div>

      {/* Last touch / themes line */}
      <div style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', textAlign: 'center', background: 'rgba(10,102,194,0.06)', color: '#0A66C2', fontFamily: 'Inter, sans-serif' }}>
        {themeCount > 0
          ? `${themeCount} shared theme${themeCount === 1 ? '' : 's'} monitored`
          : contact.lastTouch
            ? `Last touch ${health.days === 0 ? 'today' : `${health.days}d ago`}`
            : 'No touchpoints yet'}
      </div>

      {/* Relationship health */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>Relationship Health</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: health.color, fontFamily: 'Inter, sans-serif' }}>{health.label}</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', overflow: 'hidden', background: '#E4E6E9' }}>
          <div style={{ width: `${health.pct}%`, height: '100%', borderRadius: '2px', background: health.color }} />
        </div>
      </div>

      {/* Platform badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {contact.platforms.map(p => <PlatformBadge key={p} platform={p} size="sm" />)}
      </div>
    </motion.div>
  )
}

export default function Network({ onAddContact }) {
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const [search, setSearch] = useState('')
  const [activePlatform, setActivePlatform] = useState('All')

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.name.toLowerCase().includes(q)
      || c.company.toLowerCase().includes(q)
      || c.role.toLowerCase().includes(q)
    const matchPlatform = activePlatform === 'All' || c.platforms.includes(activePlatform.toLowerCase())
    return matchSearch && matchPlatform
  })

  return (
    <motion.div
      style={{ minHeight: '100%', padding: '40px', fontFamily: 'Inter, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#1D2226', marginBottom: '4px' }}>
            My Network
          </h1>
          <p style={{ fontSize: '13px', color: '#5E6774' }}>
            {contacts.length} people being tracked across 4 platforms
          </p>
        </div>
        <button
          onClick={onAddContact}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#0A66C2', color: '#FFFFFF', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Plus style={{ width: '14px', height: '14px' }} /> Add Contact
        </button>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '12px', flex: 1, minWidth: '224px', maxWidth: '320px',
          background: '#FFFFFF', border: '1px solid #E0E3E7',
        }}>
          <Search style={{ width: '14px', height: '14px', color: '#5E6774', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name, role, or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', outline: 'none', border: 'none', fontSize: '13px', color: '#1D2226', width: '100%', fontFamily: 'Inter, sans-serif' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              style={{
                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                background: activePlatform === p ? '#0A66C2' : '#FFFFFF',
                color: activePlatform === p ? '#FFFFFF' : '#5E6774',
                border: `1px solid ${activePlatform === p ? '#0A66C2' : '#D5DADF'}`,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {filtered.map((contact, i) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
          >
            <ContactCard
              contact={contact}
              themeCount={(themesByContact[contact.id] || []).length}
              onOpen={() => navigate(`/dashboard/contact/${contact.id}`)}
            />
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '64px 0', textAlign: 'center', color: '#5E6774' }}>
            No contacts found.
          </div>
        )}
      </div>
    </motion.div>
  )
}
