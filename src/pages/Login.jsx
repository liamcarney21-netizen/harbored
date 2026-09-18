import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnchorMark from '../components/AnchorMark';
import { useAuthStore } from '../store/authStore';
import { useDemoStore } from '../store/demoStore';
import { supabase } from '../lib/supabase';

const inputStyle = {
  width: '100%', padding: '12px 16px', boxSizing: 'border-box',
  background: '#0a1628',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  fontFamily: 'Inter, sans-serif', fontSize: 15,
  color: '#F5F4EF', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
  color: '#8C9AAD', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
};

function focusRing(e) {
  e.target.style.borderColor = '#D3A95C';
  e.target.style.boxShadow = '0 0 0 3px rgba(211,169,92,0.18)';
}
function blurRing(e) {
  e.target.style.borderColor = 'rgba(255,255,255,0.14)';
  e.target.style.boxShadow = 'none';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 'signin' → normal login; 'forgot' → ask for email; 'sent' → reset email sent
  const [mode, setMode] = useState('signin');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useAuthStore(s => s.signIn);
  const enterDemo = useDemoStore(s => s.enter);
  // Set when someone lands here right after deleting their account — the
  // quiet goodbye that makes the sign-out feel finished, not broken.
  const farewell = searchParams.get('farewell') === '1';

  // App Store reviewer access (and curious humans): a full sample network,
  // no account needed. Same demo the landing page offers.
  const startDemo = () => { enterDemo(); navigate('/dashboard'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    navigate('/dashboard');
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMode('sent');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1628',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
      {farewell && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            textAlign: 'center', fontSize: 13, color: '#8C9AAD', lineHeight: 1.6,
            margin: '0 0 18px', fontFamily: 'Inter, sans-serif',
          }}
        >
          Your account and everything in it are deleted. Thanks for giving Harbored a look — fair winds.
        </motion.p>
      )}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%',
          background: '#0f2040',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          padding: '48px 40px',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 32,
          }}>
            <AnchorMark size={18} color="#D3A95C" />
            <span style={{
              fontFamily: '"Lora", Georgia, serif', fontSize: 22, fontWeight: 600,
              color: '#F5F4EF',
            }}>Harbored</span>
          </div>
        </Link>

        <h1 style={{
          fontFamily: '"Lora", Georgia, serif', fontSize: 26, fontWeight: 600,
          color: '#F5F4EF', marginBottom: 8, textAlign: 'center',
        }}>{mode === 'signin' ? 'Welcome back' : 'Reset your password'}</h1>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#8C9AAD',
          textAlign: 'center', marginBottom: 32,
        }}>
          {mode === 'signin' && 'Your network missed you.'}
          {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
          {mode === 'sent' && `Check ${email || 'your inbox'} for a link to set a new password.`}
        </p>

        {mode === 'sent' && (
          <button
            onClick={() => setMode('signin')}
            style={{
              width: '100%', padding: '13px', background: 'none',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24,
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14,
              color: '#8C9AAD', cursor: 'pointer',
            }}
          >Back to sign in</button>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div style={{ marginBottom: 28 }}>
              <label htmlFor="forgot-email" style={labelStyle}>Email</label>
              <input
                id="forgot-email"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={focusRing} onBlur={blurRing}
              />
            </div>
            {error && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#E8867A', marginBottom: 16, textAlign: 'center' }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', background: '#D3A95C', color: '#0a1628',
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 15,
              border: 'none', borderRadius: 24,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>{loading ? 'Sending…' : 'Send reset link'}</button>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8C9AAD', textAlign: 'center', marginTop: 24 }}>
              Remembered it?{' '}
              <button type="button" onClick={() => { setMode('signin'); setError(''); }}
                style={{ background: 'none', border: 'none', padding: 0, color: '#D3A95C', fontWeight: 600, fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                Back to sign in
              </button>
            </p>
          </form>
        )}

        {mode === 'signin' && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="login-email" style={labelStyle}>Email</label>
            <input
              id="login-email"
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={focusRing} onBlur={blurRing}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label htmlFor="login-password" style={labelStyle}>Password</label>
            <input
              id="login-password"
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={focusRing} onBlur={blurRing}
            />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
                style={{ background: 'none', border: 'none', padding: 0, color: '#D3A95C', fontWeight: 600, fontSize: 12.5, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#E8867A', marginBottom: 16, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px',
            background: '#D3A95C',
            color: '#0a1628',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600, fontSize: 15,
            border: 'none', borderRadius: 24,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#C29245'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#D3A95C'; }}
          >{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        )}

        {mode === 'signin' && (
        <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8C9AAD', opacity: 0.7 }}>or</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <button
          type="button"
          onClick={startDemo}
          style={{
            width: '100%', padding: '13px', background: 'none',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24,
            fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14,
            color: '#C2CBD8', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#D3A95C'; e.currentTarget.style.color = '#D3A95C'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#C2CBD8'; }}
        >
          Try a live demo — no account needed
        </button>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          color: '#8C9AAD',
          textAlign: 'center', marginTop: 24,
        }}>
          New to Harbored?{' '}
          <Link to="/signup" style={{ color: '#D3A95C', textDecoration: 'none', fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
        </>
        )}
      </motion.div>
      </div>
    </div>
  );
}
