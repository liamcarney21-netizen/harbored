import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import WarmAvatar from '../../components/WarmAvatar'
import { useDataStore } from '../../store/dataStore'
import { statusFor } from '../../lib/status'
import Card, { PageTitle } from '../../ui/Card'
import Button from '../../ui/Button'
import { T } from '../../ui/tokens'

const ImportIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" />
    <path d="M6.5 15.5c.5-1.3 1.4-2 2.5-2s2 .7 2.5 2" /><path d="M14.5 9.5h4M14.5 13h3" />
  </svg>
)

export default function Network({ onImportContacts }) {
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = contacts.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q)
  )
  const needs = contacts.filter(c => statusFor(c).hot).length

  return (
    <div style={{ width: '100%', padding: `18px ${T.gutter}px 32px` }}>
      <PageTitle
        title="Your crew"
        sub={contacts.length === 0
          ? 'Nobody yet'
          : `${contacts.length} ${contacts.length === 1 ? 'person' : 'people'}${needs > 0 ? ` · ${needs} need${needs === 1 ? 's' : ''} attention` : ''}`}
      />

      <Button size="lg" full icon={ImportIcon} onClick={onImportContacts} style={{ marginTop: 22 }}>
        Import from Contacts
      </Button>

      {contacts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 14px', marginTop: 18,
          borderRadius: 13, background: T.card, border: `1px solid ${T.hairline}`,
        }}>
          <Search style={{ width: 15, height: 15, color: T.muted, flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Search your people"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search your people"
            style={{ background: 'transparent', outline: 'none', border: 'none', fontSize: 16, color: T.ink, width: '100%', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {contacts.length === 0 ? (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: T.body, marginTop: 22, textAlign: 'center' }}>
          Bring in the people you want to stay close to. Harbored only watches the ones you choose.
        </p>
      ) : (
        <Card flush style={{ marginTop: 14 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: T.muted }}>No one matches “{search}”</div>
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
                  display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
                  padding: '14px 18px', minHeight: 44, cursor: 'pointer',
                  background: 'none', border: 'none', fontFamily: 'inherit',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.hairline}` : 'none',
                }}
              >
                <WarmAvatar initials={c.initials} size="md" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{c.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: status.hot ? T.accent : T.muted, fontWeight: status.hot ? 600 : 400 }}>
                    {status.hot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {status.text}{themeCount > 0 ? ` · ${themeCount} theme${themeCount === 1 ? '' : 's'}` : ' · no themes yet'}
                    </span>
                  </span>
                </div>
                <ChevronRight style={{ width: 15, height: 15, color: T.muted, flexShrink: 0 }} />
              </button>
            )
          })}
        </Card>
      )}
    </div>
  )
}
