import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const signIn = useAuthStore(s => s.signIn);

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
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 32,
          }}>
            <Anchor style={{ width: 18, height: 18, color: '#A97E2F' }} />
            <span style={{
              fontFamily: '"Fraunces", Georgia, serif', fontSize: 22, fontWeight: 600,
              color: '#1C2B33',
            }}>Harbored</span>
          </div>
        </Link>

        <h1 style={{
          fontFamily: '"Fraunces", Georgia, serif', fontSize: 26, fontWeight: 600,
          color: '#1C2B33', marginBottom: 8, textAlign: 'center',
        }}>Welcome back</h1>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#5C6B73',
          textAlign: 'center', marginBottom: 32,
        }}>Your network missed you.</p>

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
          </div>

          {error && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#B4423A', marginBottom: 16, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px',
            background: '#0D5C63',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600, fontSize: 15,
            border: 'none', borderRadius: 24,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#09454B'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0D5C63'; }}
          >{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>

        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          color: '#5C6B73',
          textAlign: 'center', marginTop: 24,
        }}>
          New to Harbored?{' '}
          <Link to="/signup" style={{ color: '#0D5C63', textDecoration: 'none', fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
