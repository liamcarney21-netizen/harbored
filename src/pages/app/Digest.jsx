import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Mail, Compass, Waves, Send, TrendingUp } from 'lucide-react'
import Avatar from '../../components/Avatar'
import { themeUpdates, SIGNIFICANCE_THRESHOLD } from '../../data/commonGround'
import { useDataStore, selectNudges, daysSince } from '../../store/dataStore'

const DAY = 86400000

function weekRange() {
  const now = new Date()
  const start = new Date(now.getTime() - 6 * DAY)
  const fmt = d => d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(now)}`
}

export default function Digest() {
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const touches = useDataStore(s => s.touches)
  const nudges = selectNudges({ contacts })

  const opportunities = themeUpdates.filter(u => u.score >= SIGNIFICANCE_THRESHOLD)
  const sendsThisWeek = touches.filter(t => daysSince(t.date) < 7).length
  const themeCount = Object.values(themesByContact).reduce((n, t) => n + t.length, 0)

  function emailDigest() {
    const lines = [
      `HARBORED — YOUR WEEK IN RELATIONSHIPS (${weekRange()})`,
      '',
      `Reasons to reach out this week:`,
      ...opportunities.slice(0, 5).map(u => `• ${u.contactName} — ${u.headline} (significance ${u.score})`),
      '',
      `Drifting quietly:`,
      ...nudges.slice(0, 4).map(n => `• ${n.contact.name} — ${n.health.days} days since your last touchpoint`),
      '',
      `This week: ${sendsThisWeek} messages sent · ${themeCount} themes monitored · ${opportunities.length} reach-out opportunities`,
      '',
      'Open Harbored to act on these: https://harbored-three.vercel.app/dashboard',
    ]
    const params = new URLSearchParams()
    params.set('subject', `Harbored digest — ${weekRange()}`)
    params.set('body', lines.join('\n'))
    window.location.href = `mailto:liamcarney21@gmail.com?${params.toString().replace(/\+/g, '%20')}`
  }

  const card = { borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E6E2D8' }
  const sectionLabel = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#5C6B73', marginBottom: '12px' }

  return (
    <motion.div
      style={{ minHeight: '100%', padding: 'clamp(20px, 4vw, 40px)', fontFamily: 'Inter, sans-serif', maxWidth: '760px' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '27px', fontWeight: 600, color: '#1C2B33', marginBottom: '4px' }}>Weekly Digest</h1>
          <p style={{ fontSize: '13px', color: '#5C6B73' }}>Your week in relationships · {weekRange()}</p>
        </div>
        <button
          onClick={emailDigest}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          <Mail style={{ width: '13px', height: '13px' }} /> Email me this digest
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Messages sent this week', value: sendsThisWeek, icon: Send },
          { label: 'Reach-out opportunities', value: opportunities.length, icon: Compass },
          { label: 'Themes monitored', value: themeCount, icon: TrendingUp },
          { label: 'Drifting relationships', value: nudges.length, icon: Waves },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{ ...card, padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, color: '#5C6B73' }}>{label}</span>
              <Icon style={{ width: '13px', height: '13px', color: '#0D5C63', flexShrink: 0 }} />
            </div>
            <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '30px', fontWeight: 600, color: '#1C2B33', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Reasons to reach out */}
      <div style={sectionLabel}>
        <Compass style={{ width: '13px', height: '13px', color: '#0D5C63' }} />
        Reasons to reach out this week
      </div>
      <div style={{ ...card, overflow: 'hidden', marginBottom: '28px' }}>
        {opportunities.slice(0, 5).map((u, i) => (
          <div
            key={u.id}
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', cursor: 'pointer',
              borderBottom: i < Math.min(opportunities.length, 5) - 1 ? '1px solid #EEEBE3' : 'none',
            }}
          >
            <Avatar initials={u.contactInitials} color={u.contactColor} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>{u.contactName}</span>
              <p style={{ fontSize: '12px', color: '#5C6B73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.headline}</p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0D5C63', flexShrink: 0 }}>{u.score}</span>
          </div>
        ))}
      </div>

      {/* Drifting */}
      {nudges.length > 0 && (
        <>
          <div style={sectionLabel}>
            <Waves style={{ width: '13px', height: '13px', color: '#A97E2F' }} />
            Drifting quietly
          </div>
          <div style={{ ...card, overflow: 'hidden', marginBottom: '28px' }}>
            {nudges.slice(0, 4).map((n, i) => (
              <div
                key={n.contact.id}
                onClick={() => navigate(`/dashboard/contact/${n.contact.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', cursor: 'pointer',
                  borderBottom: i < Math.min(nudges.length, 4) - 1 ? '1px solid #EEEBE3' : 'none',
                }}
              >
                <Avatar initials={n.contact.initials} color={n.contact.color} size="sm" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>{n.contact.name}</span>
                  <p style={{ fontSize: '12px', color: '#5C6B73' }}>{n.contact.role} · {n.contact.company}</p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: n.health.color, flexShrink: 0 }}>{n.health.days} days</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ fontSize: '12px', color: '#5C6B73', opacity: 0.75, lineHeight: 1.6 }}>
        "Email me this digest" opens a prefilled email you can send to yourself. Automatic Monday-morning
        delivery arrives with Harbored's email integration.
      </p>
    </motion.div>
  )
}
