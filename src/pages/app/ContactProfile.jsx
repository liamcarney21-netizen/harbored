import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Mail, Phone, X, Check, Pencil } from 'lucide-react'
import WarmAvatar from '../../components/WarmAvatar'
import ThemeAdder from '../../components/ThemeAdder'
import ThemeWatchLine from '../../components/ThemeWatchLine'
import { useDataStore } from '../../store/dataStore'
import { openSend, sendChannelFor } from '../../services/outreach'
import { haptic } from '../../services/haptics'
import { statusFor } from '../../lib/status'
import Card, { Eyebrow } from '../../ui/Card'
import Button from '../../ui/Button'
import Sheet from '../../ui/Sheet'
import { Input, Label, TextArea } from '../../ui/Field'
import { useToast } from '../../ui/toastStore'
import { T } from '../../ui/tokens'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ContactProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const allTouches = useDataStore(s => s.touches)
  const removeTheme = useDataStore(s => s.removeTheme)
  const restoreTheme = useDataStore(s => s.restoreTheme)
  const recordTouch = useDataStore(s => s.recordTouch)
  const saveNote = useDataStore(s => s.saveNote)
  const updateContact = useDataStore(s => s.updateContact)
  const removeContact = useDataStore(s => s.removeContact)
  const showToast = useToast(s => s.show)

  const contact = contacts.find(c => String(c.id) === String(id))
  const themes = (contact && (themesByContact[contact.id] || themesByContact[String(contact.id)])) || []
  const touches = allTouches.filter(t => String(t.contactId) === String(id))

  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Notes save themselves, a beat after you stop typing.
  const [noteDraft, setNoteDraft] = useState(contact?.notes ?? '')
  const [noteFor, setNoteFor] = useState(contact?.id)
  const [noteState, setNoteState] = useState('idle') // idle | saving | saved
  const noteTimer = useRef(null)
  if (contact && contact.id !== noteFor) {
    // A different person: show their notes, not the previous one's.
    setNoteFor(contact.id)
    setNoteDraft(contact.notes ?? '')
  }
  function onNoteChange(v) {
    setNoteDraft(v)
    setNoteState('saving')
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      saveNote(contact.id, v)
      setNoteState('saved')
      setTimeout(() => setNoteState(s => (s === 'saved' ? 'idle' : s)), 1600)
    }, 800)
  }

  if (!contact) {
    return (
      <div style={{ padding: `24px ${T.gutter}px`, color: T.muted, fontSize: 14 }}>
        That person isn't in your crew anymore.{' '}
        <button onClick={() => navigate('/dashboard/network')} style={{ color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
          Back to your crew
        </button>
      </div>
    )
  }

  const first = contact.name.split(' ')[0]
  const status = statusFor(contact)
  const subtitle = [contact.role, contact.company].filter(Boolean).join(' · ')
  const channel = sendChannelFor(contact)

  function startComposing() {
    const tail = contact.company ? `How's everything at ${contact.company}?` : "How's everything going?"
    setDraft(`${first} — it's been a while! No agenda, just thinking about you. ${tail}`)
    setComposing(true)
  }

  function handleSend() {
    const ch = openSend(contact, draft, 'Checking in')
    if (!ch) return
    recordTouch(contact.id, { channel: ch, message: draft, trigger: 'Reached out from their profile' })
    haptic.success()
    setComposing(false)
  }

  function handleRemoveTheme(t, index) {
    removeTheme(contact.id, t.id)
    haptic.soft()
    showToast(`Stopped watching ${t.label}`, { action: 'Undo', onAction: () => restoreTheme(contact.id, t, index) })
  }

  function handleRemoveContact() {
    removeContact(contact.id)
    setConfirmRemove(false)
    navigate('/dashboard/network', { replace: true })
  }

  return (
    <div style={{ width: '100%', padding: `14px ${T.gutter}px 40px` }}>
      <button
        className="hb-press"
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, marginLeft: -6, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', fontSize: 13, color: T.muted, fontFamily: 'inherit' }}
      >
        <ChevronLeft style={{ width: 16, height: 16 }} /> Your crew
      </button>

      {/* Who */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
        <WarmAvatar initials={contact.initials} size="xl" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="hb-display" style={{ fontSize: 26, fontWeight: 500, color: T.ink, lineHeight: 1.15, margin: 0 }}>{contact.name}</h1>
          {subtitle && <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{subtitle}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, fontWeight: status.hot ? 600 : 400, color: status.hot ? T.accent : T.muted }}>
            {status.hot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />}
            {status.text}
          </div>
        </div>
        <button className="hb-press" onClick={() => setEditing(true)} aria-label="Edit details" style={{ width: 40, height: 40, borderRadius: 12, background: T.card, border: `1px solid ${T.hairline}`, color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Pencil style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {(contact.email || contact.phone) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {contact.phone && <Chip href={`sms:${contact.phone.replace(/[^+\d]/g, '')}`} icon={<Phone style={{ width: 12, height: 12 }} />}>{contact.phone}</Chip>}
          {contact.email && <Chip href={`mailto:${contact.email}`} icon={<Mail style={{ width: 12, height: 12 }} />}>{contact.email}</Chip>}
        </div>
      )}

      {channel ? (
        <Button size="lg" full onClick={startComposing} style={{ marginTop: 18 }}>Reach out to {first}</Button>
      ) : (
        <Card style={{ marginTop: 18, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: T.body, lineHeight: 1.55 }}>
            No phone or email on file, so there's nowhere to send a message yet.
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)} style={{ marginTop: 10 }}>Add a phone or email</Button>
        </Card>
      )}

      {/* What you share */}
      <Eyebrow>What you share</Eyebrow>
      <Card>
        {themes.length === 0 && (
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, margin: '0 0 12px' }}>
            Nothing yet. Name a team, a city, a company, a market — Harbored watches it for a real reason to reach out.
          </p>
        )}
        {themes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {themes.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: T.ground, border: `1px solid ${T.hairline}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{t.label}</div>
                  <ThemeWatchLine theme={t} />
                </div>
                <button
                  className="hb-press"
                  onClick={() => handleRemoveTheme(t, i)}
                  aria-label={`Stop watching ${t.label}`}
                  style={{ width: 36, height: 36, margin: '-6px -8px -6px 0', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <ThemeAdder contact={contact} />
      </Card>

      {/* Notes */}
      <Eyebrow>Notes</Eyebrow>
      <Card style={{ padding: 14 }}>
        <TextArea
          value={noteDraft}
          onChange={e => onNoteChange(e.target.value)}
          rows={4}
          placeholder="Kids' names, what you talked about last, what they care about…"
          aria-label="Notes"
          style={{ background: T.ground, fontSize: 15 }}
        />
        <div style={{ height: 18, fontSize: 12, color: T.muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          {noteState === 'saving' && 'Saving…'}
          {noteState === 'saved' && <><Check style={{ width: 12, height: 12, color: T.success }} /> Saved</>}
        </div>
      </Card>

      {/* History */}
      <Eyebrow>History</Eyebrow>
      <Card>
        {touches.length === 0 ? (
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, margin: 0 }}>
            Nothing sent through Harbored yet. When you hand {first} a message, it lands here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {touches.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', gap: 14, paddingBottom: i < touches.length - 1 ? 18 : 0, position: 'relative' }}>
                {i < touches.length - 1 && (
                  <div style={{ position: 'absolute', left: 5, top: 14, bottom: 2, width: 1, background: T.hairlineStrong }} />
                )}
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: T.accentSoft, border: `2px solid ${T.accent}`, flexShrink: 0, marginTop: 3, boxSizing: 'border-box' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{fmtDate(t.date)}</span>
                    <span style={{ fontSize: 11, color: T.muted }}>{t.channel === 'sms' ? 'Messages' : 'Mail'}</span>
                  </div>
                  {t.trigger && <p style={{ fontSize: 11, color: T.accent, margin: '0 0 4px' }}>{t.trigger}</p>}
                  <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, margin: 0 }}>{t.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)} style={{ color: T.muted }}>Remove {first} from your crew</Button>
      </div>

      {/* Compose */}
      <Sheet
        open={composing}
        onClose={() => setComposing(false)}
        title={`To ${first}`}
        sub="Opens in your own Messages or Mail. Harbored never sends."
        footer={<>
          <Button variant="secondary" size="md" onClick={() => setComposing(false)}>Cancel</Button>
          <Button size="md" onClick={handleSend}>{channel === 'sms' ? 'Open in Messages' : 'Open in Mail'}</Button>
        </>}
      >
        <TextArea value={draft} onChange={e => setDraft(e.target.value)} rows={5} aria-label="Your message" style={{ background: T.ground, fontSize: 15 }} />
      </Sheet>

      <EditContactSheet open={editing} contact={contact} onClose={() => setEditing(false)} onSave={(patch) => { updateContact(contact.id, patch); setEditing(false) }} />

      <Sheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${contact.name}?`}
        sub="Their themes and history go with them. This doesn't touch your phone's contacts."
        footer={<>
          <Button variant="secondary" size="md" onClick={() => setConfirmRemove(false)}>Keep</Button>
          <Button variant="danger" size="md" onClick={handleRemoveContact}>Remove</Button>
        </>}
      />
    </div>
  )
}

