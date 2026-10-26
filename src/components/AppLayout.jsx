import { useEffect, useRef, useState } from 'react'
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom'
import AnchorMark from './AnchorMark'
import ThinkingMark from './ThinkingMark'
import { useAuthStore } from '../store/authStore'
import { useDataStore } from '../store/dataStore'
import { useDemoStore } from '../store/demoStore'
import BottomTabBar from './BottomTabBar'
import Onboarding from './Onboarding'
import AddContactModal from './AddContactModal'
import ImportContactsModal, { SUGGESTED_START } from './ImportContactsModal'
import ThemeComposerModal from './ThemeComposerModal'
import Network from '../pages/app/Network'
import CommonGround from '../pages/app/CommonGround'
import ContactProfile from '../pages/app/ContactProfile'
import Settings from '../pages/app/Settings'
import { ToastHost } from '../ui/toast'
import { useToast } from '../ui/toastStore'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { T } from '../ui/tokens'
import { registerPushNotifications, listenForPushTaps, pushPermissionState } from '../services/push'
import { markReasonsStale, requestScanNow } from '../services/scanResults'
import { track, trackOnce } from '../services/events'
import { refineMissingThemes } from '../services/themes'
import { hideSplash } from '../lib/splash'
import { isNative } from '../lib/platform'

