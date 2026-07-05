import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, UserPlus } from 'lucide-react'
import { useDataStore } from '../store/dataStore'

const CATEGORIES = [
  { key: 'sports', label: 'Sports' },
  { key: 'place', label: 'Place' },
  { key: 'market', label: 'Market' },
  { key: 'hobby', label: 'Hobby' },
  { key: 'industry', label: 'Industry' },
]

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', outline: 'none',
  background: '#FFFFFF', border: '1px solid #CCC6B9', color: '#1C2B33',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px',
  color: '#3E4B52', fontFamily: 'Inter, sans-serif',
}

export default function AddContactModal({ open, onClose, firstRun = false }) {
  const addContact = useDataStore(s => s.addContact)
  const [form, setForm] = useState({ name: '', role: '', company: '', email: '' })
  const [themes, setThemes] = useState([])
  const [themeLabel, setThemeLabel] = useState('')
  const [themeCategory, setThemeCategory] = useState('sports')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSave = form.name.trim().length > 1

  function addThemeChip() {
    const label = themeLabel.trim()
    if (!label || themes.length >= 5) return
    setThemes(t => [...t, { label, category: themeCategory }])
    setThemeLabel('')
  }

  function handleSave() {
    if (!canSave) return
    addContact({ ...form, themes })
    setForm({ name: '', role: '', company: '', email: '' })
    setThemes([])
    onClose(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onClose(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(29,34,38,0.5)', backdropFilter: 'blur(3px)' }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{
              position: 'fixed', zIndex: 61, top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 'min(520px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
              background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #EEEBE3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,92,99,0.08)' }}>
                  <UserPlus style={{ width: '15px', height: '15px', color: '#0D5C63' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C2B33' }}>
                    {firstRun ? 'Add your first contact' : 'Add someone new'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5C6B73' }}>
                    {firstRun ? 'Pick someone worth staying close to — then add what you have in common.' : 'Harbored watches their world so you don\'t have to.'}
                  </div>
                </div>
              </div>
              <button onClick={() => onClose(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C6B73', padding: '4px' }}>
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="ac-name" style={labelStyle}>Full name</label>
                  <input id="ac-name" style={inputStyle} placeholder="John Sullivan" value={form.name} onChange={e => update('name', e.target.value)} autoFocus />
                </div>
                <div>
                  <label htmlFor="ac-role" style={labelStyle}>Role</label>
                  <input id="ac-role" style={inputStyle} placeholder="Wealth Advisor" value={form.role} onChange={e => update('role', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-company" style={labelStyle}>Company</label>
                  <input id="ac-company" style={inputStyle} placeholder="Morgan Stanley" value={form.company} onChange={e => update('company', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="ac-email" style={labelStyle}>Email <span style={{ fontWeight: 400, color: '#5C6B73' }}>(so you can reach out in one click)</span></label>
                  <input id="ac-email" type="email" style={inputStyle} placeholder="john@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
              </div>

              {/* Shared themes */}
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(13,92,99,0.04)', border: '1px solid rgba(13,92,99,0.15)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D5C63', marginBottom: '4px' }}>What do you have in common?</div>
                <p style={{ fontSize: '12px', color: '#5C6B73', marginBottom: '12px', lineHeight: 1.5 }}>
                  Teams, cities, markets, hobbies. Harbored monitors these and tells you when there's a real reason to reach out.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: themes.length ? '10px' : 0 }}>
                  {themes.map((t, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px',
                      borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                      background: 'rgba(13,92,99,0.08)', color: '#0D5C63', border: '1px solid rgba(13,92,99,0.2)',
                    }}>
                      {t.label}
                      <button onClick={() => setThemes(ts => ts.filter((_, j) => j !== i))} aria-label={`Remove ${t.label}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
                        <X style={{ width: '11px', height: '11px' }} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={themeLabel}
                    onChange={e => setThemeLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addThemeChip()}
                    placeholder="e.g. Villanova Basketball"
                    aria-label="Shared theme"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select value={themeCategory} onChange={e => setThemeCategory(e.target.value)} aria-label="Category"
                    style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <button onClick={addThemeChip} aria-label="Add theme"
                    style={{
                      padding: '0 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: 'rgba(13,92,99,0.1)', color: '#0D5C63', display: 'flex', alignItems: 'center',
                    }}>
                    <Plus style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #EEEBE3' }}>
              <button onClick={() => onClose(false)}
                style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'none', border: '1px solid #DEDACF', color: '#3E4B52', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={!canSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: canSave ? '#0D5C63' : '#C6C0B3', color: '#FFFFFF', border: 'none',
                  cursor: canSave ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
                }}>
                <Check style={{ width: '13px', height: '13px' }} />
                {firstRun ? 'Start monitoring' : 'Add contact'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