function Chip({ href, icon, children }) {
  return (
    <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, fontSize: 12, color: T.body, background: T.card, border: `1px solid ${T.hairline}`, textDecoration: 'none', maxWidth: '100%' }}>
      <span style={{ color: T.muted, display: 'flex' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </a>
  )
}

function formFrom(contact) {
  return { name: contact.name, role: contact.role || '', company: contact.company || '', email: contact.email || '', phone: contact.phone || '', birthday: contact.birthday ? `2000-${contact.birthday}` : '' }
}

function EditContactSheet({ open, contact, onClose, onSave }) {
  const [form, setForm] = useState(() => formFrom(contact))
  const [openedFor, setOpenedFor] = useState(false)
  if (open !== openedFor) {
    // Fresh values every time the sheet opens.
    setOpenedFor(open)
    if (open) setForm(formFrom(contact))
  }
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSave = (form.name || '').trim().length > 1
  function save() {
    if (!canSave) return
    onSave({
      name: form.name.trim(), role: form.role.trim(), company: form.company.trim(),
      email: form.email.trim(), phone: form.phone.trim(),
      birthday: form.birthday ? form.birthday.slice(5) : '',
      initials: form.name.trim().split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    })
  }
  const field = (key, label, props = {}) => (
    <div>
      <Label htmlFor={`ec-${key}`}>{label}</Label>
      <Input id={`ec-${key}`} value={form[key] || ''} onChange={e => update(key, e.target.value)} style={{ background: T.ground, padding: '11px 13px' }} {...props} />
    </div>
  )
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Details"
      footer={<>
        <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
        <Button size="md" onClick={save} disabled={!canSave}>Save</Button>
      </>}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {field('name', 'Name', { autoComplete: 'off' })}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('role', 'Role')}
          {field('company', 'Company')}
        </div>
        {field('phone', 'Phone', { type: 'tel', inputMode: 'tel' })}
        {field('email', 'Email', { type: 'email', inputMode: 'email' })}
        {field('birthday', 'Birthday', { type: 'date' })}
      </div>
    </Sheet>
  )
}
