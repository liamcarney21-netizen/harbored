import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus, Upload, Cake } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PlatformBadge from '../../components/PlatformBadge'
import { useDataStore, healthFromLastTouch, daysUntilBirthday } from '../../store/dataStore'

const PLATFORMS = ['All', 'LinkedIn', 'Instagram', 'X', 'TikTok']

function ContactCard({ contact, themeCount, onOpen }) {
  const health = healthFromLastTouch(contact.lastTouch)
  // Birthday shows as a small celebratory pill on the card (within 10 days) —
  // no dedicated section; the moment lives next to the person.
  const bdays = daysUntilBirthday(contact.birthday)
  const bday = bdays !== null && bdays <= 10 ? bdays : null
  const bwhen = bday === 0 ? 'today' : bday === 1 ? 'tomorrow' : `in ${bday} days`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
      onClick={onOpen}
      style={{
        position: 'relative', borderRadius: '12px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        background: '#FFFFFF', border: '1px solid #E5E1D7',
        overflow: 'hidden', transition: 'border-color 0.2s',
        cursor: 'pointer', height: '100%', boxSizing: 'border-box',
      }}
      whileHover={{ scale: 1.015, borderColor: 'rgba(13,92,99,0.35)' }}
    >
      {/* Avatar + info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Avatar initials={contact.initials} color={contact.color} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: '13px', color: '#1C2B33', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.name}
          </h3>
          <p style={{ fontSize: '12px', color: '#5C6B73', fontFamily: 'Inter, sans-serif', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.role}
          </p>
          <p style={{ fontSize: '12px', color: '#5C6B73', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.company}
          </p>
          {bday !== null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '7px',
              fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
              background: 'rgba(13,92,99,0.1)', color: '#0D5C63', fontFamily: 'Inter, sans-serif',
            }}>
              <Cake style={{ width: '12px', height: '12px' }} /> Birthday {bwhen}
            </span>
          )}
        </div>
      </div>

      {/* Last touch / themes line */}
      <div style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', textAlign: 'center', background: 'rgba(13,92,99,0.06)', color: '#0D5C63', fontFamily: 'Inter, sans-serif' }}>
        {themeCount > 0
          ? `${themeCount} shared theme${themeCount === 1 ? '' : 's'} monitored`
          : contact.lastTouch
            ? `Last touch ${health.days === 0 ? 'today' : `${health.days}d ago`}`
            : 'No touchpoints yet'}
      </div>

      {/* Relationship health */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#5C6B73', fontFamily: 'Inter, sans-serif' }}>Relationship Health</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: health.color, fontFamily: 'Inter, sans-serif' }}>{health.label}</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', overflow: 'hidden', background: '#E5E1D7' }}>
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

export default function Network({ onAddContact, onImportContacts }) {
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
      style={{ minHeight: '100%', padding: 'clamp(20px, 4vw, 40px)', fontFamily: 'Inter, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '27px', fontWeight: 600, color: '#1C2B33', marginBottom: '4px' }}>
            My Network
          </h1>
          <p style={{ fontSize: '13px', color: '#5C6B73' }}>
            {contacts.length} relationships, quietly monitored
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={onImportContacts}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'none', color: '#0D5C63', border: '1px solid rgba(13,92,99,0.25)', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Upload style={{ width: '14px', height: '14px' }} /> Import Contacts
          </button>
          <button
            onClick={onAddContact}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Plus style={{ width: '14px', height: '14px' }} /> Add Contact
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '12px', flex: 1, minWidth: '224px', maxWidth: '320px',
          background: '#FFFFFF', border: '1px solid #E3DFD5',
        }}>
          <Search style={{ width: '14px', height: '14px', color: '#5C6B73', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name, role, or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', outline: 'none', border: 'none', fontSize: '13px', color: '#1C2B33', width: '100%', fontFamily: 'Inter, sans-serif' }}
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
                background: activePlatform === p ? '#0D5C63' : '#FFFFFF',
                color: activePlatform === p ? '#FFFFFF' : '#5C6B73',
                border: `1px solid ${activePlatform === p ? '#0D5C63' : '#D6D1C5'}`,
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
          <div style={{ gridColumn: '1 / -1', padding: '64px 0', textAlign: 'center', color: '#5C6B73' }}>
            No contacts found.
          </div>
        )}
      </div>
    </motion.div>
  )
}
