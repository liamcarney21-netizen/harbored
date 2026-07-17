import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { useDemoStore } from './store/demoStore';
import { registerPushNotifications } from './services/push';

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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dashboard/*" element={<AppLayout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
