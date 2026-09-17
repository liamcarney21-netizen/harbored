import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import { useDemoStore } from '../../store/demoStore'
import WarmAvatar from '../../components/WarmAvatar'
import { useIsMobile } from '../../hooks/useIsMobile'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiBase'

const INK = '#F5F4EF'
const MUTED = '#8C9AAD'
const ACCENT = '#D3A95C'
const CARD = '#0f2040'
const HAIRLINE = 'rgba(255,255,255,0.08)'

function Toggle({ checked, onChange, label }) {
  return (
    <button
      className="hb-press"
      onClick={() => onChange(!checked)}
      aria-label={label}
      aria-pressed={checked}
      style={{
        position: 'relative', width: '44px', height: '26px', borderRadius: '13px',
        border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
        background: checked ? ACCENT : 'rgba(255,255,255,0.15)',
      }}
    >
      <span style={{
        position: 'absolute', width: '20px', height: '20px', borderRadius: '50%',
        background: '#0a1628', top: '3px', transition: 'left 0.2s',
        left: checked ? '21px' : '3px',
      }} />
    </button>
  )
}

// A row that never crams: label + optional sub stacked on the left (free to
// wrap), one fixed-width control on the right.
function Row({ title, sub, control, last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px',
      minHeight: '44px', borderBottom: last ? 'none' : `1px solid ${HAIRLINE}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: INK }}>{title}</div>
        {sub && <div style={{ fontSize: '12px', color: MUTED, marginTop: '3px', lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function GhostButton({ children, onClick, tone = 'default' }) {
  const color = tone === 'danger' ? '#E8867A' : INK
  return (
    <button
      className="hb-press"
      onClick={onClick}
      style={{
        padding: '9px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
        background: 'none', color, border: `1px solid ${tone === 'danger' ? 'rgba(232,134,122,0.35)' : 'rgba(255,255,255,0.2)'}`,
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const contacts = useDataStore(s => s.contacts)
  const clearSampleData = useDataStore(s => s.clearSampleData)
  const restoreSampleData = useDataStore(s => s.restoreSampleData)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const demoActive = useDemoStore(s => s.active)
  const sampleCount = contacts.filter(c => c.seed).length
  const [pushOn, setPushOn] = useState(true)
  const [digestOn, setDigestOn] = useState(true)

  const email = user?.email || (demoActive ? 'demo@harbored.app' : '')
  const initials = (email[0] || 'H').toUpperCase()

  async function handleSignOut() {
    if (demoActive) { navigate('/'); return }
    await logout()
    navigate('/login')
  }

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteAccount() {
    const ok = window.confirm(
      'Delete your Harbored account? Your people, themes, and history are removed permanently. This cannot be undone.'
    )
    if (!ok) return
    // In the demo there is no account — deleting just wipes the sample state.
    if (demoActive) { localStorage.clear(); window.location.href = '/'; return }
    setDeleting(true)
    setDeleteError('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('Your session expired — sign in again first.')
      const res = await fetch(apiUrl('/api/delete-account'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Deletion failed — try again in a moment.')
      }
      localStorage.clear()
      await supabase.auth.signOut().catch(() => {})
      window.location.href = '/'
    } catch (e) {
      setDeleteError(e.message)
      setDeleting(false)
    }
  }

  return (
    // Phone: one column. Desktop: identity on the left, settings wide right.
    <div style={isMobile
      ? { width: '100%', maxWidth: '620px', alignSelf: 'center', padding: '18px 24px 32px' }
      : {
        display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '64px', alignItems: 'start',
        width: '100%', maxWidth: '1120px', alignSelf: 'center', padding: '40px 48px 48px',
      }}>

      <div>
      <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.1 }}>
        You
      </h1>
      <p style={{ fontSize: '13px', color: MUTED, marginTop: '8px' }}>
        Account, notifications, and your data
      </p>

      {/* Account */}
      <div style={{ background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', marginTop: '22px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px' }}>
          <WarmAvatar initials={initials} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {demoActive ? 'Demo account' : (email || 'Signed in')}
            </div>
            <div style={{ fontSize: '12px', color: MUTED, marginTop: '3px' }}>
              {contacts.length} people &middot; watched quietly
            </div>
          </div>
        </div>
        <div style={{ padding: '0 18px 16px' }}>
          <GhostButton onClick={handleSignOut}>{demoActive ? 'Leave the demo' : 'Sign out'}</GhostButton>
        </div>
      </div>
      </div>

      <div>
      {/* Notifications */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: isMobile ? '24px 0 10px' : '0 0 10px', paddingLeft: '4px' }}>
        Notifications
      </div>
      <div style={{ background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', overflow: 'hidden' }}>
        <Row
          title="Push notifications"
          sub="Only when a reason clears the bar — never noise"
          control={<Toggle checked={pushOn} onChange={setPushOn} label="Push notifications" />}
        />
        <Row
          title="Weekly digest"
          sub={email ? `Sunday mornings to ${email}` : 'A Sunday-morning summary by email'}
          control={<Toggle checked={digestOn} onChange={setDigestOn} label="Weekly digest" />}
          last
        />
      </div>

      {/* Your data */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '24px 0 10px', paddingLeft: '4px' }}>
        Your data
      </div>
      <div style={{ background: CARD, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', overflow: 'hidden' }}>
        <Row
          title="Replay the walkthrough"
          sub="The first-run tour of how Harbored works"
          control={
            <GhostButton onClick={() => { localStorage.removeItem('harbored_onboarded'); if (user) localStorage.removeItem(`harbored_onboarded_${user.id}`); window.location.href = '/dashboard' }}>
              Replay
            </GhostButton>
          }
        />
        <Row
          title="Sample contacts"
          sub={sampleCount > 0
            ? `${sampleCount} examples loaded — clearing them never touches your own people`
            : 'Cleared — restore any time to explore'}
          control={sampleCount > 0
            ? <GhostButton onClick={clearSampleData}>Clear</GhostButton>
            : <GhostButton onClick={restoreSampleData}>Restore</GhostButton>}
          last
        />
      </div>

      {/* Danger */}
      <div style={{ background: 'rgba(232,134,122,0.05)', border: '1px solid rgba(232,134,122,0.2)', borderRadius: '16px', marginTop: '24px', overflow: 'hidden' }}>
        <Row
          title="Delete account"
          sub={deleteError || 'Removes your account and every piece of data, permanently'}
          control={
            <GhostButton tone="danger" onClick={deleting ? undefined : handleDeleteAccount}>
              {deleting ? 'Deleting…' : 'Delete'}
            </GhostButton>
          }
          last
        />
      </div>
      </div>

    </div>
  )
}
