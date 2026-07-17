import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Smartphone, Check, Users, Sparkles } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { useDemoStore } from '../store/demoStore'
import { parseVCard } from '../services/vcard'
import { SAMPLE_VCARD } from '../data/sampleContacts'
import { isNativeContactsAvailable, pickNativeContacts } from '../services/contacts'

const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

export default function ImportContactsModal({ open, onClose }) {
  const contacts = useDataStore(s => s.contacts)
  const addContact = useDataStore(s => s.addContact)
  const demoActive = useDemoStore(s => s.active)
  const fileInputRef = useRef(null)

  const [candidates, setCandidates] = useState(null) // null = no file picked yet
  const [selected, setSelected] = useState(new Set())
  const [skippedCount, setSkippedCount] = useState(0)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [loadingNative, setLoadingNative] = useState(false)

  const nativeContacts = isNativeContactsAvailable()
  // Whether a one-tap picker sits above the .vcf upload (so it renders as secondary).
  const hasPrimaryPicker = nativeContacts || hasContactPicker

  function reset() {
    setCandidates(null)
    setSelected(new Set())
    setSkippedCount(0)
    setError('')
    setImporting(false)
    setLoadingNative(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      setError('No contacts with a name were found in that file.')
      return
    }
    setCandidates(fresh)
    setSelected(new Set(fresh.map((_, i) => i)))
    setSkippedCount(skipped)
    setError('')
  }

  // Demo convenience: run a realistic iOS vCard export through the real parser
  // so the Apple import is completable without an actual .vcf on hand.
  function handleSample() {
    setError('')
    ingest(parseVCard(SAMPLE_VCARD))
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        ingest(parseVCard(String(reader.result)))
      } catch {
        setError('Could not read that file — make sure it\'s a .vcf export from Contacts.')
      }
    }
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  // Native iOS path: the system contacts permission prompt + address book,
  // normalized into the same candidate list the vCard/web paths feed.
  async function handleNativeContacts() {
    setError('')
    setLoadingNative(true)
    try {
      const parsed = await pickNativeContacts()
      if (!parsed.length) {
        setError('No contacts with a name were found.')
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
    candidates.forEach((c, i) => {
      if (selected.has(i)) addContact(c)
    })
    setImporting(false)
    handleClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(29,34,38,0.5)', backdropFilter: 'blur(3px)' }}
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
              background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 14px 44px -8px rgba(28,43,51,0.24), 0 3px 10px rgba(28,43,51,0.10)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #EEEBE3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,92,99,0.08)' }}>
                  <Users style={{ width: '15px', height: '15px', color: '#0D5C63' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C2B33' }}>Import contacts</div>
                  <div style={{ fontSize: '12px', color: '#5C6B73' }}>Skip the typing — bring your people in at once.</div>
                </div>
              </div>
              <button onClick={handleClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C6B73', padding: '4px' }}>
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!candidates && (
                <>
                  {demoActive && (
                    <>
                      <button onClick={handleSample} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                        background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                        <Sparkles style={{ width: '15px', height: '15px' }} /> Load a sample Apple Contacts export
                      </button>
                      <p style={{ fontSize: '12px', color: '#5C6B73', marginTop: '-6px', lineHeight: 1.5 }}>
                        No iPhone handy? This runs a real iOS vCard through Harbored's parser so you can try the import now.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                        <span style={{ flex: 1, height: '1px', background: '#EEEBE3' }} />
                        <span style={{ fontSize: '11px', color: '#5C6B73', opacity: 0.7 }}>or use your own</span>
                        <span style={{ flex: 1, height: '1px', background: '#EEEBE3' }} />
                      </div>
                    </>
                  )}
                  {nativeContacts && (
                    <button onClick={handleNativeContacts} disabled={loadingNative} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                      background: '#0D5C63', color: '#FFFFFF', border: 'none',
                      cursor: loadingNative ? 'default' : 'pointer', opacity: loadingNative ? 0.7 : 1, fontFamily: 'Inter, sans-serif',
                    }}>
                      <Smartphone style={{ width: '15px', height: '15px' }} />
                      {loadingNative ? 'Opening Contacts…' : 'Pick from your contacts'}
                    </button>
                  )}
                  {!nativeContacts && hasContactPicker && (
                    <button onClick={handlePickContacts} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                      background: '#0D5C63', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <Smartphone style={{ width: '15px', height: '15px' }} /> Pick from your phone's contacts
                    </button>
                  )}

                  <div>
                    <input ref={fileInputRef} type="file" accept=".vcf,text/vcard,text/x-vcard" onChange={handleFile} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                      background: hasPrimaryPicker ? 'none' : '#0D5C63', color: hasPrimaryPicker ? '#0D5C63' : '#FFFFFF',
                      border: hasPrimaryPicker ? '1px solid #0D5C63' : 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <Upload style={{ width: '15px', height: '15px' }} /> Upload a .vcf file
                    </button>
                    {!nativeContacts && (
                      <p style={{ fontSize: '12px', color: '#5C6B73', marginTop: '10px', lineHeight: 1.5 }}>
                        On iPhone: open Contacts → select the people you want → Share Contact → Export vCard, then upload the file here.
                      </p>
                    )}
                  </div>

                  {error && <p style={{ fontSize: '12px', color: '#B4423A' }}>{error}</p>}
                </>
              )}

              {candidates && (
                <>
                  {skippedCount > 0 && (
                    <p style={{ fontSize: '12px', color: '#5C6B73' }}>
                      Skipped {skippedCount} already in your network.
                    </p>
                  )}
                  {candidates.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#5C6B73' }}>Everyone in that file is already in your network.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                      {candidates.map((c, i) => (
                        <label key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                          borderRadius: '8px', border: '1px solid #EEEBE3', cursor: 'pointer',
                          background: selected.has(i) ? 'rgba(13,92,99,0.04)' : 'transparent',
                        }}>
                          <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ accentColor: '#0D5C63' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1C2B33' }}>{c.name}</div>
                            <div style={{ fontSize: '12px', color: '#5C6B73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {[c.company, c.email].filter(Boolean).join(' · ') || 'No extra details'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {candidates && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #EEEBE3' }}>
                <button onClick={reset}
                  style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', border: '1px solid #DEDACF', color: '#3E4B52', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Back
                </button>
                <button onClick={handleImport} disabled={selected.size === 0 || importing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    background: selected.size > 0 ? '#0D5C63' : '#C6C0B3', color: '#FFFFFF', border: 'none',
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
