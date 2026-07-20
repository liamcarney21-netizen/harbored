import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import NotFound from './pages/NotFound';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { useDemoStore } from './store/demoStore';
import { registerPushNotifications } from './services/push';
import { isNative } from './lib/platform';

// Root route. On the web this is the marketing/waitlist landing page. Inside the
// installed native app there is no marketing page at all — the root goes
// straight to the product: the dashboard if signed in, the login card if not.
// Rendering the redirect here (not inside Landing) means Landing never mounts in
// native, so there's no flash of marketing content on launch.
function RootRoute() {
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  if (!isNative()) return <Landing />;
  if (!initialized) return null; // brief; the native splash covers this
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  const init = useAuthStore(s => s.init);
  const lastUserId = useRef(undefined);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(state => {
      const uid = state.user?.id ?? null;
      if (uid === lastUserId.current) return;
      lastUserId.current = uid;
      if (uid) {
        useDataStore.getState().hydrate();
        // Register this device for push (native only; no-op on web).
        registerPushNotifications();
      }
      else if (useDemoStore.getState().active) useDataStore.getState().loadDemo();
      else useDataStore.getState().reset();
    });
    init();
    return unsubscribe;
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/dashboard/*" element={<AppLayout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
