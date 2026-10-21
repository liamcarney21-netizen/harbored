import { useState } from 'react'
import { Smartphone, Check, Users, Sparkles } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { useDemoStore } from '../store/demoStore'
import { parseVCard } from '../services/vcard'
import { SAMPLE_VCARD } from '../data/sampleContacts'
import { isNativeContactsAvailable, pickNativeContacts, openContactSettings } from '../services/contacts'
import { haptic } from '../services/haptics'
import ThinkingMark from './ThinkingMark'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { ErrorText } from '../ui/Field'
import { T } from '../ui/tokens'

const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

export default function ImportContactsModal({ open, onClose, onImported, onAddManually }) {
  const contacts = useDataStore(s => s.contacts)
  const addContact = useDataStore(s => s.addContact)
  const demoActive = useDemoStore(s => s.active)

  const [candidates, setCandidates] = useState(null) // null = nothing picked yet
  const [selected, setSelected] = useState(new Set())
  const [skippedCount, setSkippedCount] = useState(0)
  const [error, setError] = useState('')
  const [loadingNative, setLoadingNative] = useState(false)
  const [limitedAccess, setLimitedAccess] = useState(false)
  const [query, setQuery] = useState('')

  const nativeContacts = isNativeContactsAvailable()

  function reset() {
    setCandidates(null)
    setSelected(new Set())
    setSkippedCount(0)
    setError('')
    setLoadingNative(false)
    setLimitedAccess(false)
    setQuery('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  // Dedupe on name plus whichever of phone/email is present, so two people
  // who share a name don't collapse into one.
  function identity(c) {
    const name = (c.name || '').trim().toLowerCase()
    const extra = (c.phone || c.email || '').replace(/[^+\w@.]/g, '').toLowerCase()
    return `${name}|${extra}`
  }

  function ingest(parsed) {
    const existing = new Set(contacts.map(identity))
    const seen = new Set()
    const fresh = []
    let skipped = 0
    for (const c of parsed) {
      const key = identity(c)
      if (existing.has(key) || seen.has(key)) { skipped++; continue }
      seen.add(key)
      fresh.push(c)
    }
    if (!fresh.length && !skipped) {
      setError('No contacts with a name were found.')
      return
    }
    setCandidates(fresh)
    // A short list means the person already hand-picked these (the iOS limited
    // picker, or the web picker) — check them all. A whole address book starts
    // unchecked: choosing who belongs in the crew is the point.
    setSelected(fresh.length <= 12 ? new Set(fresh.map((_, i) => i)) : new Set())
    setSkippedCount(skipped)
    setError('')
    setQuery('')
  }

  function handleSample() {
    setError('')
    ingest(parseVCard(SAMPLE_VCARD))
  }

  async function handleNativeContacts() {
    setError('')
    setLoadingNative(true)
    try {
      const { contacts: parsed, limited } = await pickNativeContacts()
      setLimitedAccess(limited)
      if (!parsed.length) {
        setError(limited
          ? "iOS isn't sharing any contacts with Harbored yet — allow full access in Settings → Harbored → Contacts."
          : 'No contacts with a name were found.')
        return
      }
      ingest(parsed)
    } catch (err) {
      setError(err?.message || 'Could not read your contacts.')
    } finally {
      setLoadingNative(false)
    }
  }

  async function handlePickContacts() {
    setError('')
    try {
      const picked = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true })
      ingest(picked.map(p => ({
        name: (p.name && p.name[0]) || '',
        email: (p.email && p.email[0]) || '',
        phone: (p.tel && p.tel[0]) || '',
        role: '',
        company: '',
      })))
    } catch {
      // user cancelled the picker — not an error
    }
  }

  function toggle(i) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  function handleImport() {
    const created = []
    candidates.forEach((c, i) => { if (selected.has(i)) created.push(addContact(c)) })
    handleClose()
    if (created.length) { haptic.success(); onImported?.(created) }
  }

  const q = query.trim().toLowerCase()
  const shown = (candidates || [])
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !q || [c.name, c.company, c.email].some(v => v && v.toLowerCase().includes(q)))
  const allShownSelected = shown.length > 0 && shown.every(({ i }) => selected.has(i))
  const toggleShown = () => setSelected(s => {
    const next = new Set(s)
    shown.forEach(({ i }) => allShownSelected ? next.delete(i) : next.add(i))
    return next
  })

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Import contacts"
      sub="Bring your people in at once."
      icon={<Users style={{ width: 15, height: 15 }} />}
      footer={candidates ? <>
        <Button variant="secondary" size="md" onClick={reset}>Back</Button>
        <Button size="md" onClick={handleImport} disabled={selected.size === 0} icon={<Check style={{ width: 14, height: 14 }} />}>
          Import {selected.size || ''} {selected.size === 1 ? 'person' : 'people'}
        </Button>
      </> : null}
    >
      {!candidates && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {demoActive && (
            <>
              <Button size="lg" full icon={<Sparkles style={{ width: 15, height: 15 }} />} onClick={handleSample}>Load a sample crew</Button>
              <p style={{ fontSize: 12, color: T.muted, marginTop: -4, lineHeight: 1.5 }}>
                Try the import with realistic example contacts — nothing is saved in the demo.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                <span style={{ flex: 1, height: 1, background: T.hairline }} />
                <span style={{ fontSize: 11, color: T.muted }}>or use your own</span>
                <span style={{ flex: 1, height: 1, background: T.hairline }} />
              </div>
            </>
          )}
          {nativeContacts && loadingNative && (
            <div style={{ padding: '18px 14px', borderRadius: 12, background: T.accentSoft, border: `1px solid ${T.accentLine}` }}>
              <ThinkingMark size={13} label="Reading your contacts…" labelStyle={{ fontSize: 13, color: T.ink }} />
              <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, margin: '8px 0 0' }}>
                A big address book takes a few seconds. Nothing is saved until you choose who to keep.
              </p>
            </div>
          )}
          {nativeContacts && !loadingNative && (
            <Button size="lg" full icon={<Smartphone style={{ width: 15, height: 15 }} />} onClick={handleNativeContacts}>Pick from your contacts</Button>
          )}
          {!nativeContacts && hasContactPicker && (
            <Button size="lg" full variant={demoActive ? 'secondary' : 'primary'} icon={<Smartphone style={{ width: 15, height: 15 }} />} onClick={handlePickContacts}>
              Pick from your phone's contacts
            </Button>
          )}
          {!nativeContacts && !hasContactPicker && (
            <div>
              <p style={{ fontSize: 13, color: T.body, lineHeight: 1.55, margin: 0 }}>
                One-tap import lives in the Harbored iPhone app, straight from your contacts. Here on the web, add your people by hand — a name is enough to start.
              </p>
              <Button size="lg" full variant={demoActive ? 'secondary' : 'primary'} onClick={() => { handleClose(); onAddManually?.() }} style={{ marginTop: 12 }}>
                Add someone by hand
              </Button>
            </div>
          )}
          {nativeContacts && !loadingNative && (
            <Button variant="ghost" size="sm" onClick={() => { handleClose(); onAddManually?.() }}>Or add someone by hand</Button>
          )}
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      {candidates && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {limitedAccess && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: T.accentSoft, border: `1px solid ${T.accentLine}` }}>
              <p style={{ fontSize: 12, color: T.body, lineHeight: 1.55, margin: 0 }}>
                iOS is sharing only {candidates.length === 1 ? 'one contact' : `${candidates.length} contacts`} with Harbored. To bring in more of your people, switch Contacts access to &ldquo;Full&rdquo; in Settings, then import again.
              </p>
              <Button variant="secondary" size="sm" onClick={openContactSettings} style={{ marginTop: 8 }}>Open Settings</Button>
            </div>
          )}
          {skippedCount > 0 && (
            <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
              {skippedCount === 1 ? 'One person is' : `${skippedCount} people are`} already in your crew, so they&rsquo;re not shown here.
            </p>
          )}
          {candidates.length === 0 ? (
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Everyone there is already in your crew.</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: T.body, lineHeight: 1.5, margin: 0 }}>
                Tap the people you actually want to keep close — a handful is a great start.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={`Search ${candidates.length} contacts…`}
                  aria-label="Search contacts"
                  style={{
                    flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, fontSize: 16,
                    background: T.ground, border: `1px solid ${T.hairlineStrong}`, color: T.ink, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <Button variant="secondary" size="sm" onClick={toggleShown} style={{ color: T.accent, borderColor: T.accentLine }}>
                  {allShownSelected ? 'Clear' : q ? 'Select these' : 'Select all'}
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {shown.length === 0 && (
                  <p style={{ fontSize: 13, color: T.muted, padding: '8px 2px', margin: 0 }}>No one matches &ldquo;{query}&rdquo;.</p>
                )}
                {shown.map(({ c, i }) => (
                  <label key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', minHeight: 44,
                    borderRadius: 10, border: `1px solid ${T.hairline}`, cursor: 'pointer',
                    background: selected.has(i) ? T.accentSoft : 'transparent',
                  }}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ accentColor: T.accent, width: 18, height: 18 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[c.company, c.phone || c.email].filter(Boolean).join(' · ') || 'No phone or email'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
