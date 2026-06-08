import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, demoLogin } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) navigate('/feed');
    else setError('Invalid email or password. Try the demo account.');
  };

  const handleDemo = () => {
    demoLogin();
    navigate('/feed');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2040 0%, #1a3558 60%, #c9933a22 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Background lake decoration */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(180deg, transparent, rgba(15,32,64,0.6))',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '48px 40px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 22, fontWeight: 600,
            color: '#fdf6e3',
            letterSpacing: '0.06em',
            textAlign: 'center',
            marginBottom: 32,
          }}>⚓ Harbored</div>
        </Link>

        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 32, fontWeight: 500,
          color: '#fdf6e3',
          marginBottom: 8, textAlign: 'center',
        }}>Welcome back</h1>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14, color: 'rgba(253,246,227,0.5)',
          textAlign: 'center', marginBottom: 32, fontWeight: 300,
        }}>Your network missed you.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(253,246,227,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 15,
                color: '#fdf6e3', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(253,246,227,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 15,
                color: '#fdf6e3', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,147,58,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(220,50,50,0.15)',
              border: '1px solid rgba(220,50,50,0.3)',
              borderRadius: 6,
              fontFamily: 'Inter, sans-serif', fontSize: 13,
              color: '#f87171',
              marginBottom: 16,
            }}>{error}</div>
          )}

          <button type="submit" style={{
            width: '100%', padding: '13px',
            background: 'linear-gradient(135deg, #c9933a, #e8b86d)',
            color: '#0f2040',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700, fontSize: 14,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            border: 'none', borderRadius: 8,
            cursor: 'pointer', marginBottom: 12,
            transition: 'opacity 0.2s',
          }}>Sign In</button>
        </form>

        <div style={{ position: 'relative', textAlign: 'center', margin: '16px 0' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'transparent',
            padding: '0 12px',
            fontFamily: 'Inter, sans-serif', fontSize: 11,
            color: 'rgba(253,246,227,0.3)',
          }}>or</span>
        </div>

        <button onClick={handleDemo} style={{
          width: '100%', padding: '12px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500, fontSize: 14,
          color: 'rgba(253,246,227,0.7)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.target.style.borderColor = 'rgba(201,147,58,0.5)'; e.target.style.color = '#fdf6e3'; }}
          onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.18)'; e.target.style.color = 'rgba(253,246,227,0.7)'; }}
        >
          Continue as Demo User
        </button>

        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          color: 'rgba(253,246,227,0.4)',
          textAlign: 'center', marginTop: 24,
        }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#f5c878', textDecoration: 'none', fontWeight: 500 }}>
            Join Harbored
          </Link>
        </p>

        <div style={{ marginTop: 20, padding: '12px', background: 'rgba(201,147,58,0.08)', borderRadius: 6, border: '1px solid rgba(201,147,58,0.2)' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(253,246,227,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
            Demo: <strong style={{ color: 'rgba(245,200,100,0.7)' }}>maya@example.com</strong> / <strong style={{ color: 'rgba(245,200,100,0.7)' }}>password</strong>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
