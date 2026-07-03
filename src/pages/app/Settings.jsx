import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Link2, Zap, Trash2, Check, Compass } from 'lucide-react'

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }

function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #E8EAED', paddingBottom: '12px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,102,194,0.1)' }}>
        <Icon style={{ width: '14px', height: '14px', color: '#0A66C2' }} />
      </div>
      <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1D2226', fontFamily: 'Inter, sans-serif' }}>{title}</h2>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
        border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
        background: checked ? '#0A66C2' : '#C7CDD3',
      }}
    >
      <span style={{
        position: 'absolute', width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', top: '2px', transition: 'left 0.2s',
        left: checked ? '20px' : '2px',
      }} />
    </button>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none',
          background: '#F3F4F6', border: '1px solid #DCE0E4',
          color: '#1D2226', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(10,102,194,0.4)'}
        onBlur={e => e.target.style.borderColor = '#DCE0E4'}
      />
    </div>
  )
}

const NOTIFICATIONS = [
  { key: 'email',    label: 'Email',           placeholder: 'your@email.com',    field: 'Email address' },
  { key: 'sms',      label: 'SMS',             placeholder: '+1 (555) 000-0000', field: 'Phone number' },
  { key: 'slack',    label: 'Slack',           placeholder: '@yourhandle',        field: 'Slack handle' },
  { key: 'whatsapp', label: 'WhatsApp',        placeholder: '+1 (555) 000-0000', field: 'Phone number' },
  { key: 'teams',    label: 'Microsoft Teams', placeholder: 'teams@email.com',   field: 'Teams email' },
]

const PLATFORMS = [
  { key: 'linkedin',  label: 'LinkedIn',  connected: true  },
  { key: 'instagram', label: 'Instagram', connected: true  },
  { key: 'x',         label: 'X',         connected: false },
  { key: 'tiktok',    label: 'TikTok',    connected: false },
  { key: 'gmail',     label: 'Gmail',     connected: true  },
  { key: 'outlook',   label: 'Outlook',   connected: false },
]

