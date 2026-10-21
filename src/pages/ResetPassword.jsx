import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnchorMark from '../components/AnchorMark';
import { supabase } from '../lib/supabase';
import Button from '../ui/Button';
import { Input, Label, ErrorText } from '../ui/Field';
import { T } from '../ui/tokens';

// Landing page for Supabase password-recovery links. The supabase-js client
// exchanges the token in the URL for a recovery session on load; this page
// then lets the user set a new password.
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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setHasSession(true);
      else setTimeout(() => { if (!cancelled) setHasSession(h => (h === null ? false : h)); }, 1500);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError("Those passwords don't match."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="hb-app" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 420, background: T.card, border: `1px solid ${T.hairline}`, borderRadius: 16, padding: '36px 28px' }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            <AnchorMark size={18} color={T.accent} />
            <span className="hb-display" style={{ fontSize: 22, fontWeight: 600, color: T.ink }}>Harbored</span>
          </div>
        </Link>

        <h1 className="hb-display" style={{ fontSize: 26, fontWeight: 500, color: T.ink, marginBottom: 8, textAlign: 'center' }}>Set a new password</h1>

        {hasSession === null && (
          <p style={{ fontSize: 14, color: T.muted, textAlign: 'center' }}>Checking your reset link…</p>
        )}

        {hasSession === false && (
          <>
            <p style={{ fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              This reset link is invalid or has expired.
            </p>
            <Button size="lg" full onClick={() => navigate('/login')}>Request a new link</Button>
          </>
        )}

        {hasSession === true && (
          <>
            <p style={{ fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 28 }}>
              Pick something you'll remember this time.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ background: T.ground }} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={{ background: T.ground }} />
              </div>
              <ErrorText style={{ marginBottom: 14, textAlign: 'center' }}>{error}</ErrorText>
              <Button type="submit" size="lg" full busy={loading}>{loading ? 'Saving…' : 'Save and sign in'}</Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
