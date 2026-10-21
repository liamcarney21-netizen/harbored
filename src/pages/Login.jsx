import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnchorMark from '../components/AnchorMark';
import { useAuthStore } from '../store/authStore';
import { useDemoStore } from '../store/demoStore';
import { supabase } from '../lib/supabase';
import { isNative } from '../lib/platform';
import { hideSplash } from '../lib/splash';
import Button from '../ui/Button';
import { Input, Label, ErrorText } from '../ui/Field';
import { T } from '../ui/tokens';

// Password-reset links must land on the website: inside the app the origin is
// capacitor://localhost, which Supabase rejects and Safari can't open.
const RESET_REDIRECT = isNative()
  ? 'https://harbored-three.vercel.app/reset-password'
  : `${window.location.origin}/reset-password`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 'signin' → normal login; 'forgot' → ask for email; 'sent' → reset email sent
  const [mode, setMode] = useState('signin');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  const signIn = useAuthStore(s => s.signIn);
  const enterDemo = useDemoStore(s => s.enter);
  const farewell = searchParams.get('farewell') === '1';

  useEffect(() => { hideSplash(); }, []);

  // Already signed in: there is nothing to do here.
  if (initialized && user && !farewell) return <Navigate to="/dashboard" replace />;

  // App Store reviewer access (and curious humans): a full sample network, no
  // account needed. A signed-in user just gets their own app.
  const startDemo = () => { enterDemo(); navigate('/dashboard'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) { setError(signInError); return; }
    navigate('/dashboard');
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT });
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setMode('sent');
  };

  return (
    <div className="hb-app" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(env(safe-area-inset-top) + 24px) 16px calc(env(safe-area-inset-bottom) + 24px)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {farewell && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ textAlign: 'center', fontSize: 13, color: T.muted, lineHeight: 1.6, margin: '0 0 18px' }}
          >
            Your account and everything in it are deleted. Thanks for giving Harbored a look — fair winds.
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ background: T.card, border: `1px solid ${T.hairline}`, borderRadius: 16, padding: '36px 28px' }}
        >
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
              <AnchorMark size={18} color={T.accent} />
              <span className="hb-display" style={{ fontSize: 22, fontWeight: 600, color: T.ink }}>Harbored</span>
            </div>
          </Link>

          <h1 className="hb-display" style={{ fontSize: 26, fontWeight: 500, color: T.ink, marginBottom: 8, textAlign: 'center' }}>
            {mode === 'signin' ? 'Welcome back' : 'Reset your password'}
          </h1>
          <p style={{ fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
            {mode === 'signin' && 'Your network missed you.'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
            {mode === 'sent' && `Check ${email || 'your inbox'} for a link to set a new password.`}
          </p>

          {mode === 'sent' && (
            <Button variant="secondary" size="lg" full onClick={() => setMode('signin')}>Back to sign in</Button>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              <div style={{ marginBottom: 22 }}>
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ background: T.ground }} />
              </div>
              <ErrorText style={{ marginBottom: 14, textAlign: 'center' }}>{error}</ErrorText>
              <Button type="submit" size="lg" full busy={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
              <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', marginTop: 20 }}>
                Remembered it?{' '}
                <button type="button" onClick={() => { setMode('signin'); setError(''); }} style={{ background: 'none', border: 'none', padding: '6px 2px', color: T.accent, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                  Back to sign in
                </button>
              </p>
            </form>
          )}

          {mode === 'signin' && (
            <>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ background: T.ground }} />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ background: T.ground }} />
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); }} style={{ background: 'none', border: 'none', padding: '8px 0 0 8px', color: T.accent, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                      Forgot password?
                    </button>
                  </div>
                </div>
                <ErrorText style={{ marginBottom: 14, textAlign: 'center' }}>{error}</ErrorText>
                <Button type="submit" size="lg" full busy={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
                <span style={{ flex: 1, height: 1, background: T.hairline }} />
                <span style={{ fontSize: 12, color: T.muted }}>or</span>
                <span style={{ flex: 1, height: 1, background: T.hairline }} />
              </div>
              <Button variant="secondary" size="lg" full onClick={startDemo}>Try a live demo — no account needed</Button>
              <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', marginTop: 22 }}>
                New to Harbored?{' '}
                <Link to="/signup" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