// One phone-width column on every screen size. The desktop "front page"
// layouts are gone: the phone app is the product and the web is its demo and
// companion, so there is exactly one of each screen to keep polished.
export default function AppLayout() {
  const user = useAuthStore(s => s.user)
  const initialized = useAuthStore(s => s.initialized)
  const demoActive = useDemoStore(s => s.active)
  const exitDemo = useDemoStore(s => s.exit)
  const loading = useDataStore(s => s.loading)
  const loadError = useDataStore(s => s.loadError)
  const fromCache = useDataStore(s => s.fromCache)
  const dirty = useDataStore(s => s.dirty)
  const syncError = useDataStore(s => s.syncError)
  const retryLoad = useDataStore(s => s.retryLoad)
  const contacts = useDataStore(s => s.contacts)
  const themesByContact = useDataStore(s => s.themesByContact)
  const updateTheme = useDataStore(s => s.updateTheme)
  const setPref = useDataStore(s => s.setPref)
  const navigate = useNavigate()

  const [tourDismissed, setTourDismissed] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showImportContacts, setShowImportContacts] = useState(false)
  const [composerContacts, setComposerContacts] = useState([])
  const [askPush, setAskPush] = useState(false)
  const showToast = useToast(s => s.show)
  // People imported beyond the first few, who skip the quiz for now.
  const deferredRef = useRef(0)
  // Whether this quiz is the account's first: its end triggers the first scan.
  const firstSetupRef = useRef(false)

  // Whatever renders here is the first real screen on native.
  useEffect(() => { if (initialized) hideSplash() }, [initialized])

  // The first-run tour shows once per account, only while the crew is empty
  // (a new phone is not a new user), and never in the demo.
  const showOnboarding = initialized && !loading && !demoActive && !!user && !tourDismissed
    && contacts.length === 0 && !tourSeen(user.id)
  useEffect(() => { if (showOnboarding) trackOnce('onboarding_started') }, [showOnboarding])

  // A tapped push opens Today on what the morning's scan just found.
  useEffect(() => {
    if (!user || demoActive) return
    listenForPushTaps(() => {
      track('push_opened')
      navigate('/dashboard')
      markReasonsStale()
    })
  }, [user, demoActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // The server only lets a push land between 8 AM and 9 PM in this person's
  // own time zone, so keep the one it knows current (it follows the phone).
  useEffect(() => {
    if (!user || demoActive || loading || loadError) return
    let tz = null
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch { /* very old engine */ }
    if (tz && useDataStore.getState().prefs?.tz !== tz) setPref('tz', tz)
  }, [user, demoActive, loading, loadError]) // eslint-disable-line react-hooks/exhaustive-deps

  // Themes that never got a refined query (the refine service was down when
  // they were added) get one quietly, a few at a time.
  useEffect(() => {
    if (!user || demoActive || loading || loadError) return
    refineMissingThemes(contacts, themesByContact, updateTheme)
  }, [user, demoActive, loading, loadError]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized) return <Shell center><ThinkingMark size={22} /></Shell>
  if (!user && !demoActive) return <Navigate to="/login" replace />
  if (loading && !fromCache) {
    return <Shell center><ThinkingMark size={22} label="Opening your harbor…" /></Shell>
  }
  if (loadError && !fromCache && contacts.length === 0) {
    return (
      <Shell center>
        <div style={{ textAlign: 'center', maxWidth: 320, padding: '0 24px' }}>
          <h1 className="hb-display" style={{ fontSize: 26, fontWeight: 500, color: T.ink, lineHeight: 1.2 }}>Couldn't reach Harbored</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.body, margin: '12px 0 22px' }}>
            Your people are safe on the server; this device just couldn't load them. Check your connection and try again.
          </p>
          <Button size="lg" onClick={retryLoad}>Try again</Button>
        </div>
      </Shell>
    )
  }

  function finishOnboarding(andBringContacts = false) {
    try { if (user) localStorage.setItem(`harbored_onboarded_${user.id}`, 'true') } catch { /* private mode */ }
    setTourDismissed(true)
    if (andBringContacts === true) setShowImportContacts(true)
  }

  // The quiz asks about a few people at a time; anyone past that waits in the
  // Crew. A new account's first quiz is what the first scan follows.
  function startComposer(people) {
    firstSetupRef.current = !Object.values(useDataStore.getState().themesByContact).some(t => t.length)
    deferredRef.current = Math.max(0, people.length - SUGGESTED_START)
    setComposerContacts(people.slice(0, SUGGESTED_START))
  }

  // When the first themes are set, scan right away so the session ends on
  // what Harbored found (Today narrates it), and only then ask about
  // notifications, once a reason has something to look like.
  function closeComposer(summary) {
    setComposerContacts([])
    const added = summary?.themes || 0
    if (added) track('themes_added', { count: added, people: summary.people || 0 })
    const deferred = deferredRef.current
    deferredRef.current = 0
    if (deferred) showToast(`The other ${deferred} ${deferred === 1 ? 'person is' : 'people are'} in your Crew. Add themes for them anytime.`)
    if (!user || demoActive) return
    if (added && firstSetupRef.current) {
      navigate('/dashboard')
      requestScanNow()
    } else if (added && isNative()) {
      registerPushNotifications() // already allowed: just make sure the token is current
    }
  }

  async function afterFirstScan() {
    if (!isNative()) return
    const state = await pushPermissionState().catch(() => null)
    if (state === 'prompt' || state === 'prompt-with-rationale') setAskPush(true)
    else if (state === 'granted') registerPushNotifications()
  }

  async function allowPush() {
    setAskPush(false)
    const result = await registerPushNotifications({ prompt: true }).catch(() => 'error')
    track('push_permission', { result })
  }

  function skipPush() {
    setAskPush(false)
    track('push_permission', { result: 'not_now' })
  }

  const openAddContact = () => setShowAddContact(true)
  const openImportContacts = () => setShowImportContacts(true)

  return (
    <Shell>
      {/* Top bar — wordmark left, date right */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        padding: `calc(env(safe-area-inset-top) + 16px) ${T.gutter}px 4px`,
      }}>
        <button
          className="hb-press"
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Today"
        >
          <AnchorMark size={16} color={T.accent} />
          <span className="hb-display" style={{ fontSize: 19, fontWeight: 500, color: T.ink }}>Harbored</span>
        </button>
        <span style={{ fontSize: 12, color: T.muted }}>
          {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </header>

      {demoActive && (
        <Banner
          text={<><strong style={{ fontWeight: 600, color: T.accent }}>Live demo</strong> — nothing here is saved</>}
          action="Exit"
          onAction={() => { exitDemo(); navigate(user ? '/dashboard' : '/') }}
        />
      )}
      {!demoActive && loadError && fromCache && (
        <Banner text="Showing your last copy — couldn't reach Harbored." action="Retry" onAction={retryLoad} tone="warn" />
      )}
      {!demoActive && !loadError && (dirty || syncError) && (
        <Banner text={syncError ? "Changes not saved yet — we'll keep trying." : 'Saving…'} tone="quiet" />
      )}

      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<CommonGround onImportContacts={openImportContacts} onFirstScanDone={afterFirstScan} />} />
          <Route path="network" element={<Network onImportContacts={openImportContacts} />} />
          <Route path="contact/:id" element={<ContactProfile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <BottomTabBar />

      {showOnboarding && <Onboarding onFinish={finishOnboarding} />}
      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        onCreated={(contact) => startComposer([contact])}
      />
      <ImportContactsModal
        open={showImportContacts}
        onClose={() => setShowImportContacts(false)}
        onImported={startComposer}
        onAddManually={openAddContact}
      />
      <ThemeComposerModal
        key={composerContacts.length ? composerContacts[0].id : 'empty'}
        open={composerContacts.length > 0}
        contacts={composerContacts}
        onClose={closeComposer}
      />
      <Sheet
        open={askPush}
        onClose={skipPush}
        title="A heads-up when it counts"
        sub="Harbored only notifies you when something is genuinely worth a message: at most one a day and three a week, between 8 AM and 9 PM, and never with a sound."
        footer={<>
          <Button variant="secondary" size="md" onClick={skipPush}>Not now</Button>
          <Button size="md" onClick={allowPush}>Turn on notifications</Button>
        </>}
      >
        <p style={{ fontSize: 14, lineHeight: 1.6, color: T.body, margin: 0 }}>
          Every reason also waits for you on Today, so nothing is lost if you&rsquo;d rather check in yourself.
          You can change this anytime under You.
        </p>
      </Sheet>
      <ToastHost />
    </Shell>
  )
}

function tourSeen(uid) {
  try { return localStorage.getItem(`harbored_onboarded_${uid}`) === 'true' } catch { return false }
}

function Shell({ center = false, children }) {
  return (
    <div className="hb-app" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div
        className="hb-column"
        style={{
          width: '100%', maxWidth: T.pageWidth, flex: 1, minHeight: 0, position: 'relative',
          display: 'flex', flexDirection: 'column',
          alignItems: center ? 'center' : 'stretch', justifyContent: center ? 'center' : 'flex-start',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Banner({ text, action, onAction, tone = 'demo' }) {
  const bg = tone === 'warn' ? 'rgba(232,134,122,0.08)' : tone === 'quiet' ? 'transparent' : T.card
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 12px',
      padding: tone === 'quiet' ? '2px 16px 6px' : '8px 16px', background: bg, color: T.body,
      borderBottom: tone === 'quiet' ? 'none' : `1px solid ${T.hairline}`, fontSize: 12, textAlign: 'center', flexShrink: 0,
    }}>
      <span style={{ color: tone === 'quiet' ? T.muted : T.body }}>{text}</span>
      {action && (
        <button
          className="hb-press"
          onClick={onAction}
          style={{
            background: 'none', color: T.ink, border: `1px solid ${T.hairlineStrong}`, borderRadius: 999,
            padding: '3px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}
