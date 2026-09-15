import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import WarmAvatar from '../../components/WarmAvatar'
import { useDataStore, healthFromLastTouch, daysUntilBirthday } from '../../store/dataStore'

const INK = '#F5F4EF'
const MUTED = '#8C9AAD'
const ACCENT = '#D3A95C'
const CARD = '#0f2040'

// Plain-language status — one line, coral only when it needs attention.
function statusFor(contact) {
  const bdays = daysUntilBirthday(contact.birthday)
  if (bdays === 0) return { text: 'Birthday today', hot: true }
  if (bdays === 1) return { text: 'Birthday tomorrow', hot: true }
  const health = healthFromLastTouch(contact.lastTouch)
  if (!contact.lastTouch) return { text: 'No touchpoints yet', hot: false }
  if (health.days >= 45) return { text: `Drifting · ${health.days} days quiet`, hot: true }
  if (health.days >= 21) return { text: `Quiet · ${health.days} days`, hot: false }
  return { text: `In touch · ${health.days === 0 ? 'today' : `${health.days}d ago`}`, hot: false }
}

export default function Network({ onAddContact, onImportContacts }) {
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const [search, setSearch] = useState('')

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q)
      || (c.company || '').toLowerCase().includes(q)
      || (c.role || '').toLowerCase().includes(q)
  })
  const withNews = contacts.filter(c => statusFor(c).hot).length

  return (
    <div style={{ width: '100%', maxWidth: '520px', alignSelf: 'center', padding: '18px 24px 32px' }}>

      <h1 className="hb-display" style={{ fontSize: '30px', fontWeight: 500, color: INK, lineHeight: 1.1 }}>
        Your crew
      </h1>
      <p style={{ fontSize: '13px', color: MUTED, marginTop: '8px' }}>
        {contacts.length} watched{withNews > 0 ? ` · ${withNews} need${withNews === 1 ? 's' : ''} attention` : ''}
      </p>

      <button
        className="hb-cta hb-press"
        onClick={onImportContacts}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          width: '100%', height: '54px', borderRadius: '14px', border: 'none', cursor: 'pointer',
          marginTop: '22px',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" />
          <path d="M6.5 15.5c.5-1.3 1.4-2 2.5-2s2 .7 2.5 2" /><path d="M14.5 9.5h4M14.5 13h3" />
        </svg>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0a1628' }}>
          Import from Contacts
        </span>
      </button>
      <div style={{ fontSize: '12px', color: MUTED, textAlign: 'center', marginTop: '10px' }}>
        or{' '}
        <button
          className="hb-press"
          onClick={onAddContact}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontFamily: 'inherit', fontSize: '12px', textDecoration: 'underline', padding: 0 }}
        >
          add someone by hand
        </button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', height: '46px', padding: '0 14px',
        borderRadius: '13px', background: CARD, border: '1px solid rgba(255,255,255,0.08)', marginTop: '18px',
      }}>
        <Search style={{ width: 15, height: 15, color: MUTED, flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search your people"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'transparent', outline: 'none', border: 'none',
            fontSize: '16px', color: INK, width: '100%', fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', marginTop: '14px', overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: '12px', color: MUTED }}>
            no one found
          </div>
        )}
        {filtered.map((c, i) => {
          const status = statusFor(c)
          const themeCount = (themesByContact[c.id] || []).length
          return (
            <button
              key={c.id}
              className="hb-press"
              onClick={() => navigate(`/dashboard/contact/${c.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '13px', width: '100%', textAlign: 'left',
                padding: '14px 18px', minHeight: '44px', cursor: 'pointer',
                background: 'none', border: 'none', fontFamily: 'inherit',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              <WarmAvatar initials={c.initials} size="md" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: INK }}>
                  {c.name}
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', color: status.hot ? ACCENT : MUTED, fontWeight: status.hot ? 600 : 400,
                }}>
                  {status.hot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {status.text}{themeCount > 0 ? ` · ${themeCount} theme${themeCount === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
              </div>
              <ChevronRight style={{ width: 15, height: 15, color: '#6E7C92', flexShrink: 0 }} />
            </button>
          )
        })}
      </div>

    </div>
  )
}
