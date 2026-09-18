import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, Check, Users, Sparkles } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { useDemoStore } from '../store/demoStore'
import { parseVCard } from '../services/vcard'
import { SAMPLE_VCARD } from '../data/sampleContacts'
import { isNativeContactsAvailable, pickNativeContacts, openContactSettings } from '../services/contacts'

const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

export default function ImportContactsModal({ open, onClose, onImported, onAddManually }) {
  const contacts = useDataStore(s => s.contacts)
  const addContact = useDataStore(s => s.addContact)
  const demoActive = useDemoStore(s => s.active)

  const [candidates, setCandidates] = useState(null) // null = nothing picked yet
  const [selected, setSelected] = useState(new Set())
  const [skippedCount, setSkippedCount] = useState(0)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [loadingNative, setLoadingNative] = useState(false)
  const [limitedAccess, setLimitedAccess] = useState(false)
  const [query, setQuery] = useState('')

  const nativeContacts = isNativeContactsAvailable()

  function reset() {
    setCandidates(null)
    setSelected(new Set())
    setSkippedCount(0)
    setError('')
    setImporting(false)
    setLoadingNative(false)
    setLimitedAccess(false)
    setQuery('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function ingest(parsed) {
    const existingNames = new Set(contacts.map(c => c.name.trim().toLowerCase()))
    const fresh = []
    let skipped = 0
    const seenInFile = new Set()
    for (const c of parsed) {
      const key = c.name.trim().toLowerCase()
      if (existingNames.has(key) || seenInFile.has(key)) { skipped++; continue }
      seenInFile.add(key)
      fresh.push(c)
    }
    if (!fresh.length && !skipped) {
      setError('No contacts with a name were found.')
      return
    }
    setCandidates(fresh)
    // A short list means the person already hand-picked these (the iOS limited
    // picker, or the web picker) — check them all. A whole address book starts
    // unchecked: choosing who belongs in the crew is the point, and "import
    // everyone" stays one tap away via Select all.
    setSelected(fresh.length <= 12 ? new Set(fresh.map((_, i) => i)) : new Set())
    setSkippedCount(skipped)
    setError('')
    setQuery('')
  }

  // Demo convenience: run a realistic sample export through the real parser
  // so the import flow is completable without a real address book on hand.
  function handleSample() {
    setError('')
    ingest(parseVCard(SAMPLE_VCARD))
  }

  // Native iOS path: the system contacts permission prompt + address book,
  // normalized into the same candidate list the vCard/web paths feed.
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
      const parsed = picked.map(p => ({
        name: (p.name && p.name[0]) || '',
        email: (p.email && p.email[0]) || '',
        phone: (p.tel && p.tel[0]) || '',
        role: '',
        company: '',
      }))
      ingest(parsed)
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
    setImporting(true)
    const created = []
    candidates.forEach((c, i) => {
      if (selected.has(i)) created.push(addContact(c))
    })
    setImporting(false)
    handleClose()
    // Hand the new contacts to the theme composer so people set themes right after
    // importing, instead of landing empty.
    if (created.length) onImported?.(created)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 61, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px', pointerEvents: 'none',
          }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{
              pointerEvents: 'auto',
              width: 'min(520px, 100%)', maxHeight: '100%', overflowY: 'auto',
              background: '#0f2040', borderRadius: '16px', boxShadow: '0 14px 44px -8px rgba(28,43,51,0.24), 0 3px 10px rgba(28,43,51,0.10)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(211,169,92,0.08)' }}>
                  <Users style={{ width: '15px', height: '15px', color: '#D3A95C' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F4EF' }}>Import contacts</div>
                  <div style={{ fontSize: '12px', color: '#8C9AAD' }}>Skip the typing — bring your people in at once.</div>
                </div>
              </div>
              <button onClick={handleClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C9AAD', padding: '4px' }}>
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!candidates && (
                <>
                  {demoActive && (
                    <>
                      <button className="hb-press" onClick={handleSample} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                        background: '#D3A95C', color: '#0a1628', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                        <Sparkles style={{ width: '15px', height: '15px' }} /> Load a sample crew
                      </button>
                      <p style={{ fontSize: '12px', color: '#8C9AAD', marginTop: '-6px', lineHeight: 1.5 }}>
                        Try the import with realistic example contacts — nothing is saved in the demo.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                        <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ fontSize: '11px', color: '#8C9AAD', opacity: 0.7 }}>or use your own</span>
                        <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                    </>
                  )}
                  {nativeContacts && (
                    <button className="hb-press" onClick={handleNativeContacts} disabled={loadingNative} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                      background: '#D3A95C', color: '#0a1628', border: 'none',
                      cursor: loadingNative ? 'default' : 'pointer', opacity: loadingNative ? 0.7 : 1, fontFamily: 'Inter, sans-serif',
                    }}>
                      <Smartphone style={{ width: '15px', height: '15px' }} />
                      {loadingNative ? 'Opening Contacts…' : 'Pick from your contacts'}
                    </button>
                  )}
                  {!nativeContacts && hasContactPicker && (
                    <button className="hb-press" onClick={handlePickContacts} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                      background: demoActive ? 'none' : '#D3A95C', color: demoActive ? '#D3A95C' : '#0a1628',
                      border: demoActive ? '1px solid rgba(211,169,92,0.4)' : 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <Smartphone style={{ width: '15px', height: '15px' }} /> Pick from your phone's contacts
                    </button>
                  )}
                  {!nativeContacts && !hasContactPicker && (
                    <div>
                      <p style={{ fontSize: '13px', color: '#C2CBD8', lineHeight: 1.55 }}>
                        One-tap import lives in the Harbored iPhone app, straight from your
                        contacts. On the web, add your people by hand — a name is enough to start.
                      </p>
                      <button className="hb-press" onClick={() => { handleClose(); onAddManually?.() }} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                        marginTop: '12px',
                        background: demoActive ? 'none' : '#D3A95C',
                        color: demoActive ? '#D3A95C' : '#0a1628',
                        border: demoActive ? '1px solid rgba(211,169,92,0.4)' : 'none',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                        Add someone by hand
                      </button>
                    </div>
                  )}

                  {error && <p style={{ fontSize: '12px', color: '#E8867A' }}>{error}</p>}
                </>
              )}

              {candidates && (
                <>
                  {limitedAccess && (
                    <div style={{
                      padding: '12px 14px', borderRadius: '10px',
                      background: 'rgba(211,169,92,0.07)', border: '1px solid rgba(211,169,92,0.25)',
                    }}>
                      <p style={{ fontSize: '12px', color: '#C2CBD8', lineHeight: 1.55 }}>
                        iOS is sharing only {candidates.length === 1 ? 'one contact' : `${candidates.length} contacts`} with
                        Harbored. To bring in more of your people, switch Contacts access to
                        &ldquo;Full&rdquo; in Settings, then import again.
                      </p>
                      <button className="hb-press" onClick={openContactSettings} style={{
                        marginTop: '8px', padding: '7px 12px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600, background: 'none', color: '#D3A95C',
                        border: '1px solid rgba(211,169,92,0.4)', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                        Open Settings
                      </button>
                    </div>
                  )}
                  {skippedCount > 0 && (
                    <p style={{ fontSize: '12px', color: '#8C9AAD' }}>
                      {skippedCount === 1 ? 'One contact is' : `${skippedCount} contacts are`} already in your crew, so they&rsquo;re not shown here.
                    </p>
                  )}
                  {candidates.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#8C9AAD' }}>Everyone there is already in your crew.</p>
                  ) : (() => {
                    const q = query.trim().toLowerCase()
                    const shown = candidates
                      .map((c, i) => ({ c, i }))
                      .filter(({ c }) => !q || [c.name, c.company, c.email].some(v => v && v.toLowerCase().includes(q)))
                    const allShownSelected = shown.length > 0 && shown.every(({ i }) => selected.has(i))
                    const toggleShown = () => setSelected(s => {
                      const next = new Set(s)
                      shown.forEach(({ i }) => allShownSelected ? next.delete(i) : next.add(i))
                      return next
                    })
                    return (
                      <>
                        <p style={{ fontSize: '13px', color: '#C2CBD8', lineHeight: 1.5, margin: 0 }}>
                          Tap the people you actually want to keep close — a handful is a great start.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={`Search ${candidates.length} contacts…`}
                            style={{
                              flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                              color: '#F5F4EF', fontFamily: 'Inter, sans-serif', outline: 'none',
                            }}
                          />
                          <button onClick={toggleShown} style={{
                            padding: '9px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                            background: 'none', color: '#D3A95C', border: '1px solid rgba(211,169,92,0.4)',
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
                          }}>
                            {allShownSelected ? 'Clear' : q ? 'Select these' : 'Select all'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                          {shown.length === 0 && (
                            <p style={{ fontSize: '13px', color: '#8C9AAD', padding: '8px 2px' }}>No one matches &ldquo;{query}&rdquo;.</p>
                          )}
                          {shown.map(({ c, i }) => (
                            <label key={i} style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                              borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                              background: selected.has(i) ? 'rgba(211,169,92,0.04)' : 'transparent',
                            }}>
                              <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ accentColor: '#D3A95C' }} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F4EF' }}>{c.name}</div>
                                <div style={{ fontSize: '12px', color: '#8C9AAD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {[c.company, c.email].filter(Boolean).join(' · ') || 'No extra details'}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Footer */}
            {candidates && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={reset}
                  style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#C2CBD8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Back
                </button>
                <button onClick={handleImport} disabled={selected.size === 0 || importing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    background: selected.size > 0 ? '#D3A95C' : '#C6C0B3', color: '#0a1628', border: 'none',
                    cursor: selected.size > 0 ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif',
                  }}>
                  <Check style={{ width: '13px', height: '13px' }} />
                  Import {selected.size || ''} contact{selected.size === 1 ? '' : 's'}
                </button>
              </div>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