export default function Settings() {
  const [profile, setProfile] = useState({ name: 'Liam Carney', email: 'liamcarney21@gmail.com', timezone: 'America/Chicago' })
  const [notifToggles, setNotifToggles] = useState({ email: true, sms: true, slack: false, whatsapp: false, teams: false })
  const [notifValues, setNotifValues] = useState({ email: 'liamcarney21@gmail.com', sms: '', slack: '', whatsapp: '', teams: '' })
  const [connectedPlatforms, setConnectedPlatforms] = useState(Object.fromEntries(PLATFORMS.map(p => [p.key, p.connected])))
  const [autoSend, setAutoSend] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div
      style={{ minHeight: '100%', padding: '40px', fontFamily: 'Inter, sans-serif' }}
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#1D2226', marginBottom: '4px' }}>
            Settings
          </h1>
          <p style={{ fontSize: '13px', color: '#5E6774' }}>Manage your account and preferences</p>
        </div>
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: saved ? 'rgba(5,118,66,0.15)' : '#0A66C2',
            color: saved ? '#057642' : '#FFFFFF',
          }}
        >
          {saved ? <><Check style={{ width: '14px', height: '14px' }} /> Saved</> : 'Save Changes'}
        </button>
      </motion.div>

      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Profile */}
        <motion.section variants={fadeUp} style={{ borderRadius: '16px', padding: '24px', background: '#FFFFFF', border: '1px solid #E8EAED' }}>
          <SectionHeader icon={User} title="Profile" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, background: 'rgba(10,102,194,0.15)', color: '#0A66C2' }}>
              LC
            </div>
            <button style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #D5DADF', color: '#1D2226', background: 'none', cursor: 'pointer' }}>
              Change photo
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <InputField label="Full name" value={profile.name} onChange={v => setProfile(p => ({ ...p, name: v }))} placeholder="Your name" />
            <InputField label="Email" type="email" value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} placeholder="you@email.com" />
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#5E6774' }}>Timezone</label>
              <select
                value={profile.timezone}
                onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', outline: 'none', background: '#F3F4F6', border: '1px solid #DCE0E4', color: '#1D2226', fontFamily: 'Inter, sans-serif' }}
              >
                <option value="America/Chicago">America/Chicago (CT)</option>
                <option value="America/New_York">America/New_York (ET)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                <option value="America/Denver">America/Denver (MT)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>
        </motion.section>

        {/* Notification Preferences */}
        <motion.section variants={fadeUp} style={{ borderRadius: '16px', padding: '24px', background: '#FFFFFF', border: '1px solid #E8EAED' }}>
          <SectionHeader icon={Bell} title="Notification Preferences" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {NOTIFICATIONS.map(n => (
              <div key={n.key}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1D2226' }}>{n.label}</span>
                  <Toggle checked={notifToggles[n.key]} onChange={v => setNotifToggles(t => ({ ...t, [n.key]: v }))} />
                </div>
                {notifToggles[n.key] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <InputField
                      label={n.field}
                      value={notifValues[n.key]}
                      onChange={v => setNotifValues(vals => ({ ...vals, [n.key]: v }))}
                      placeholder={n.placeholder}
                    />
                  </motion.div>
                )}
                <div style={{ borderBottom: '1px solid #EEEFF1', marginTop: '12px' }} />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Connected Platforms */}
        <motion.section variants={fadeUp} style={{ borderRadius: '16px', padding: '24px', background: '#FFFFFF', border: '1px solid #E8EAED' }}>
          <SectionHeader icon={Link2} title="Connected Platforms" />
          <div>
            {PLATFORMS.map((p, i) => {
              const connected = connectedPlatforms[p.key]
              return (
                <div
                  key={p.key}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < PLATFORMS.length - 1 ? '1px solid #EEEFF1' : 'none' }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1D2226' }}>{p.label}</span>
                  {connected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(5,118,66,0.1)', color: '#057642' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#057642', display: 'inline-block' }} />
                        Connected
                      </span>
                      <button
                        onClick={() => setConnectedPlatforms(cp => ({ ...cp, [p.key]: false }))}
                        style={{ fontSize: '12px', color: '#5E6774', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConnectedPlatforms(cp => ({ ...cp, [p.key]: true }))}
                      style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', background: 'rgba(10,102,194,0.12)', color: '#0A66C2', border: '1px solid rgba(10,102,194,0.2)', fontFamily: 'Inter, sans-serif' }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </motion.section>

        {/* Auto-Send */}
        <motion.section variants={fadeUp} style={{ borderRadius: '16px', padding: '24px', background: '#FFFFFF', border: '1px solid #E8EAED' }}>
          <SectionHeader icon={Zap} title="Auto-Send" />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#5E6774' }}>
              When enabled, Harbored will automatically send drafted messages without requiring your approval.
              You can customize this per contact in My Network.
            </p>
            <Toggle checked={autoSend} onChange={setAutoSend} />
          </div>
          {autoSend && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', background: 'rgba(10,102,194,0.08)', color: '#0A66C2', border: '1px solid rgba(10,102,194,0.15)' }}
            >
              Auto-Send is active. Messages will be sent automatically when Harbored detects an event.
            </motion.div>
          )}
        </motion.section>

        {/* Product Tour */}
        <motion.section variants={fadeUp} style={{ borderRadius: '16px', padding: '24px', background: '#FFFFFF', border: '1px solid #E8EAED' }}>
          <SectionHeader icon={Compass} title="Product Tour" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#5E6774' }}>
              Replay the welcome walkthrough covering Common Ground and everything else Harbored does for your network.
            </p>
            <button
              onClick={() => { localStorage.removeItem('harbored_onboarded'); window.location.href = '/dashboard' }}
              style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', flexShrink: 0, background: 'rgba(10,102,194,0.1)', color: '#0A66C2', border: '1px solid rgba(10,102,194,0.25)', fontFamily: 'Inter, sans-serif' }}
            >
              Replay walkthrough
            </button>
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section variants={fadeUp} style={{ borderRadius: '16px', padding: '24px', background: 'rgba(204,16,22,0.03)', border: '1px solid rgba(204,16,22,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid rgba(204,16,22,0.1)', paddingBottom: '12px' }}>
            <Trash2 style={{ width: '16px', height: '16px', color: '#CC1016' }} />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#CC1016', fontFamily: 'Inter, sans-serif' }}>Danger Zone</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D2226', marginBottom: '4px' }}>Delete Account</p>
              <p style={{ fontSize: '12px', color: '#5E6774' }}>Permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginLeft: '16px', flexShrink: 0, background: 'none', border: '1px solid rgba(204,16,22,0.3)', color: '#CC1016', fontFamily: 'Inter, sans-serif' }}>
              Delete Account
            </button>
          </div>
        </motion.section>
      </div>
    </motion.div>
  )
}
