import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Field'
import { T } from '../ui/tokens'

const EMPTY = { name: '', role: '', company: '', phone: '', email: '', birthday: '' }

// The by-hand fallback. Import from Contacts is the main road; this is for
// the one person who isn't in your phone yet.
export default function AddContactModal({ open, onClose, onCreated }) {
  const addContact = useDataStore(s => s.addContact)
  const [form, setForm] = useState(EMPTY)
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSave = form.name.trim().length > 1

  function handleSave(e) {
    e?.preventDefault?.()
    if (!canSave) return
    // <input type="date"> gives YYYY-MM-DD; we store the recurring MM-DD only.
    const contact = addContact({ ...form, name: form.name.trim(), birthday: form.birthday ? form.birthday.slice(5) : '' })
    setForm(EMPTY)
    onClose(true)
    // Themes are set in the shared quiz that opens next.
    onCreated?.(contact)
  }

  const field = (key, label, props = {}, hint) => (
    <div>
      <Label htmlFor={`ac-${key}`} hint={hint}>{label}</Label>
      <Input id={`ac-${key}`} value={form[key]} onChange={e => update(key, e.target.value)} style={{ background: T.ground, padding: '11px 13px' }} {...props} />
    </div>
  )

  return (
    <Sheet
      open={open}
      onClose={() => onClose(false)}
      title="Add someone by hand"
      sub="A name is enough to start. A phone or email lets you reach out from Harbored."
      icon={<UserPlus style={{ width: 15, height: 15 }} />}
      footer={<>
        <Button variant="secondary" size="md" onClick={() => onClose(false)}>Cancel</Button>
        <Button size="md" onClick={handleSave} disabled={!canSave}>Add</Button>
      </>}
    >
      <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
        {field('name', 'Name', { placeholder: 'John Sullivan', autoFocus: true, autoComplete: 'off' })}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('role', 'Role', { placeholder: 'Wealth advisor' }, '(optional)')}
          {field('company', 'Company', { placeholder: 'Morgan Stanley' }, '(optional)')}
        </div>
        {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', placeholder: '+1 612 555 0199' }, '(optional)')}
        {field('email', 'Email', { type: 'email', inputMode: 'email', placeholder: 'john@example.com' }, '(optional)')}
        {field('birthday', 'Birthday', { type: 'date' }, '(optional)')}
        <button type="submit" hidden aria-hidden="true" />
      </form>
    </Sheet>
  )
}
