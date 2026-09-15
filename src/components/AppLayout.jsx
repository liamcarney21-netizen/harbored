import { useState } from 'react'
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnchorMark from './AnchorMark'
import { useAuthStore } from '../store/authStore'
import { useDataStore } from '../store/dataStore'
import { useDemoStore } from '../store/demoStore'
import AppSidebar from './AppSidebar'
import BottomTabBar from './BottomTabBar'
import Onboarding from './Onboarding'
import AddContactModal from './AddContactModal'
import ImportContactsModal from './ImportContactsModal'
import ThemeComposerModal from './ThemeComposerModal'
import { useIsMobile } from '../hooks/useIsMobile'
import Network from '../pages/app/Network'
import CommonGround from '../pages/app/CommonGround'
import ContactProfile from '../pages/app/ContactProfile'
import Digest from '../pages/app/Digest'
import Settings from '../pages/app/Settings'

export default function AppLayout() {
  const user = useAuthStore(s => s.user)
  const initialized = useAuthStore(s => s.initialized)
  const demoActive = useDemoStore(s => s.active)
  const dataLoading = useDataStore(s => s.loading)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  // In demo mode skip the first-run walkthrough — judges land straight on the
  // seeded Common Ground so the product explains itself.
  const [showOnboarding, setShowOnboarding] = useState(
    () => !demoActive && localStorage.getItem('harbored_onboarded') !== 'true'
  )
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactFirstRun, setAddContactFirstRun] = useState(false)
  const [showImportContacts, setShowImportContacts] = useState(false)
  const [composerContacts, setComposerContacts] = useState([])
  if (!initialized) return null
  if (!user && !demoActive) return <Navigate to="/login" replace />
  if (dataLoading) return null

  // Just navigate — Landing clears the demo state on mount, once this component
  // (and its auth guard) is safely unmounted. Clearing it here, while still on
  // /dashboard, would trip the guard below and bounce to /login instead.
  const leaveDemo = () => navigate('/')

  // Import-first: onboarding hands off to the contacts importer, not the
  // manual-entry form — nobody types their network in by hand.
  function finishOnboarding(andBringContacts = false) {
    localStorage.setItem('harbored_onboarded', 'true')
    setShowOnboarding(false)
    if (andBringContacts) setShowImportContacts(true)
  }

  const openAddContact = () => {
    setAddContactFirstRun(false)
    setShowAddContact(true)
  }

  const openImportContacts = () => {
    setShowImportContacts(true)
  }

  return (
    <motion.div
      className="hb-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Mobile top bar — wordmark left, date right, on the charcoal itself
          (no chrome bar; the bottom tab bar owns navigation). */}
      {isMobile && (
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          padding: 'calc(env(safe-area-inset-top) + 16px) 24px 4px',
        }}>
          <button
            className="hb-press"
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <AnchorMark size={16} color="#D97757" />
            <span className="hb-display" style={{ fontSize: '19px', fontWeight: 500, color: '#F5F4EF' }}>
              Harbored
            </span>
          </button>
          <span style={{ fontSize: '12px', color: '#A8A49C' }}>
            {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </header>
      )}

      {/* Desktop keeps the sidebar; mobile uses the bottom tab bar below. */}
      {!isMobile && <AppSidebar onAddContact={openAddContact} onImportContacts={openImportContacts} />}

      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {demoActive && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexWrap: 'wrap', gap: '4px 12px',
            padding: '8px 16px', background: '#30302E', color: '#C9C5BC',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: '12px', textAlign: 'center',
          }}>
            <span>
              <strong style={{ fontWeight: 600, color: '#D97757' }}>Live demo</strong>
              {' — nothing here is saved'}
            </span>
            <button
              className="hb-press"
              onClick={leaveDemo}
              style={{
                background: 'none', color: '#F5F4EF',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px',
                padding: '3px 12px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              Exit
            </button>
          </div>
        )}
        <Routes>
          <Route index element={<CommonGround onImportContacts={openImportContacts} />} />
          <Route path="network"   element={<Network onAddContact={openAddContact} onImportContacts={openImportContacts} />} />
          <Route path="contact/:id" element={<ContactProfile />} />
          <Route path="digest"    element={<Digest />} />
          <Route path="settings"  element={<Settings />} />
          {/* Retired sections (overview/alerts/messages/analytics/prep) land on Common Ground */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      {isMobile && <BottomTabBar />}
      {showOnboarding && <Onboarding onFinish={finishOnboarding} />}
      <AddContactModal
        open={showAddContact}
        firstRun={addContactFirstRun}
        onClose={() => setShowAddContact(false)}
        onCreated={(contact) => setComposerContacts([contact])}
      />
      <ImportContactsModal
        open={showImportContacts}
        onClose={() => setShowImportContacts(false)}
        onImported={setComposerContacts}
      />
      <ThemeComposerModal
        key={composerContacts.length ? composerContacts[0].id : 'empty'}
        open={composerContacts.length > 0}
        contacts={composerContacts}
        onClose={() => setComposerContacts([])}
      />
    </motion.div>
  )
}
