import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnchorMark from '../components/AnchorMark';
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

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const signUp = useAuthStore(s => s.signUp);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleContinue = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Fill in all fields to continue.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: signUpError } = await signUp(form.email, form.password, form.name);
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
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
        transition={{ duration: 0.5 }}
        style={{
          width: '100%', maxWidth: 460,
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

        <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 24, fontWeight: 600, color: '#1C2B33', marginBottom: 6, textAlign: 'center' }}>
          Create your account
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#5C6B73', textAlign: 'center', marginBottom: 32 }}>
          Your network, kept close.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="su-name" style={labelStyle}>Full Name</label>
            <input id="su-name" style={inputStyle} placeholder="Maya Chen" value={form.name} onChange={e => update('name', e.target.value)}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
          <div>
            <label htmlFor="su-email" style={labelStyle}>Email</label>
            <input id="su-email" type="email" style={inputStyle} placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
          <div>
            <label htmlFor="su-password" style={labelStyle}>Password</label>
            <input id="su-password" type="password" style={inputStyle} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
        </div>

        {error && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#B4423A', marginTop: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button onClick={handleContinue} disabled={loading} style={{
          width: '100%', padding: '13px', marginTop: 28,
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
        >
          {loading ? 'Joining…' : 'Join Harbored'}
        </button>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#5C6B73', textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#0D5C63', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
