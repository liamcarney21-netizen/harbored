import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { useDemoStore } from './store/demoStore';
import { registerPushNotifications } from './services/push';
import { isNative } from './lib/platform';
import { hideSplash } from './lib/splash';

// The marketing and legal pages are web-only and never show inside the app,
// so they load on demand instead of riding in every cold start.
const Landing = lazy(() => import('./pages/Landing'));
const Signup = lazy(() => import('./pages/Signup'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Support = lazy(() => import('./pages/Support'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Root route. On the web this is the marketing page. Inside the installed app
// there is no marketing page: the root goes straight to the product.
function RootRoute() {
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  if (!isNative()) return <Landing />;
  if (!initialized) return null; // the native splash stays up until the first real screen
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

// Shareable one-tap demo. A signed-in user just gets their own app.
function DemoRoute() {
  const enter = useDemoStore(s => s.enter);
  useEffect(() => { enter(); }, [enter]);
  return <Navigate to="/dashboard" replace />;
}

// A password-recovery link signs the browser in with a recovery session and
// fires PASSWORD_RECOVERY; send that straight to the new-password form.
function RecoveryRedirect() {
  const recovering = useAuthStore(s => s.recovering);
  const navigate = useNavigate();
  useEffect(() => {
    if (recovering) navigate('/reset-password', { replace: true });
  }, [recovering, navigate]);
  return null;
}

function PageFallback() {
  return <div style={{ minHeight: '100vh', background: '#0a1628' }} />;
}

export default function App() {
  const init = useAuthStore(s => s.init);
  const lastUserId = useRef(undefined);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(state => {
      if (!state.initialized) return;
      const uid = state.user?.id ?? null;
      if (uid === lastUserId.current) return;
      lastUserId.current = uid;
      if (uid) {
        // A real sign-in always wins over a lingering demo flag.
        if (useDemoStore.getState().active) useDemoStore.getState().clear();
        useDataStore.getState().hydrate();
        // Silent re-registration when permission was already granted; the
        // prompt itself is shown after the first import.
        registerPushNotifications();
      } else if (useDemoStore.getState().active) {
        useDataStore.getState().loadDemo();
      } else {
        useDataStore.getState().reset();
      }
    });
    init();
    return unsubscribe;
  }, [init]);

  // Whatever renders first on native (login or the app) hides the splash.
  useEffect(() => { if (!isNative()) hideSplash(); }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RecoveryRedirect />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/demo" element={<DemoRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/support" element={<Support />} />
            <Route path="/dashboard/*" element={<AppLayout />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
