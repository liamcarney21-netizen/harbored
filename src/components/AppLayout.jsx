import { useState } from 'react'
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Anchor } from 'lucide-react'
import AppSidebar from './AppSidebar'
import Onboarding from './Onboarding'
import AddContactModal from './AddContactModal'
import { useIsMobile } from '../hooks/useIsMobile'
import Dashboard from '../pages/app/Dashboard'
import Alerts from '../pages/app/Alerts'
import Network from '../pages/app/Network'
import CommonGround from '../pages/app/CommonGround'
import ContactProfile from '../pages/app/ContactProfile'
import PrepBrief from '../pages/app/PrepBrief'
import Digest from '../pages/app/Digest'
import Messages from '../pages/app/Messages'
import Analytics from '../pages/app/Analytics'
import Settings from '../pages/app/Settings'

export default function AppLayout() {
  const isLoggedIn = localStorage.getItem('harbored_loggedin') === 'true'
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('harbored_onboarded') !== 'true'
  )
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactFirstRun, setAddContactFirstRun] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  if (!isLoggedIn) return <Navigate to="/login" replace />

  function finishOnboarding(andAddContact = false) {
    localStorage.setItem('harbored_onboarded', 'true')
    setShowOnboarding(false)
    if (andAddContact) {
      setAddContactFirstRun(true)
      setShowAddContact(true)
    }
  }

  const openAddContact = () => {
    setAddContactFirstRun(false)
    setShowAddContact(true)
    setDrawerOpen(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        overflow: 'hidden',
        background: '#F6F4EF',
      }}
    >
      {/* Mobile top bar */}
      {isMobile && (
        <header style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
          padding: '12px 16px', background: '#FCFBF6', borderBottom: '1px solid #E6E2D8',
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1C2B33', padding: '4px', display: 'flex' }}
          >
            <Menu style={{ width: '20px', height: '20px' }} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Anchor style={{ width: '15px', height: '15px', color: '#A97E2F' }} />
            <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '18px', fontWeight: 600, color: '#1C2B33' }}>
              Harbored
            </span>
          </button>
        </header>
      )}

      {/* Sidebar: static column on desktop, slide-over drawer on mobile */}
      {!isMobile && <AppSidebar onAddContact={openAddContact} />}
      <AnimatePresence>
        {isMobile && drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(28,43,51,0.45)' }}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 41, boxShadow: '8px 0 32px rgba(0,0,0,0.18)' }}
            >
              <AppSidebar onAddContact={openAddContact} onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <Routes>
          <Route index element={<CommonGround />} />
          <Route path="overview"  element={<Dashboard onAddContact={openAddContact} />} />
          <Route path="alerts"    element={<Alerts />} />
          <Route path="network"   element={<Network onAddContact={openAddContact} />} />
          <Route path="contact/:id" element={<ContactProfile />} />
          <Route path="prep/:id" element={<PrepBrief />} />
          <Route path="digest"    element={<Digest />} />
          <Route path="common-ground" element={<Navigate to="/dashboard" replace />} />
          <Route path="messages"  element={<Messages />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings"  element={<Settings />} />
        </Routes>
      </main>
      {showOnboarding && <Onboarding onFinish={finishOnboarding} />}
      <AddContactModal
        open={showAddContact}
        firstRun={addContactFirstRun}
        onClose={() => setShowAddContact(false)}
      />
    </motion.div>
  )
}
