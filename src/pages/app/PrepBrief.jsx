import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Calendar, MessageCircle, Compass, Lightbulb, Send, ExternalLink, StickyNote, RefreshCw } from 'lucide-react'
import Avatar from '../../components/Avatar'
import { useDataStore, healthFromLastTouch, daysSince } from '../../store/dataStore'
import { fetchLiveUpdates } from '../../services/monitoring'
import { themeUpdates, SIGNIFICANCE_THRESHOLD } from '../../data/commonGround'
import { openSend } from '../../services/outreach'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function PrepBrief() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const allTouches = useDataStore(s => s.touches)
  const meetings = useDataStore(s => s.meetings)
  const recordTouch = useDataStore(s => s.recordTouch)

  const contact = contacts.find(c => String(c.id) === String(id))
  const themes = contact ? (themesByContact[contact.id] || []) : []
  const touches = contact ? allTouches.filter(t => t.contactId === contact.id).slice(0, 3) : []
  const meeting = contact
    ? meetings
        .filter(m => m.contactId === contact.id && new Date(m.datetime) > new Date(Date.now() - 3600000))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]
    : null

  const [liveUpdates, setLiveUpdates] = useState([])
  const [loadingLive, setLoadingLive] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!contact || themes.length === 0) { setLoadingLive(false); return }
      setLoadingLive(true)
      try {
        const updates = await fetchLiveUpdates([contact], { [contact.id]: themes }, { maxThemes: themes.length })
        if (!cancelled) setLiveUpdates(updates)
      } finally {
        if (!cancelled) setLoadingLive(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!contact) {
    return (
      <div style={{ padding: 'clamp(20px, 4vw, 40px)', fontFamily: 'Inter, sans-serif', color: '#5C6B73' }}>
        Contact not found.
      </div>
    )
  }

  const health = healthFromLastTouch(contact.lastTouch)
  const first = contact.name.split(' ')[0]

  // Best update per theme: prefer live, fall back to curated seed data.
  const curated = themeUpdates.filter(u => u.contactId === contact.id)
  const themeNews = themes.map(theme => {
    const live = liveUpdates.find(u => u.themeLabel === theme.label)
    const seed = curated.find(u => u.themeLabel === theme.label)
    return { theme, update: live || seed || null }
  })

  // Talking points assembled from what we actually know.
  const talkingPoints = []
  for (const { theme, update } of themeNews) {
    if (update && update.score >= SIGNIFICANCE_THRESHOLD) {
      talkingPoints.push(`Big one: "${update.headline}" — broke ${update.time}. ${first} will have opinions.`)
    } else if (update) {
      talkingPoints.push(`On ${theme.label}: "${update.headline}" (${update.time}) — low-key, but a natural segue.`)
    }
  }
  if (contact.notes) {
    talkingPoints.push(`From your notes: ${contact.notes}`)
  }
  if (touches[0]) {
    talkingPoints.push(`Last time (${daysSince(touches[0].date)} days ago) you reached out about: ${touches[0].trigger || 'a catch-up'}. Ask how it played out.`)
  }
  if (health.days >= 45) {
    talkingPoints.push(`It's been ${health.days} days — acknowledge the gap warmly, don't apologize for it.`)
  }

  const openers = [
    themeNews.find(tn => tn.update)
      ? `"Before anything else — ${themeNews.find(tn => tn.update).update.headline.split('—')[0].trim()}. Thoughts?"`
      : `"So what's the latest at ${contact.company}?"`,
    `"Last time we talked you mentioned ${touches[0]?.trigger?.toLowerCase() || 'a lot going on'} — how did that turn out?"`,
  ]

  function sendHeadsUp() {
    const msg = meeting
      ? `${first} — looking forward to ${fmtDate(meeting.datetime)}! See you at ${fmtTime(meeting.datetime)}.`
      : `${first} — been too long. Want to grab a coffee soon?`
    const channel = openSend(contact, msg, meeting ? `See you ${fmtDate(meeting.datetime)}` : 'Catching up')
    recordTouch(contact.id, { channel: channel || 'email', message: msg, trigger: meeting ? `Heads-up before: ${meeting.title}` : 'Pre-meeting heads-up' })
  }

  const card = { borderRadius: '12px', padding: '22px', background: '#FFFFFF', border: '1px solid #E6E2D8' }
  const label = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#5C6B73', marginBottom: '14px' }

  return (
    <motion.div
      style={{ minHeight: '100%', padding: 'clamp(20px, 4vw, 40px)', fontFamily: 'Inter, sans-serif', maxWidth: '780px' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#5C6B73', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '20px', padding: 0 }}
      >
        <ChevronLeft style={{ width: '15px', height: '15px' }} /> Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Avatar initials={contact.initials} color={contact.color} size="lg" />
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#0D5C63', marginBottom: '3px' }}>
              Prep Brief
            </div>
            <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '24px', fontWeight: 600, color: '#1C2B33', marginBottom: '2px' }}>
              {meeting ? meeting.title : `Catching up with ${first}`}
            </h1>
            <p style={{ fontSize: '13px', color: '#5C6B73' }}>
              {meeting
                ? `${fmtDate(meeting.datetime)} · ${fmtTime(meeting.datetime)} · with ${contact.name}`
                : `${contact.name} · ${contact.role} at ${contact.company}`}
            </p>
          </div>
        </div>
        <button
          onClick={sendHeadsUp}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          <Send style={{ width: '13px', height: '13px' }} /> Send a heads-up
        </button>
      </div>

      {/* Vitals strip */}
      <div style={{ ...card, display: 'flex', gap: '28px', flexWrap: 'wrap', marginBottom: '20px', padding: '16px 22px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#5C6B73', marginBottom: '2px' }}>Relationship</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: health.color }}>{health.label}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#5C6B73', marginBottom: '2px' }}>Last touch</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>
            {contact.lastTouch ? (health.days === 0 ? 'Today' : `${health.days} days ago`) : 'Never'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#5C6B73', marginBottom: '2px' }}>Shared themes</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>{themes.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '11px', color: '#5C6B73', marginBottom: '2px' }}>Role</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>{contact.role} · {contact.company}</div>
        </div>
      </div>

      {/* Talking points — the headline section */}
      <div style={{ ...card, marginBottom: '20px', background: 'rgba(13,92,99,0.04)', border: '1px solid rgba(13,92,99,0.2)' }}>
        <div style={{ ...label, color: '#0D5C63' }}>
          <Lightbulb style={{ width: '13px', height: '13px' }} />
          Talking points
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {talkingPoints.length === 0 && (
            <p style={{ fontSize: '13px', color: '#5C6B73' }}>Add shared themes and notes to generate talking points.</p>
          )}
          {talkingPoints.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0D5C63', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
              <span style={{ fontSize: '13.5px', color: '#1C2B33', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Common ground this week */}
        <div style={card}>
          <div style={label}>
            <Compass style={{ width: '13px', height: '13px', color: '#0D5C63' }} />
            Your common ground, this week
            {loadingLive && <RefreshCw style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite', marginLeft: 'auto' }} />}
          </div>
          {themes.length === 0 && (
            <p style={{ fontSize: '13px', color: '#5C6B73' }}>No shared themes yet — add some on {first}'s profile.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {themeNews.map(({ theme, update }) => (
              <div key={theme.id}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0D5C63', marginBottom: '3px' }}>{theme.label}</div>
                {update ? (
                  <p style={{ fontSize: '12.5px', color: '#3E4B52', lineHeight: 1.55 }}>
                    {update.headline}
                    <span style={{ color: '#5C6B73', opacity: 0.75 }}> — {update.source}, {update.time}</span>
                    {update.link && (
                      <a href={update.link} target="_blank" rel="noreferrer" aria-label={`Read: ${update.headline}`} style={{ color: '#0D5C63', marginLeft: '6px', verticalAlign: 'middle', display: 'inline-flex' }}>
                        <ExternalLink style={{ width: '11px', height: '11px' }} />
                      </a>
                    )}
                  </p>
                ) : (
                  <p style={{ fontSize: '12.5px', color: '#5C6B73', opacity: 0.75 }}>Quiet this week — nothing new detected.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Where you left off + notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={card}>
            <div style={label}>
              <MessageCircle style={{ width: '13px', height: '13px', color: '#0D5C63' }} />
              Where you left off
            </div>
            {touches.length === 0 && <p style={{ fontSize: '13px', color: '#5C6B73' }}>No recorded touchpoints yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {touches.map(t => (
                <div key={t.id}>
                  <div style={{ fontSize: '11px', color: '#5C6B73', marginBottom: '2px' }}>
                    {daysSince(t.date) === 0 ? 'Today' : `${daysSince(t.date)} days ago`}{t.trigger ? ` · ${t.trigger}` : ''}
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#3E4B52', lineHeight: 1.5 }}>{t.message}</p>
                </div>
              ))}
            </div>
          </div>

          {contact.notes && (
            <div style={card}>
              <div style={label}>
                <StickyNote style={{ width: '13px', height: '13px', color: '#A97E2F' }} />
                Your notes
              </div>
              <p style={{ fontSize: '13px', color: '#3E4B52', lineHeight: 1.6 }}>{contact.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Openers */}
      <div style={card}>
        <div style={label}>
          <Calendar style={{ width: '13px', height: '13px', color: '#0D5C63' }} />
          Openers, if you need one
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {openers.map((o, i) => (
            <p key={i} style={{ fontSize: '13px', color: '#3E4B52', fontStyle: 'italic', lineHeight: 1.6 }}>{o}</p>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
