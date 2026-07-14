import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { useDemoStore } from './store/demoStore';

export default function App() {
  const init = useAuthStore(s => s.init);
  const lastUserId = useRef(undefined);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(state => {
      const uid = state.user?.id ?? null;
      if (uid === lastUserId.current) return;
      lastUserId.current = uid;
      if (uid) useDataStore.getState().hydrate();
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
        <Route path="/dashboard/*" element={<AppLayout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
