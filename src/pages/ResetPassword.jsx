import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnchorMark from '../components/AnchorMark';
import { supabase } from '../lib/supabase';

// Landing page for Supabase password-recovery links. The supabase-js client
// (detectSessionInUrl) exchanges the token in the URL hash for a session on
// load; this page then lets the user set a new password via updateUser.

const inputStyle = {
  width: '100%', padding: '12px 16px', boxSizing: 'border-box',
  background: '#FFFFFF',
  border: '1px solid #CCC6B9',
  borderRadius: 8,
  fontFamily: 'Inter, sans-serif', fontSize: 15,
  color: '#1C2B33', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
  color: '#3E4B52', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
};

function focusRing(e) {
  e.target.style.borderColor = '#0D5C63';
  e.target.style.boxShadow = '0 0 0 3px rgba(13,92,99,0.15)';
}
function blurRing(e) {
  e.target.style.borderColor = '#CCC6B9';
  e.target.style.boxShadow = 'none';
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // null = still resolving the recovery session; false = link invalid/expired
  const [hasSession, setHasSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    // Give detectSessionInUrl a moment to exchange the recovery token, then
    // check. onAuthStateChange also covers the slower path.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setHasSession(true);
      else setTimeout(() => { if (!cancelled) setHasSession(h => (h === null ? false : h)); }, 2500);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError("Those passwords don't match."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F6F4EF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 420,
          background: '#FFFFFF',
          border: '1px solid #E6E2D8',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          padding: '48px 40px',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            <AnchorMark size={18} color="#A97E2F" />
            <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1C2B33' }}>
              Harbored
            </span>
          </div>
        </Link>

        <h1 style={{
          fontFamily: '"Fraunces", Georgia, serif', fontSize: 26, fontWeight: 600,
          color: '#1C2B33', marginBottom: 8, textAlign: 'center',
        }}>Set a new password</h1>

        {hasSession === null && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#5C6B73', textAlign: 'center' }}>
            Checking your reset link…
          </p>
        )}

        {hasSession === false && (
          <>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#5C6B73', textAlign: 'center', marginBottom: 24 }}>
              This reset link is invalid or has expired.
            </p>
            <Link to="/login" style={{
              display: 'block', padding: '13px', textAlign: 'center',
              background: '#0D5C63', color: '#FFFFFF', textDecoration: 'none',
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 15, borderRadius: 24,
            }}>Request a new link</Link>
          </>
        )}

        {hasSession === true && (
          <>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#5C6B73', textAlign: 'center', marginBottom: 32 }}>
              Pick something you'll remember this time. ⚓
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="new-password" style={labelStyle}>New password</label>
                <input
                  id="new-password"
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={focusRing} onBlur={blurRing}
                />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label htmlFor="confirm-password" style={labelStyle}>Confirm password</label>
                <input
                  id="confirm-password"
                  type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={focusRing} onBlur={blurRing}
                />
              </div>
              {error && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#B4423A', marginBottom: 16, textAlign: 'center' }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px',
                background: '#0D5C63', color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 15,
                border: 'none', borderRadius: 24,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>{loading ? 'Saving…' : 'Save & sign in'}</button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
