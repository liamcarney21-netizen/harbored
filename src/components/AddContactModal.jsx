import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, UserPlus } from 'lucide-react'
import { useDataStore } from '../store/dataStore'

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', outline: 'none',
  background: '#FFFFFF', border: '1px solid #CCC6B9', color: '#1C2B33',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px',
  color: '#3E4B52', fontFamily: 'Inter, sans-serif',
}

export default function AddContactModal({ open, onClose, onCreated, firstRun = false }) {
  const addContact = useDataStore(s => s.addContact)
  const [form, setForm] = useState({ name: '', role: '', company: '', email: '', birthday: '' })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSave = form.name.trim().length > 1

  function handleSave() {
    if (!canSave) return
    // <input type="date"> gives YYYY-MM-DD; we store the recurring MM-DD only.
    const birthday = form.birthday ? form.birthday.slice(5) : ''
    const contact = addContact({ ...form, birthday })
    setForm({ name: '', role: '', company: '', email: '', birthday: '' })
    onClose(true)
    // Themes are set in the shared composer that opens next — one consistent flow
    // whether the contact was typed in here or imported.
    onCreated?.(contact)
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
                <div>
                  <label htmlFor="ac-email" style={labelStyle}>Email <span style={{ fontWeight: 400, color: '#5C6B73' }}>(so you can reach out in one click)</span></label>
                  <input id="ac-email" type="email" style={inputStyle} placeholder="john@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-birthday" style={labelStyle}>Birthday <span style={{ fontWeight: 400, color: '#5C6B73' }}>(optional)</span></label>
                  <input id="ac-birthday" type="date" style={inputStyle} value={form.birthday} onChange={e => update('birthday', e.target.value)} />
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
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
