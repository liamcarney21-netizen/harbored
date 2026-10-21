import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnchorMark from '../components/AnchorMark';
import { useAuthStore } from '../store/authStore';
import Button from '../ui/Button';
import { Input, Label, ErrorText } from '../ui/Field';
import { T } from '../ui/tokens';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  const signUp = useAuthStore(s => s.signUp);

  if (initialized && user) return <Navigate to="/dashboard" replace />;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) { setError('Fill in all three to continue.'); return; }
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setError('');
    setLoading(true);
    const result = await signUp(form.email.trim(), form.password, form.name.trim());
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.needsConfirmation) { setConfirmSent(true); return; }
    navigate('/dashboard');
  };

  return (
    <div className="hb-app" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(env(safe-area-inset-top) + 24px) 16px calc(env(safe-area-inset-bottom) + 24px)' }}>
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

        {confirmSent ? (
          <>
            <h1 className="hb-display" style={{ fontSize: 24, fontWeight: 500, color: T.ink, marginBottom: 8, textAlign: 'center' }}>Check your email</h1>
            <p style={{ fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
              We sent a confirmation link to {form.email.trim()}. Tap it, then sign in.
            </p>
            <Button variant="secondary" size="lg" full onClick={() => navigate('/login')}>Go to sign in</Button>
          </>
        ) : (
          <>
            <h1 className="hb-display" style={{ fontSize: 24, fontWeight: 500, color: T.ink, marginBottom: 6, textAlign: 'center' }}>Create your account</h1>
            <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', marginBottom: 28 }}>Your network, kept close.</p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Label htmlFor="su-name">Your name</Label>
                  <Input id="su-name" autoComplete="name" placeholder="Maya Chen" value={form.name} onChange={e => update('name', e.target.value)} style={{ background: T.ground }} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} style={{ background: T.ground }} />
                </div>
                <div>
                  <Label htmlFor="su-password" hint="(8+ characters)">Password</Label>
                  <Input id="su-password" type="password" autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} style={{ background: T.ground }} />
                </div>
              </div>
              <ErrorText style={{ marginTop: 14, textAlign: 'center' }}>{error}</ErrorText>
              <Button type="submit" size="lg" full busy={loading} style={{ marginTop: 22 }}>{loading ? 'Joining…' : 'Join Harbored'}</Button>
            </form>

            <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', marginTop: 20 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
