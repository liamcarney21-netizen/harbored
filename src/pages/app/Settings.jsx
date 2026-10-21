import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import { useDemoStore } from '../../store/demoStore'
import WarmAvatar from '../../components/WarmAvatar'
import ThinkingMark from '../../components/ThinkingMark'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiBase'
import { isNative } from '../../lib/platform'
import { signOutEverywhereLocal, forgetThisDevice } from '../../services/session'
import { pushPermissionState, registerPushNotifications } from '../../services/push'
import { openContactSettings } from '../../services/contacts'
import Card, { Eyebrow, PageTitle, Row } from '../../ui/Card'
import Button from '../../ui/Button'
import { Toggle } from '../../ui/Field'
import { T } from '../../ui/tokens'

export default function Settings() {
  const navigate = useNavigate()
  const contacts = useDataStore(s => s.contacts)
  const prefs = useDataStore(s => s.prefs)
  const setPref = useDataStore(s => s.setPref)
  const user = useAuthStore(s => s.user)
  const demoActive = useDemoStore(s => s.active)
  const exitDemo = useDemoStore(s => s.exit)

  const email = user?.email || ''
  const initials = (email[0] || 'H').toUpperCase()

  // Native: the toggle reflects what iOS actually allows.
  const [osPush, setOsPush] = useState('web')
  useEffect(() => {
    if (!isNative()) return
    pushPermissionState().then(setOsPush).catch(() => {})
  }, [])

  async function togglePush(on) {
    setPref('push', on)
    if (on && isNative() && osPush !== 'granted') {
      const state = await registerPushNotifications({ prompt: true })
      setOsPush(state)
    }
  }

  async function handleSignOut() {
    if (demoActive) { exitDemo(); navigate(user ? '/dashboard' : '/'); return }
    await signOutEverywhereLocal()
    navigate('/login')
  }

  // Delete flow: our own confirm sheet, then a visible working state the whole
  // way through — the server round-trip takes a few seconds.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function confirmDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('Your session expired — sign in again first.')
      const res = await fetch(apiUrl('/api/delete-account'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Deletion failed — try again in a moment.')
      }
      await forgetThisDevice(user?.id)
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      useDataStore.getState().reset()
      // The login page reads this flag and says a quiet goodbye.
      window.location.href = '/login?farewell=1'
    } catch (e) {
      setDeleteError(e.message)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  function exportData() {
    const { contacts, themesByContact, touches } = useDataStore.getState()
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), contacts, themesByContact, touches }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'harbored-export.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const pushSub = !prefs.push
    ? 'Off — nothing reaches your phone'
    : isNative() && osPush === 'denied'
      ? 'Turned off in iOS Settings'
      : 'Only when Harbored finds a real reason'

  return (
    <div style={{ width: '100%', padding: `18px ${T.gutter}px 32px` }}>
      <PageTitle title="You" sub="Account, notifications, and your data" />

      <Card style={{ marginTop: 22, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
          <WarmAvatar initials={initials} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {demoActive ? 'Demo' : (email || 'Signed in')}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {contacts.length} {contacts.length === 1 ? 'person' : 'people'} in your crew
            </div>
          </div>
        </div>
        <div style={{ padding: '0 18px 16px' }}>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>{demoActive ? 'Leave the demo' : 'Sign out'}</Button>
        </div>
      </Card>

      <Eyebrow>Notifications</Eyebrow>
      <Card flush>
        <Row
          title="Push notifications"
          sub={pushSub}
          control={<Toggle checked={!!prefs.push} onChange={togglePush} label="Push notifications" />}
        />
        {isNative() && osPush === 'denied' && prefs.push && (
          <div style={{ padding: '0 18px 14px' }}>
            <Button variant="secondary" size="sm" onClick={openContactSettings}>Open iOS Settings</Button>
          </div>
        )}
        <Row
          title="Weekly recap"
          sub={email ? `Monday mornings to ${email}` : 'A Monday-morning summary by email'}
          control={<Toggle checked={!!prefs.digest} onChange={v => setPref('digest', v)} label="Weekly recap email" />}
          last
        />
      </Card>

      <Eyebrow>Your data</Eyebrow>
      <Card flush>
        <Row
          title="Export your data"
          sub="Your people, themes and history as a file"
          control={<Button variant="secondary" size="sm" onClick={exportData}>Export</Button>}
          last
        />
      </Card>

      {!demoActive && (
        <Card flush style={{ marginTop: 24, background: 'rgba(232,134,122,0.05)', borderColor: 'rgba(232,134,122,0.2)' }}>
          <Row
            title="Delete account"
            sub={deleteError || 'Removes your account and every piece of data, permanently'}
            control={
              <Button variant="secondary" size="sm" style={{ color: T.danger, borderColor: 'rgba(232,134,122,0.35)' }} onClick={() => { setDeleteError(''); setConfirmingDelete(true) }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            }
            last
          />
        </Card>
      )}

      {confirmingDelete && (
        <div role="dialog" aria-modal="true" aria-label="Delete your Harbored account?" style={{
          position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4, 10, 22, 0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <Card style={{ width: 'min(400px, 100%)', padding: 24, boxShadow: '0 18px 50px -12px rgba(0,0,0,0.6)' }}>
            {deleting ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '10px 0' }}>
                <ThinkingMark size={26} />
                <div style={{ fontSize: 15, fontWeight: 500, color: T.ink }}>Removing your account</div>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, textAlign: 'center', margin: 0 }}>
                  Deleting your people, themes, and history from our servers…
                </p>
              </div>
            ) : (
              <>
                <div className="hb-display" style={{ fontSize: 19, fontWeight: 500, color: T.ink, lineHeight: 1.3 }}>
                  Delete your Harbored account?
                </div>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: '10px 0 20px' }}>
                  Your people, themes, and history are removed permanently. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={confirmDeleteAccount}>Delete forever</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
