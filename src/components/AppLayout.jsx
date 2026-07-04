import { useState } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppSidebar from './AppSidebar'
import Onboarding from './Onboarding'
import AddContactModal from './AddContactModal'
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
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('harbored_onboarded') !== 'true'
  )
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactFirstRun, setAddContactFirstRun] = useState(false)
  if (!isLoggedIn) return <Navigate to="/login" replace />

  function finishOnboarding(andAddContact = false) {
    localStorage.setItem('harbored_onboarded', 'true')
    setShowOnboarding(false)
    if (andAddContact) {
      setAddContactFirstRun(true)
      setShowAddContact(true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#F6F4EF',
      }}
    >
      <AppSidebar onAddContact={() => { setAddContactFirstRun(false); setShowAddContact(true) }} />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <Routes>
          <Route index element={<CommonGround />} />
          <Route path="overview"  element={<Dashboard onAddContact={() => setShowAddContact(true)} />} />
          <Route path="alerts"    element={<Alerts />} />
          <Route path="network"   element={<Network onAddContact={() => setShowAddContact(true)} />} />
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
