import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Mail, Phone, Send, Check, Plus, X, MessageCircle, Compass, StickyNote } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PlatformBadge from '../../components/PlatformBadge'
import { useDataStore, healthFromLastTouch } from '../../store/dataStore'
import { openSend } from '../../services/outreach'

const CATEGORIES = ['sports', 'place', 'market', 'hobby', 'industry']
const categoryColors = {
  sports: '#057642', place: '#0A66C2', market: '#915907', hobby: '#7A3FA8', industry: '#B5560F',
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ContactProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const allTouches = useDataStore(s => s.touches)
  const contact = contacts.find(c => String(c.id) === String(id))
  const themes = themesByContact[Number(id)] || themesByContact[id] || []
  const touches = allTouches.filter(t => String(t.contactId) === String(id))
  const addTheme = useDataStore(s => s.addTheme)
  const removeTheme = useDataStore(s => s.removeTheme)
  const recordTouch = useDataStore(s => s.recordTouch)
  const saveNote = useDataStore(s => s.saveNote)

  const [noteDraft, setNoteDraft] = useState(contact?.notes ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState('sports')

  if (!contact) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', color: '#5E6774' }}>
        Contact not found. <button onClick={() => navigate('/dashboard/network')} style={{ color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}>Back to My Network</button>
      </div>
    )
  }

  const health = healthFromLastTouch(contact.lastTouch)
  const first = contact.name.split(' ')[0]

  function handleReachOut() {
    const msg = `${first} — it's been a while! No agenda, just thinking about you. How's everything at ${contact.company}?`
    const channel = openSend(contact, msg, 'Checking in')
    recordTouch(contact.id, { channel: channel || 'email', message: msg, trigger: 'Manual reach-out from profile' })
  }

  function handleSaveNote() {
    saveNote(contact.id, noteDraft)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 1800)
  }

  function confirmAdd() {
    const label = newLabel.trim()
    if (!label) return
    addTheme(contact.id, label, newCategory)
    setNewLabel('')
    setAdding(false)
  }

  const card = { borderRadius: '12px', padding: '24px', background: '#FFFFFF', border: '1px solid #E8EAED' }
  const sectionTitle = { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#5E6774', marginBottom: '14px' }

  return (
    <motion.div
      style={{ minHeight: '100%', padding: '40px', fontFamily: 'Inter, sans-serif', maxWidth: '860px' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5E6774', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '20px', padding: 0 }}
      >
        <ChevronLeft style={{ width: '15px', height: '15px' }} /> Back
      </button>

      {/* Header card */}
      <div style={{ ...card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <Avatar initials={contact.initials} color={contact.color} size="xl" />
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1D2226', marginBottom: '2px' }}>{contact.name}</h1>
            <p style={{ fontSize: '13px', color: '#5E6774', marginBottom: '10px' }}>{contact.role} · {contact.company}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {contact.platforms.map(p => <PlatformBadge key={p} platform={p} size="sm" />)}
              </div>
              {contact.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#5E6774' }}>
                  <Mail style={{ width: '12px', height: '12px' }} /> {contact.email}
                </span>
              )}
              {contact.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#5E6774' }}>
                  <Phone style={{ width: '12px', height: '12px' }} /> {contact.phone}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleReachOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
              padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: '#0A66C2', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <Send style={{ width: '13px', height: '13px' }} /> Reach out now
          </button>
        </div>

        {/* Health */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EEEFF1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#5E6774' }}>Relationship health</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: health.color }}>
              {health.label} · {contact.lastTouch ? `last touch ${health.days === 0 ? 'today' : `${health.days} day${health.days === 1 ? '' : 's'} ago`}` : 'no touchpoints yet'}
            </span>
          </div>
          <div style={{ height: '5px', borderRadius: '3px', overflow: 'hidden', background: '#E4E6E9' }}>
            <div style={{ width: `${health.pct}%`, height: '100%', borderRadius: '3px', background: health.color, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left column: themes + notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Compass style={{ width: '13px', height: '13px', color: '#0A66C2' }} />
              <span style={{ ...sectionTitle, marginBottom: 0 }}>Common Ground</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {themes.map(t => (
                <span key={t.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                  background: `${categoryColors[t.category] || '#5E6774'}14`,
                  color: categoryColors[t.category] || '#5E6774',
                  border: '1px solid #E4E6E9',
                }}>
                  {t.label}
                  <button onClick={() => removeTheme(contact.id, t.id)} aria-label={`Stop monitoring ${t.label}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', opacity: 0.6 }}>
                    <X style={{ width: '11px', height: '11px' }} />
                  </button>
                </span>
              ))}
              {adding ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '20px', background: '#F3F4F6', border: '1px solid rgba(10,102,194,0.4)' }}>
                  <input
                    autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') setAdding(false) }}
                    placeholder="New shared theme" aria-label="New shared theme"
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#1D2226', width: '150px', fontFamily: 'Inter, sans-serif' }}
                  />
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} aria-label="Category"
                    style={{ background: '#FFFFFF', border: '1px solid #D5DADF', borderRadius: '6px', color: '#5E6774', fontSize: '11px', padding: '2px 4px', outline: 'none', cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <button onClick={confirmAdd} aria-label="Confirm theme" style={{ display: 'flex', width: '20px', height: '20px', borderRadius: '50%', background: '#0A66C2', color: '#fff', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}>
                    <Check style={{ width: '11px', height: '11px' }} />
                  </button>
                </span>
              ) : (
                <button onClick={() => setAdding(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: 'none', color: '#5E6774', border: '1px dashed #C2C8CE', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  <Plus style={{ width: '11px', height: '11px' }} /> Add
                </button>
              )}
            </div>
            {themes.length === 0 && !adding && (
              <p style={{ fontSize: '12px', color: '#5E6774', marginTop: '10px' }}>
                No shared themes yet — add what you two have in common and Harbored will start watching.
              </p>
            )}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote style={{ width: '13px', height: '13px', color: '#915907' }} />
                <span style={{ ...sectionTitle, marginBottom: 0 }}>Notes</span>
              </div>
              <button onClick={handleSaveNote}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: 500, padding: '5px 12px', borderRadius: '8px',
                  background: noteSaved ? 'rgba(5,118,66,0.1)' : 'rgba(10,102,194,0.1)',
                  color: noteSaved ? '#057642' : '#0A66C2',
                  border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                {noteSaved ? <><Check style={{ width: '11px', height: '11px' }} /> Saved</> : 'Save'}
              </button>
            </div>
            <textarea
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              rows={4}
              placeholder="Kids' names, what you talked about last, what they care about…"
              aria-label="Contact notes"
              style={{
                width: '100%', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                background: '#F7F8F9', border: '1px solid #E4E6E9', color: '#1D2226', fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
        </div>

        {/* Right column: touch history */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <MessageCircle style={{ width: '13px', height: '13px', color: '#0A66C2' }} />
            <span style={{ ...sectionTitle, marginBottom: 0 }}>Touchpoint History</span>
          </div>
          {touches.length === 0 && (
            <p style={{ fontSize: '13px', color: '#5E6774' }}>
              No touchpoints recorded yet. When you send through Harbored, it lands here.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {touches.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', gap: '14px', paddingBottom: i < touches.length - 1 ? '18px' : 0, position: 'relative' }}>
                {/* Timeline line */}
                {i < touches.length - 1 && (
                  <div style={{ position: 'absolute', left: '5px', top: '14px', bottom: '2px', width: '1px', background: '#E4E6E9' }} />
                )}
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'rgba(10,102,194,0.15)', border: '2px solid #0A66C2', flexShrink: 0, marginTop: '3px', boxSizing: 'border-box' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D2226' }}>{fmtDate(t.date)}</span>
                    <span style={{ fontSize: '11px', color: '#5E6774', textTransform: 'uppercase' }}>{t.channel}</span>
                  </div>
                  {t.trigger && (
                    <p style={{ fontSize: '11px', color: '#0A66C2', marginBottom: '4px' }}>{t.trigger}</p>
                  )}
                  <p style={{ fontSize: '12px', color: '#5E6774', lineHeight: 1.5 }}>{t.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
